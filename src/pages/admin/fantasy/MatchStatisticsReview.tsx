/**
 * MatchStatisticsReview
 *
 * Fantasy Admin — Match Statistics management flow.
 *
 * Primary surface: review statistics that Club Admin has uploaded, inspect
 * per-player fantasy points, optionally correct a statistic, then approve.
 *
 * Secondary surface: the existing "Create Statistic" test-data-entry tool
 * is kept intact in FantasyAdminPage under a collapsible section.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminRecalculateGameweek,
  approveStatisticReview,
  correctMatchStatistic,
  fetchStatisticReviewDetail,
  fetchStatisticReviewList,
  type ScoringBreakdownItem,
  type StatisticReviewDetail,
  type StatisticReviewRow,
} from '../../../services/fantasyAdminService';
import type { FantasyCompetition, FantasyGameweek } from '../../../services/fantasyService';
import { extractApiError } from '../../../services/apiUtils';

/* ── helpers ────────────────────────────────────────────── */

const errMsg = (e: unknown): string => {
  const details = extractApiError(e);
  const isAxios = e != null && typeof e === 'object' && 'response' in e;
  if (!isAxios && e instanceof Error) return e.message;
  const fieldErrors = Object.entries(details.fields)
    .filter(([k]) => !['non_field_errors', 'detail', 'message'].includes(k))
    .map(([k, msgs]) => `${k}: ${msgs.join(', ')}`)
    .join(' | ');
  return fieldErrors ? `${details.message} — ${fieldErrors}` : details.message;
};

const fmtPoints = (v: string | null): string =>
  v !== null ? (parseFloat(v) >= 0 ? `+${v}` : v) : '—';

const STAT_LABELS: Record<string, string> = {
  GOALS: 'Goals',
  ASSISTS: 'Assists',
  MINUTES_PLAYED: 'Minutes Played',
  CLEAN_SHEETS: 'Clean Sheets',
  SAVES: 'Saves',
  PENALTIES_SAVED: 'Penalties Saved',
  YELLOW_CARDS: 'Yellow Cards',
  RED_CARDS: 'Red Cards',
  OWN_GOALS: 'Own Goals',
  PENALTIES_MISSED: 'Penalties Missed',
  GOALS_CONCEDED: 'Goals Conceded',
  TRIES: 'Tries',
  TRY_ASSISTS: 'Try Assists',
  CONVERSIONS: 'Conversions',
  PENALTY_GOALS: 'Penalty Goals',
  DROP_GOALS: 'Drop Goals',
  TACKLES: 'Tackles',
  TURNOVERS_WON: 'Turnovers Won',
  POINTS: 'Points',
  REBOUNDS: 'Rebounds',
  STEALS: 'Steals',
  BLOCKS: 'Blocks',
  TURNOVERS: 'Turnovers',
  THREE_POINTERS_MADE: '3-Pointers Made',
  FREE_THROWS_MADE: 'Free Throws Made',
};

const statLabel = (code: string) => STAT_LABELS[code.toUpperCase()] ?? code;

/* ── types ──────────────────────────────────────────────── */

interface Props {
  competitions: FantasyCompetition[];
  allGameweeks: FantasyGameweek[];
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */

export default function MatchStatisticsReview({ competitions, allGameweeks }: Props) {
  /* ── filter state ── */
  const [compId, setCompId] = useState('');
  const [gwFilter, setGwFilter] = useState('');
  const [fixtureFilter, setFixtureFilter] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'PENDING' | 'APPROVED'>('');

  /* ── data state ── */
  const [rows, setRows] = useState<StatisticReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /* ── detail drawer ── */
  const [selectedRow, setSelectedRow] = useState<StatisticReviewRow | null>(null);
  const [detail, setDetail] = useState<StatisticReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  /* ── correct form ── */
  const [correctMode, setCorrectMode] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, string>>({}); // stat_id → new value
  const [correctReason, setCorrectReason] = useState('');
  const [correctSaving, setCorrectSaving] = useState(false);
  const [correctResult, setCorrectResult] = useState<string | null>(null);

  /* ── approve ── */
  const [approveSaving, setApproveSaving] = useState(false);

  /* ── recalculate ── */
  const [recalcGwId, setRecalcGwId] = useState('');
  const [recalcSaving, setRecalcSaving] = useState(false);

  /* ── derived ── */
  const gwsForComp = useMemo(
    () => allGameweeks.filter(gw => gw.fantasy_competition === compId),
    [allGameweeks, compId],
  );

  // Unique fixture names from current rows for fixture dropdown
  const fixtureOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach(r => seen.set(r.fixture_id, r.fixture_name));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  /* ── fetch list ── */
  const loadReviews = useCallback(async (cId: string, force = false) => {
    if (!cId) { setRows([]); setSelectedRow(null); setDetail(null); return; }
    setSelectedRow(null);
    setDetail(null);
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { competition: cId };
      if (gwFilter) params.gameweek = gwFilter;
      if (fixtureFilter) params.fixture = fixtureFilter;
      if (statusFilter) params.review_status = statusFilter;
      const data = await fetchStatisticReviewList(params as Parameters<typeof fetchStatisticReviewList>[0]);
      // Client-side player search filter
      const filtered = playerSearch.trim()
        ? data.filter(r =>
            r.participant_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
            (r.club ?? '').toLowerCase().includes(playerSearch.toLowerCase()),
          )
        : data;
      setRows(filtered);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
    void force; // suppress lint warning
  }, [gwFilter, fixtureFilter, playerSearch, statusFilter]);

  /* Reload when competition or server-side filters change.
     All state updates happen inside the async .then/.catch/.finally callbacks
     so no setState is called synchronously in the effect body. */
  useEffect(() => {
    let cancelled = false;
    if (!compId) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setRows([]);
        setSelectedRow(null);
        setDetail(null);
      });
      return () => { cancelled = true; };
    }
    const params: Record<string, string> = { competition: compId };
    if (gwFilter) params.gameweek = gwFilter;
    if (fixtureFilter) params.fixture = fixtureFilter;
    if (statusFilter) params.review_status = statusFilter;
    fetchStatisticReviewList(params as Parameters<typeof fetchStatisticReviewList>[0])
      .then(data => {
        if (cancelled) return;
        setSelectedRow(null);
        setDetail(null);
        const filtered = playerSearch.trim()
          ? data.filter(r =>
              r.participant_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
              (r.club ?? '').toLowerCase().includes(playerSearch.toLowerCase()),
            )
          : data;
        setRows(filtered);
        setLoading(false);
        setError('');
      })
      .catch(e => {
        if (cancelled) return;
        setError(errMsg(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [compId, gwFilter, fixtureFilter, statusFilter, playerSearch]);

  /* ── open detail ── */
  const openDetail = async (row: StatisticReviewRow) => {
    setSelectedRow(row);
    setDetail(null);
    setDetailError('');
    setCorrectMode(false);
    setCorrections({});
    setCorrectReason('');
    setCorrectResult(null);
    setDetailLoading(true);
    try {
      const d = await fetchStatisticReviewDetail(row.fixture_id, row.participant_id, compId);
      setDetail(d);
    } catch (e) {
      setDetailError(errMsg(e));
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── save corrections ── */
  const saveCorrections = async () => {
    if (!detail) return;
    const entries = Object.entries(corrections).filter(([, v]) => v.trim() !== '');
    if (!entries.length) { setCorrectMode(false); return; }
    setCorrectSaving(true);
    setDetailError('');
    try {
      const results: string[] = [];
      for (const [statId, newVal] of entries) {
        const r = await correctMatchStatistic({
          stat_id: statId,
          value: newVal,
          reason: correctReason.trim() || 'Admin correction',
        });
        results.push(`${statLabel(r.stat_type)}: ${r.old_value} → ${r.new_value}`);
      }
      setCorrectResult(`Corrected: ${results.join(', ')}. Fantasy points recalculated.`);
      setNotice(`Correction saved. ${results.join(', ')}.`);
      // Reload detail to show updated values
      const d = await fetchStatisticReviewDetail(
        detail.fixture_id,
        detail.participant_id,
        compId,
      );
      setDetail(d);
      // Update row in list
      setRows(prev =>
        prev.map(r =>
          r.participant_id === detail.participant_id && r.fixture_id === detail.fixture_id
            ? { ...r, fantasy_points: d.fantasy_points, breakdown: d.breakdown }
            : r,
        ),
      );
      setCorrectMode(false);
      setCorrections({});
      setCorrectReason('');
    } catch (e) {
      setDetailError(errMsg(e));
    } finally {
      setCorrectSaving(false);
    }
  };

  /* ── approve ── */
  const handleApprove = async () => {
    if (!detail || !compId) return;
    setApproveSaving(true);
    setDetailError('');
    try {
      const result = await approveStatisticReview({
        competition: compId,
        fixture: detail.fixture_id,
        participant: detail.participant_id,
      });
      setDetail(prev => prev ? { ...prev, review_status: 'APPROVED', approved_at: result.approved_at } : prev);
      setSelectedRow(prev => prev ? { ...prev, review_status: 'APPROVED' } : prev);
      setRows(prev =>
        prev.map(r =>
          r.participant_id === detail.participant_id && r.fixture_id === detail.fixture_id
            ? { ...r, review_status: 'APPROVED' }
            : r,
        ),
      );
      setNotice(`✓ ${detail.participant_name} approved for ${detail.fixture_name}.`);
    } catch (e) {
      setDetailError(errMsg(e));
    } finally {
      setApproveSaving(false);
    }
  };

  /* ── recalculate ── */
  const handleRecalculate = async () => {
    if (!recalcGwId) return;
    setRecalcSaving(true);
    setError('');
    try {
      const result = await adminRecalculateGameweek(recalcGwId);
      setNotice(`✓ ${result.detail}`);
      // Reload list to show updated points
      await loadReviews(compId, true);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRecalcSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */

  return (
    <section className="fa-panel msr-root">
      {/* ── Page header ── */}
      <div className="msr-page-header">
        <div>
          <h2>Match Statistics Review</h2>
          <p className="msr-subtitle">
            Review statistics uploaded by Club Admin, inspect fantasy scoring, correct
            errors, and approve before finalising the gameweek.
          </p>
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div className="fa-error-banner" role="alert">
          <span>{error}</span>
          <button className="fa-btn fa-btn--sm" onClick={() => setError('')} aria-label="Dismiss">✕</button>
        </div>
      )}
      {notice && (
        <div className="fa-success-banner" role="status">
          <span>{notice}</span>
          <button className="fa-btn fa-btn--sm" onClick={() => setNotice('')} aria-label="Dismiss" style={{ marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="msr-filters">
        {/* Competition (required) */}
        <label className="fa-field">
          <span>Competition</span>
          <select
            value={compId}
            onChange={e => {
              setCompId(e.target.value);
              setGwFilter('');
              setFixtureFilter('');
              setStatusFilter('');
              setPlayerSearch('');
            }}
          >
            <option value="">— Select competition —</option>
            {competitions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {/* Gameweek */}
        <label className="fa-field">
          <span>Gameweek</span>
          <select
            value={gwFilter}
            onChange={e => setGwFilter(e.target.value)}
            disabled={!compId}
          >
            <option value="">All gameweeks</option>
            {gwsForComp.map(gw => (
              <option key={gw.id} value={gw.id}>{gw.name} · {gw.status}</option>
            ))}
          </select>
        </label>

        {/* Fixture */}
        <label className="fa-field">
          <span>Fixture</span>
          <select
            value={fixtureFilter}
            onChange={e => setFixtureFilter(e.target.value)}
            disabled={!compId}
          >
            <option value="">All fixtures</option>
            {fixtureOptions.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        {/* Player search */}
        <label className="fa-field">
          <span>Player</span>
          <input
            type="text"
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Search name or club…"
            disabled={!compId}
          />
        </label>

        {/* Status */}
        <label className="fa-field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as '' | 'PENDING' | 'APPROVED')}
            disabled={!compId}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
          </select>
        </label>

        <button
          className="fa-btn fa-btn--sm"
          disabled={!compId || loading}
          onClick={() => void loadReviews(compId, true)}
          style={{ alignSelf: 'flex-end' }}
          aria-label="Refresh list"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </div>

      {/* ── Recalculate tool ── */}
      {compId && (
        <div className="msr-recalc-bar">
          <span className="msr-recalc-label">
            Recalculate gameweek points after corrections:
          </span>
          <select
            value={recalcGwId}
            onChange={e => setRecalcGwId(e.target.value)}
            className="msr-recalc-select"
          >
            <option value="">— Select gameweek —</option>
            {gwsForComp.map(gw => (
              <option key={gw.id} value={gw.id}>{gw.name} · {gw.status}</option>
            ))}
          </select>
          <button
            className="fa-btn fa-btn--sm"
            disabled={recalcSaving || !recalcGwId}
            onClick={() => void handleRecalculate()}
          >
            {recalcSaving ? 'Recalculating…' : 'Recalculate'}
          </button>
        </div>
      )}

      {/* ── Stats table ── */}
      {!compId ? (
        <div className="fa-empty">Select a Fantasy Competition to view match statistics.</div>
      ) : loading ? (
        <div className="fa-empty">Loading statistics…</div>
      ) : (
        <div className="fa-table-wrap">
          <table className="fa-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Club</th>
                <th>Fixture</th>
                <th>Gameweek</th>
                <th style={{ textAlign: 'right' }}>Fantasy Pts</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="fa-table__empty">
                  <td colSpan={7}>
                    {playerSearch
                      ? 'No statistics match this player search.'
                      : 'No statistics found. Statistics are created when Club Admin uploads match data.'}
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <tr
                  key={`${row.participant_id}-${row.fixture_id}`}
                  className={selectedRow?.participant_id === row.participant_id && selectedRow?.fixture_id === row.fixture_id ? 'msr-row--selected' : ''}
                >
                  <td>
                    <strong>{row.participant_name}</strong>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {row.club ?? '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <span style={{ display: 'block' }}>{row.fixture_name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {row.fixture_status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {row.gameweek?.name ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: row.fantasy_points ? '#c4b5fd' : 'var(--color-text-muted)' }}>
                      {row.fantasy_points !== null ? `${row.fantasy_points} pts` : '—'}
                    </strong>
                  </td>
                  <td>
                    <span className={`fa-status-pill fa-status-pill--${row.review_status === 'APPROVED' ? 'finalized' : 'locked'}`}>
                      {row.review_status === 'APPROVED' ? 'Approved' : 'Pending Review'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="fa-btn fa-btn--sm"
                      onClick={() => void openDetail(row)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          DETAIL DRAWER
      ══════════════════════════════════════════════ */}
      {selectedRow && (
        <div className="msr-drawer-overlay" onClick={() => setSelectedRow(null)}>
          <aside
            className="msr-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label={`Statistics detail: ${selectedRow.participant_name}`}
          >
            {/* Drawer header */}
            <div className="msr-drawer-header">
              <div>
                <h3 className="msr-drawer-title">{selectedRow.participant_name}</h3>
                <p className="msr-drawer-sub">
                  {selectedRow.club && <span>{selectedRow.club} · </span>}
                  <span className={`fa-status-pill fa-status-pill--${selectedRow.review_status === 'APPROVED' ? 'finalized' : 'locked'}`} style={{ fontSize: '0.6rem' }}>
                    {selectedRow.review_status === 'APPROVED' ? 'Approved' : 'Pending Review'}
                  </span>
                </p>
              </div>
              <button
                className="fa-btn fa-btn--sm fa-btn--ghost"
                onClick={() => setSelectedRow(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {detailError && (
              <div className="fa-error-banner" role="alert" style={{ margin: '0 0 8px' }}>
                <span>{detailError}</span>
              </div>
            )}

            {detailLoading ? (
              <div className="fa-empty" style={{ padding: '32px 0' }}>Loading…</div>
            ) : detail ? (
              <>
                {/* ── Info grid ── */}
                <div className="msr-info-grid">
                  <div className="msr-info-item">
                    <span>Fixture</span>
                    <strong>{detail.fixture_name}</strong>
                  </div>
                  <div className="msr-info-item">
                    <span>Competition</span>
                    <strong>{detail.competition?.name ?? '—'}</strong>
                  </div>
                  <div className="msr-info-item">
                    <span>Gameweek</span>
                    <strong>
                      {detail.gameweek
                        ? `${detail.gameweek.name} · `
                        : 'Not in a gameweek'}
                      {detail.gameweek && (
                        <span className={`fa-status-pill fa-status-pill--${detail.gameweek.status.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>
                          {detail.gameweek.status}
                        </span>
                      )}
                    </strong>
                  </div>
                  <div className="msr-info-item">
                    <span>Fixture Status</span>
                    <strong>{detail.fixture_status}</strong>
                  </div>
                </div>

                {/* ── Match performance ── */}
                <div className="msr-section">
                  <div className="msr-section-header">
                    <span className="msr-section-title">Match Performance</span>
                  </div>

                  {correctMode ? (
                    /* Edit mode */
                    <div className="msr-correct-form">
                      {detail.stats.length === 0 && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          No statistics on record for this player.
                        </p>
                      )}
                      {detail.stats.map(stat => (
                        <label key={stat.id} className="fa-field">
                          <span>{statLabel(stat.stat_type)}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={corrections[stat.id] ?? stat.value}
                            onChange={e =>
                              setCorrections(prev => ({ ...prev, [stat.id]: e.target.value }))
                            }
                          />
                        </label>
                      ))}
                      <label className="fa-field" style={{ gridColumn: '1 / -1' }}>
                        <span>Reason for correction</span>
                        <textarea
                          value={correctReason}
                          onChange={e => setCorrectReason(e.target.value)}
                          rows={2}
                          placeholder="Explain why this correction is needed…"
                          style={{ fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </label>
                      <div className="msr-correct-actions">
                        <button
                          className="fa-btn fa-btn--sm fa-btn--ghost"
                          onClick={() => { setCorrectMode(false); setCorrections({}); setCorrectReason(''); }}
                        >
                          Cancel
                        </button>
                        <button
                          className="fa-btn fa-btn--sm fa-btn--gradient"
                          disabled={correctSaving}
                          onClick={() => void saveCorrections()}
                        >
                          {correctSaving ? 'Saving…' : 'Save Correction'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="msr-stats-grid">
                      {detail.stats.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
                          No statistics on record for this player.
                        </p>
                      ) : (
                        detail.stats.map(stat => (
                          <div key={stat.id} className="msr-stat-row">
                            <span className="msr-stat-label">{statLabel(stat.stat_type)}</span>
                            <strong className="msr-stat-value">{stat.value}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* ── Fantasy scoring ── */}
                <div className="msr-section">
                  <div className="msr-section-header">
                    <span className="msr-section-title">Fantasy Scoring</span>
                    {detail.fantasy_points !== null && (
                      <span className="msr-total-badge">
                        {detail.fantasy_points} pts total
                      </span>
                    )}
                  </div>

                  {!detail.gameweek ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      This fixture is not assigned to a gameweek — no fantasy scoring available.
                    </p>
                  ) : detail.breakdown.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      No fantasy points calculated yet. Recalculate the gameweek to score.
                    </p>
                  ) : (
                    <div className="msr-breakdown-table">
                      <div className="msr-breakdown-header">
                        <span>Statistic</span>
                        <span>Value</span>
                        <span>Rule</span>
                        <span style={{ textAlign: 'right' }}>Points</span>
                      </div>
                      {detail.breakdown.map((item: ScoringBreakdownItem, i: number) => {
                        const rule = detail.scoring_rules.find(
                          r => r.statistic_type.toUpperCase() === item.statistic_type.toUpperCase(),
                        );
                        return (
                          <div key={i} className="msr-breakdown-row">
                            <span>{statLabel(item.statistic_type)}</span>
                            <span>{item.value}</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem' }}>
                              {rule ? `× ${rule.points} pts` : '—'}
                            </span>
                            <strong style={{ textAlign: 'right', color: '#c4b5fd' }}>
                              {fmtPoints(item.points)}
                            </strong>
                          </div>
                        );
                      })}
                      <div className="msr-breakdown-total">
                        <span>Total</span>
                        <span />
                        <span />
                        <strong>{detail.fantasy_points} pts</strong>
                      </div>
                      {detail.correction_points && parseFloat(detail.correction_points) !== 0 && (
                        <div className="msr-breakdown-correction">
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem' }}>
                            Includes correction: {detail.correction_points} pts
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Correction result notice ── */}
                {correctResult && (
                  <div className="fa-success-banner" role="status">
                    <span>✓ {correctResult}</span>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="msr-drawer-actions">
                  {!correctMode && (
                    <button
                      className="fa-btn fa-btn--sm"
                      onClick={() => {
                        setCorrectMode(true);
                        setCorrectResult(null);
                        // Pre-populate corrections with current values
                        const init: Record<string, string> = {};
                        detail.stats.forEach(s => { init[s.id] = s.value; });
                        setCorrections(init);
                      }}
                      disabled={detail.stats.length === 0}
                    >
                      ✎ Correct Statistics
                    </button>
                  )}
                  {detail.review_status !== 'APPROVED' ? (
                    <button
                      className="fa-btn fa-btn--sm fa-btn--gradient"
                      disabled={approveSaving}
                      onClick={() => void handleApprove()}
                    >
                      {approveSaving ? 'Approving…' : '✓ Approve'}
                    </button>
                  ) : (
                    <span
                      className="fa-status-pill fa-status-pill--finalized"
                      style={{ padding: '6px 14px' }}
                    >
                      ✓ Approved
                      {detail.approved_at && (
                        <span style={{ marginLeft: 6, fontWeight: 400, fontSize: '0.64rem' }}>
                          {new Date(detail.approved_at).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}
