import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  adminCreateCompetition, adminCreateCorrection, adminCreateGameweek, adminCreatePlayer,
  adminCreateScoringRule, adminFinalizeGameweek, adminRecalculateGameweek, adminTransitionGameweek,
  adminUpdateCompetition, adminUpdateGameweek, adminUpdatePlayer,
  fetchAdminCorrections, fetchAdminFantasyCompetitions, fetchAdminLeagueOverview,
  fetchCanonicalFantasyOptions, fetchCompetitionLeaderboard, fetchFantasyFixtureCandidates,
  fetchFantasyGameweeks, fetchFantasyPlayerCandidates, fetchFantasyPlayers,
  fetchFantasyStatisticTypes, fetchGameweekLeaderboard, fetchGameweekPoints,
  type FantasyAvailability, type FantasyCompetition, type FantasyPlayer, type FantasyStatisticType,
  type CanonicalFantasyOptions, type FantasyFixture, type FantasyGameweek,
  type FantasyLeagueOverview, type FantasyPlayerCandidate, type FantasyStanding, type FantasyTeamScore,
} from '../../../services/fantasyAdminService';
import './FantasyAdminPage.css';

/* ── helpers ─────────────────────────────────────────────── */

type Tab = 'overview'|'competitions'|'players'|'gameweeks'|'scoring'|'corrections'|'leaderboards'|'leagues';
const AVAILABILITY: FantasyAvailability[] = ['AVAILABLE','DOUBTFUL','INJURED','SUSPENDED','UNAVAILABLE'];
const err = (e: unknown) => e instanceof Error ? e.message : 'Fantasy administration request failed.';

/** Safely parse a JSON string. Returns [parsed, null] on success or [null, errorMessage] on failure. */
function safeJson<T>(raw: string): [T, null] | [null, string] {
  try {
    return [JSON.parse(raw) as T, null];
  } catch (e) {
    return [null, e instanceof Error ? e.message : 'Invalid JSON'];
  }
}

const editableCompetition = (row: FantasyCompetition) => ({
  name: row.name, description: row.description, enabled: row.enabled, visibility: row.visibility,
  registration_state: row.registration_state, registration_deadline: row.registration_deadline ?? '',
  squad_size: String(row.squad_size), starting_lineup_size: String(row.starting_lineup_size),
  bench_size: String(row.bench_size), initial_budget: String(row.initial_budget),
  max_players_per_team: String(row.max_players_per_team), captain_multiplier: String(row.captain_multiplier),
  vice_captain_fallback: row.vice_captain_fallback,
  free_transfers_per_gameweek: String(row.free_transfers_per_gameweek),
  transfer_penalty: String(row.transfer_penalty),
  position_rules: JSON.stringify(row.position_rules, null, 2),
  formation_rules: JSON.stringify(row.formation_rules, null, 2),
  tie_break_rules: JSON.stringify(row.tie_break_rules, null, 2),
  prize_metadata: JSON.stringify(row.prize_metadata, null, 2),
});

/* ── component ────────────────────────────────────────────── */

export default function FantasyAdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  // Core data
  const [competitions, setCompetitions] = useState<FantasyCompetition[]>([]);
  const [competitionId, setCompetitionId] = useState('');
  const [players, setPlayers] = useState<FantasyPlayer[]>([]);
  const [candidates, setCandidates] = useState<FantasyPlayerCandidate[]>([]);
  const [canonical, setCanonical] = useState<CanonicalFantasyOptions>({ competitions: [], seasons: [] });

  // Players tab
  const [candidateId, setCandidateId] = useState('');
  const [position, setPosition] = useState('');
  const [price, setPrice] = useState('');
  const [playerAvailability, setPlayerAvailability] = useState<FantasyAvailability>('AVAILABLE');

  // Gameweeks tab
  const [allGameweeks, setAllGameweeks] = useState<FantasyGameweek[]>([]);
  const [fixtures, setFixtures] = useState<FantasyFixture[]>([]);
  const [gwFixtureIds, setGwFixtureIds] = useState<Record<string, string[]>>({});
  const [newGwFixtureIds, setNewGwFixtureIds] = useState<string[]>([]);
  const [gwForm, setGwForm] = useState({ number: '', name: '', starts_at: '', deadline_at: '', ends_at: '' });

  // Scoring tab
  const [statistic, setStatistic] = useState('');
  const [points, setPoints] = useState('');
  const [statisticTypes, setStatisticTypes] = useState<FantasyStatisticType[]>([]);

  // Corrections tab
  const [correctionCompId, setCorrectionCompId] = useState('');
  const [correctionGameweekId, setCorrectionGameweekId] = useState('');
  const [pointRecords, setPointRecords] = useState<Array<{ id: string; player: { player_name: string }; total_points: string }>>([]);
  const [correctionPoint, setCorrectionPoint] = useState('');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [corrections, setCorrections] = useState<Array<Record<string, unknown>>>([]);
  const [correctionGameweeks, setCorrectionGameweeks] = useState<FantasyGameweek[]>([]);

  // Leaderboards tab
  const [overall, setOverall] = useState<FantasyStanding[]>([]);
  const [gameweekBoard, setGameweekBoard] = useState<FantasyTeamScore[]>([]);
  const [leagueOverview, setLeagueOverview] = useState<FantasyLeagueOverview[]>([]);

  // Competition create form
  const [compForm, setCompForm] = useState({
    competition: '', season: '', name: '', description: '',
    squad_size: '', starting_lineup_size: '', bench_size: '',
    initial_budget: '100', max_players_per_team: '3',
    captain_multiplier: '2', free_transfers_per_gameweek: '1',
    transfer_penalty: '4', position_rules: '{}', formation_rules: '{}',
  });
  const [compFormErrors, setCompFormErrors] = useState<Record<string, string>>({});

  // Inline edit modals
  const [editingCompId, setEditingCompId] = useState('');
  const [competitionEdit, setCompetitionEdit] = useState<ReturnType<typeof editableCompetition> | null>(null);
  const [compEditErrors, setCompEditErrors] = useState<Record<string, string>>({});
  const [editingPlayerId, setEditingPlayerId] = useState('');
  const [playerEdit, setPlayerEdit] = useState<{ position: string; price: string; eligible: boolean; availability: FantasyAvailability } | null>(null);

  // UI state
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const competition = competitions.find(r => r.id === competitionId);
  const currentPlayers = players.filter(r => r.fantasy_competition === competitionId);
  const gameweeks = useMemo(() => competitions.flatMap(r => r.current_gameweek ? [r.current_gameweek] : []), [competitions]);

  /* ── data loading ─────────────────────────────────────── */

  const reload = async () => {
    setLoading(true);
    try {
      const [rows, options, leagues] = await Promise.all([
        fetchAdminFantasyCompetitions(),
        fetchCanonicalFantasyOptions(),
        fetchAdminLeagueOverview(),
      ]);
      setCompetitions(rows);
      setCanonical(options);
      setLeagueOverview(leagues);
      setCompetitionId(cur => cur || rows[0]?.id || '');
      if (rows[0]) setPlayers(await fetchFantasyPlayers(rows[0].id));
    } catch (e) { setError(err(e)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    if (!competitionId) return;
    void Promise.all([
      fetchFantasyPlayers(competitionId),
      fetchFantasyPlayerCandidates(competitionId),
      fetchFantasyGameweeks(competitionId),
      fetchFantasyFixtureCandidates(competitionId),
      fetchFantasyStatisticTypes(competitionId),
      fetchCompetitionLeaderboard(competitionId),
    ]).then(([pool, cands, weeks, evts, stats, ranking]) => {
      setPlayers(pool);
      setCandidates(cands);
      setAllGameweeks(weeks);
      setFixtures(evts);
      setStatisticTypes(stats);
      setOverall(ranking);
      setGwFixtureIds(prev => {
        const next = { ...prev };
        weeks.forEach(gw => { if (!next[gw.id]) next[gw.id] = gw.fixture_details.map(f => f.id); });
        return next;
      });
    }).catch(e => setError(err(e)));
  }, [competitionId]);

  // Auto-fill position from candidate profile — derived value, no effect needed
  const autoPosition = useMemo(() => {
    const cand = candidates.find(r => r.id === candidateId);
    if (!cand || !competition) return '';
    return competition.position_rules[cand.profile_position] !== undefined
      ? cand.profile_position
      : Object.keys(competition.position_rules)[0] ?? '';
  }, [candidateId, candidates, competition]);

  // Sync autoPosition → position state only when it has a real value
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoPosition) setPosition(autoPosition);
  }, [autoPosition]);

  /* ── mutations ────────────────────────────────────────── */

  const run = async (action: () => Promise<unknown>, success: string) => {
    setError(''); setNotice(''); setSaving(true);
    try { await action(); setNotice(success); await reload(); return true; }
    catch (e) { setError(err(e)); return false; }
    finally { setSaving(false); }
  };

  /* Validate + parse JSON fields before submitting competition create form */
  const submitCreateCompetition = async () => {
    const newErrors: Record<string, string> = {};
    if (!compForm.competition) newErrors.competition = 'Required';
    if (!compForm.season) newErrors.season = 'Required';
    if (!compForm.name.trim()) newErrors.name = 'Required';
    if (!compForm.squad_size) newErrors.squad_size = 'Required';
    if (!compForm.starting_lineup_size) newErrors.starting_lineup_size = 'Required';
    if (!compForm.bench_size) newErrors.bench_size = 'Required';

    const [posRules, posErr] = safeJson<Record<string, number>>(compForm.position_rules);
const [fmtRules, fmtErr] = safeJson<Record<string, { min: number; max: number }>>(compForm.formation_rules);
    if (posErr) newErrors.position_rules = posErr;
    if (fmtErr) newErrors.formation_rules = fmtErr;

    if (Object.keys(newErrors).length > 0) { setCompFormErrors(newErrors); return; }
    setCompFormErrors({});

    const ok = await run(() => adminCreateCompetition({
      ...compForm,
      squad_size: Number(compForm.squad_size),
      starting_lineup_size: Number(compForm.starting_lineup_size),
      bench_size: Number(compForm.bench_size),
      max_players_per_team: Number(compForm.max_players_per_team),
      free_transfers_per_gameweek: Number(compForm.free_transfers_per_gameweek),
      transfer_penalty: Number(compForm.transfer_penalty),
      position_rules: posRules ?? undefined,
formation_rules: fmtRules ?? undefined,
      enabled: true, visibility: 'PUBLIC', registration_state: 'OPEN',
      vice_captain_fallback: true,
      tie_break_rules: ['total_points', 'fewer_transfer_penalties', 'earlier_registration'],
    }), 'Fantasy competition created.');
    if (ok) setCompForm({ competition: '', season: '', name: '', description: '', squad_size: '', starting_lineup_size: '', bench_size: '', initial_budget: '100', max_players_per_team: '3', captain_multiplier: '2', free_transfers_per_gameweek: '1', transfer_penalty: '4', position_rules: '{}', formation_rules: '{}' });
  };

  /* Validate + parse JSON fields before submitting competition edit */
  const saveCompetition = async () => {
    if (!competitionEdit || !editingCompId) return;
    const newErrors: Record<string, string> = {};
    const [posRules, posErr] =
  safeJson<Record<string, number>>(competitionEdit.position_rules);

const [fmtRules, fmtErr] =
  safeJson<Record<string, { min: number; max: number }>>(
    competitionEdit.formation_rules
  );

const [tieRules, tieErr] =
  safeJson<string[]>(competitionEdit.tie_break_rules);

const [prizeRules, prizeErr] =
  safeJson<Record<string, unknown>>(competitionEdit.prize_metadata);;
    if (posErr) newErrors.position_rules = posErr;
    if (fmtErr) newErrors.formation_rules = fmtErr;
    if (tieErr) newErrors.tie_break_rules = tieErr;
    if (prizeErr) newErrors.prize_metadata = prizeErr;
    if (Object.keys(newErrors).length > 0) { setCompEditErrors(newErrors); return; }
    setCompEditErrors({});

    const ok = await run(() => adminUpdateCompetition(editingCompId, {
      ...competitionEdit,
      registration_deadline: competitionEdit.registration_deadline || null,
      squad_size: Number(competitionEdit.squad_size),
      starting_lineup_size: Number(competitionEdit.starting_lineup_size),
      bench_size: Number(competitionEdit.bench_size),
      initial_budget: competitionEdit.initial_budget,
      max_players_per_team: Number(competitionEdit.max_players_per_team),
      captain_multiplier: competitionEdit.captain_multiplier,
      free_transfers_per_gameweek: Number(competitionEdit.free_transfers_per_gameweek),
      transfer_penalty: Number(competitionEdit.transfer_penalty),
      position_rules: posRules ?? undefined,
formation_rules: fmtRules ?? undefined,
tie_break_rules: tieRules ?? undefined,
prize_metadata: prizeRules ?? undefined,
    }), 'Fantasy competition updated.');
    if (ok) { setEditingCompId(''); setCompetitionEdit(null); setCompEditErrors({}); }
  };

  const savePlayer = async () => {
    if (!playerEdit || !editingPlayerId) return;
    const ok = await run(() => adminUpdatePlayer(editingPlayerId, {
      position: playerEdit.position, price: Number(playerEdit.price),
      eligible: playerEdit.eligible, availability: playerEdit.availability,
    }), 'Fantasy player updated.');
    if (ok) { setEditingPlayerId(''); setPlayerEdit(null); }
  };

  /* Load corrections for a gameweek */
  const loadCorrections = async (gwId: string) => {
    setCorrectionGameweekId(gwId);
    setPointRecords([]); setCorrections([]);
    if (!gwId) return;
    try {
      const [records, audit] = await Promise.all([fetchGameweekPoints(gwId), fetchAdminCorrections(gwId)]);
      setPointRecords(records as Array<{ id: string; player: { player_name: string }; total_points: string }>);
      setCorrections(audit);
    } catch (e) { setError(err(e)); }
  };

  /* When corrections tab competition changes, reload its gameweeks */
  const changeCorrectionComp = async (cId: string) => {
    setCorrectionCompId(cId);
    setCorrectionGameweekId(''); setPointRecords([]); setCorrections([]);
    if (!cId) return;
    try { setCorrectionGameweeks(await fetchFantasyGameweeks(cId)); }
    catch (e) { setError(err(e)); }
  };

  const competitionName = (fcId: string) => competitions.find(c => c.id === fcId)?.name ?? fcId;

  /* ── render ────────────────────────────────────────────── */

  const fieldCls = (errs: Record<string, string>, key: string) =>
    `fa-field${errs[key] ? ' fa-field--error' : ''}`;

  return (
    <AdminLayout>
      <div className="fa-root">
        {/* Header */}
        <header className="fa-head">
          <div>
            <p className="fa-eyebrow">Sports operations</p>
            <h1>Fantasy Admin</h1>
            <p>Configure official Fantasy competitions against canonical League OS sports, players, fixtures, and statistics.</p>
          </div>
        </header>

        {/* Banners */}
        {error && (
          <div className="fa-error-banner" role="alert">
            <span>{error}</span>
            <button className="fa-btn fa-btn--sm" onClick={() => setError('')} aria-label="Dismiss">✕</button>
          </div>
        )}
        {notice && (
          <div className="fa-success-banner" role="status">
            <span>✓ {notice}</span>
            <button className="fa-btn fa-btn--sm" onClick={() => setNotice('')} aria-label="Dismiss" style={{ marginLeft: 'auto' }}>✕</button>
          </div>
        )}
        {saving && <div className="fa-saving-banner" role="status">⟳ Saving…</div>}

        {/* Tabs */}
        <nav className="fa-tabs">
          {(['overview','competitions','players','gameweeks','scoring','corrections','leaderboards','leagues'] as Tab[]).map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="fa-empty">Loading Fantasy operations…</div>
        ) : (
          <>
            {/* ════════════ OVERVIEW ════════════ */}
            {tab === 'overview' && (
              <div className="fa-stats">
                <article><span>Fantasy competitions</span><strong>{competitions.length}</strong></article>
                <article><span>Configured players</span><strong>{players.length}</strong></article>
                <article><span>Active gameweeks</span><strong>{gameweeks.length}</strong></article>
                <article>
                  <span>Awaiting / scoring</span>
                  <strong>{allGameweeks.filter(r => ['LOCKED','LIVE','SCORING'].includes(r.status)).length}</strong>
                </article>
              </div>
            )}

            {/* ════════════ COMPETITIONS ════════════ */}
            {tab === 'competitions' && (
              <section className="fa-panel">
                <h2>Create Fantasy Competition</h2>
                <div className="fa-form-grid">
                  <label className={fieldCls(compFormErrors,'competition')}>
                    <span>Canonical competition *</span>
                    <select value={compForm.competition} onChange={e => setCompForm({ ...compForm, competition: e.target.value, season: '' })}>
                      <option value="">— Select —</option>
                      {canonical.competitions.map(r => <option value={r.id} key={r.id}>{r.name} · {r.sport}</option>)}
                    </select>
                    {compFormErrors.competition && <span className="fa-field-error">{compFormErrors.competition}</span>}
                  </label>

                  <label className={fieldCls(compFormErrors,'season')}>
                    <span>Season *</span>
                    <select value={compForm.season} onChange={e => setCompForm({ ...compForm, season: e.target.value })}>
                      <option value="">— Select —</option>
                      {canonical.seasons.filter(r => r.competition === compForm.competition).map(r => <option value={r.id} key={r.id}>{r.name}</option>)}
                    </select>
                    {compFormErrors.season && <span className="fa-field-error">{compFormErrors.season}</span>}
                  </label>

                  {(['name','description','squad_size','starting_lineup_size','bench_size','initial_budget','max_players_per_team','captain_multiplier','free_transfers_per_gameweek','transfer_penalty'] as const).map(f => (
                    <label key={f} className={fieldCls(compFormErrors, f)}>
                      <span>{f.replaceAll('_',' ')}{['name','squad_size','starting_lineup_size','bench_size'].includes(f) ? ' *' : ''}</span>
                      <input
                        type={['squad_size','starting_lineup_size','bench_size','initial_budget','max_players_per_team','captain_multiplier','free_transfers_per_gameweek','transfer_penalty'].includes(f) ? 'number' : 'text'}
                        value={compForm[f]}
                        onChange={e => setCompForm({ ...compForm, [f]: e.target.value })}
                      />
                      {compFormErrors[f] && <span className="fa-field-error">{compFormErrors[f]}</span>}
                    </label>
                  ))}

                  <label className={`${fieldCls(compFormErrors,'position_rules')} fa-form-grid-fullwidth`}>
                    <span>Position rules JSON *  <small style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>e.g. {'{"GK":1,"DEF":4,"MID":4,"FWD":2}'}</small></span>
                    <textarea value={compForm.position_rules} onChange={e => setCompForm({ ...compForm, position_rules: e.target.value })} rows={3} />
                    {compFormErrors.position_rules && <span className="fa-field-error">{compFormErrors.position_rules}</span>}
                  </label>

                  <label className={`${fieldCls(compFormErrors,'formation_rules')} fa-form-grid-fullwidth`}>
                    <span>Formation rules JSON  <small style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>e.g. {'{"GK":{"min":1,"max":1},"DEF":{"min":3,"max":5}}'}</small></span>
                    <textarea value={compForm.formation_rules} onChange={e => setCompForm({ ...compForm, formation_rules: e.target.value })} rows={3} />
                    {compFormErrors.formation_rules && <span className="fa-field-error">{compFormErrors.formation_rules}</span>}
                  </label>

                  <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void submitCreateCompetition()}>
                    Create competition
                  </button>
                </div>

                <h2>Official Fantasy Competitions</h2>
                <div className="fa-table-wrap">
                  <table className="fa-table">
                    <thead><tr><th>Name</th><th>Sport</th><th>Registration</th><th>Visibility</th><th>Squad</th><th>Budget</th><th></th></tr></thead>
                    <tbody>
                      {!competitions.length && <tr className="fa-table__empty"><td colSpan={7}>No competitions yet.</td></tr>}
                      {competitions.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.sport}</td>
                          <td><span className={`fa-status-pill fa-status-pill--${r.registration_state.toLowerCase()}`}>{r.registration_state}</span></td>
                          <td>{r.visibility}</td>
                          <td>{r.squad_size}</td>
                          <td>{r.initial_budget}</td>
                          <td>
                            <button className="fa-btn fa-btn--sm" onClick={() => { setEditingCompId(r.id); setCompetitionEdit(editableCompetition(r)); setCompEditErrors({}); }}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ════════════ PLAYERS ════════════ */}
            {tab === 'players' && (
              <section className="fa-panel">
                <div className="fa-comp-selector">
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>

                {competition && (
                  <>
                    <h2>Add Player to Pool</h2>
                    <div className="fa-form-grid">
                      <label className="fa-field">
                        <span>Athlete</span>
                        <select value={candidateId} onChange={e => setCandidateId(e.target.value)}>
                          <option value="">— Select athlete —</option>
                          {candidates.map(r => <option key={r.id} value={r.id}>{r.name} — {r.club ?? 'No club'}</option>)}
                        </select>
                      </label>
                      <label className="fa-field">
                        <span>Fantasy position</span>
                        <select value={position} onChange={e => setPosition(e.target.value)}>
                          {Object.keys(competition.position_rules).map(p => <option key={p}>{p}</option>)}
                        </select>
                      </label>
                      <label className="fa-field">
                        <span>Price (M)</span>
                        <input type="number" min="0.1" step="0.1" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 8.5" />
                      </label>
                      <label className="fa-field">
                        <span>Availability</span>
                        <select value={playerAvailability} onChange={e => setPlayerAvailability(e.target.value as FantasyAvailability)}>
                          {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </label>
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !candidateId || !price}
                        onClick={() => void run(() => adminCreatePlayer({ fantasy_competition: competition.id, player: candidateId, position, price: Number(price), eligible: true, availability: playerAvailability }), 'Player added to pool.')}
                      >
                        Add to pool
                      </button>
                    </div>

                    <h2>Player Pool</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Player</th><th>Club</th><th>Position</th><th>Price</th><th>Eligible</th><th>Availability</th><th></th></tr></thead>
                        <tbody>
                          {!currentPlayers.length && <tr className="fa-table__empty"><td colSpan={7}>No players in this competition pool yet.</td></tr>}
                          {currentPlayers.map(r => (
                            <tr key={r.id}>
                              <td><strong>{r.player_name}</strong></td>
                              <td>{r.club || '—'}</td>
                              <td>{r.position}</td>
                              <td>{r.price}</td>
                              <td>{r.eligible ? '✓' : '✗'}</td>
                              <td><span className={`fa-status-pill fa-status-pill--${r.availability.toLowerCase()}`}>{r.availability}</span></td>
                              <td>
                                <button className="fa-btn fa-btn--sm" onClick={() => { setEditingPlayerId(r.id); setPlayerEdit({ position: r.position, price: String(r.price), eligible: r.eligible, availability: r.availability }); }}>
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ════════════ GAMEWEEKS ════════════ */}
            {tab === 'gameweeks' && (
              <section className="fa-panel">
                <div className="fa-comp-selector">
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>

                {competition && (
                  <>
                    <h2>Create Gameweek</h2>
                    <div className="fa-form-grid">
                      <label className="fa-field">
                        <span>Number</span>
                        <input type="number" value={gwForm.number} onChange={e => setGwForm({ ...gwForm, number: e.target.value })} placeholder="e.g. 1" />
                      </label>
                      <label className="fa-field">
                        <span>Name</span>
                        <input value={gwForm.name} onChange={e => setGwForm({ ...gwForm, name: e.target.value })} placeholder="e.g. Gameweek 1" />
                      </label>
                      {(['starts_at','deadline_at','ends_at'] as const).map(f => (
                        <label key={f} className="fa-field">
                          <span>{f.replaceAll('_',' ')}</span>
                          <input type="datetime-local" value={gwForm[f]} onChange={e => setGwForm({ ...gwForm, [f]: e.target.value })} />
                        </label>
                      ))}
                      {fixtures.length > 0 && (
                        <fieldset>
                          <legend>Assign fixtures (new gameweek)</legend>
                          {fixtures.map(f => (
                            <label key={f.id}>
                              <input type="checkbox" checked={newGwFixtureIds.includes(f.id)} onChange={() => setNewGwFixtureIds(cur => cur.includes(f.id) ? cur.filter(x => x !== f.id) : [...cur, f.id])} />
                              {f.name} · {f.status}
                            </label>
                          ))}
                        </fieldset>
                      )}
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !gwForm.number || !gwForm.name || !gwForm.deadline_at}
                        onClick={() => void run(() => adminCreateGameweek({ fantasy_competition: competition.id, number: Number(gwForm.number), name: gwForm.name, starts_at: gwForm.starts_at, deadline_at: gwForm.deadline_at, ends_at: gwForm.ends_at, status: 'DRAFT', fixtures: newGwFixtureIds }), 'Gameweek created.').then(ok => { if (ok) { setGwForm({ number: '', name: '', starts_at: '', deadline_at: '', ends_at: '' }); setNewGwFixtureIds([]); } })}
                      >
                        Create gameweek
                      </button>
                    </div>

                    <h2>Manage Gameweeks</h2>
                    {!allGameweeks.length && <div className="fa-empty" style={{ padding: '24px 0' }}>No gameweeks yet for this competition.</div>}
                    {allGameweeks.map(row => {
                      const gwIds = gwFixtureIds[row.id] ?? [];
                      const toggle = (fId: string) => setGwFixtureIds(p => ({ ...p, [row.id]: p[row.id]?.includes(fId) ? p[row.id].filter(x => x !== fId) : [...(p[row.id] ?? []), fId] }));
                      return (
                        <div className="fa-card" key={row.id}>
                          <h3>
                            {row.name}
                            <span className={`fa-status-pill fa-status-pill--${row.status.toLowerCase()}`}>{row.status}</span>
                            {row.deadline_at && <small style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Deadline: {new Date(row.deadline_at).toLocaleString()}</small>}
                          </h3>
                          <p>{row.fixture_details.map(f => f.name).join(', ') || 'No fixtures assigned'}</p>
                          {fixtures.length > 0 && (
                            <fieldset>
                              <legend>Fixtures</legend>
                              {fixtures.map(f => (
                                <label key={f.id}>
                                  <input type="checkbox" checked={gwIds.includes(f.id)} onChange={() => toggle(f.id)} />
                                  {f.name} · {f.status}
                                </label>
                              ))}
                            </fieldset>
                          )}
                          <div className="fa-card-actions">
                            <button className="fa-btn fa-btn--sm" disabled={saving} onClick={() => void run(() => adminUpdateGameweek(row.id, { fixtures: gwIds }), 'Fixtures saved.')}>
                              Save fixtures
                            </button>
                            {row.status === 'DRAFT' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving} onClick={() => void run(() => adminTransitionGameweek(row.id, 'OPEN'), 'Gameweek opened.')}>
                                Open
                              </button>
                            )}
                            {row.status === 'OPEN' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving} onClick={() => void run(() => adminTransitionGameweek(row.id, 'LOCKED'), 'Gameweek locked.')}>
                                Lock entries
                              </button>
                            )}
                            {row.status === 'LOCKED' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving} onClick={() => void run(() => adminTransitionGameweek(row.id, 'SCORING'), 'Scoring started.')}>
                                Begin scoring
                              </button>
                            )}
                            {(row.status === 'LOCKED' || row.status === 'SCORING') && (
                              <button className="fa-btn fa-btn--sm" disabled={saving} onClick={() => void run(() => adminRecalculateGameweek(row.id), 'Scores recalculated.')}>
                                Recalculate
                              </button>
                            )}
                            {row.status === 'SCORING' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving} onClick={() => void run(() => adminFinalizeGameweek(row.id), 'Gameweek finalized.')}>
                                Finalize
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            )}

            {/* ════════════ SCORING ════════════ */}
            {tab === 'scoring' && (
              <section className="fa-panel">
                <div className="fa-comp-selector">
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>

                {competition && (
                  <>
                    <h2>Add Scoring Rule</h2>
                    <p style={{ margin: '-10px 0 0', fontSize: '0.83rem', color: 'var(--color-text-secondary)' }}>
                      Only statistic types found in authoritative match data are available.
                    </p>
                    {!statisticTypes.length
                      ? <div className="fa-empty" style={{ padding: '20px 0' }}>No statistic types available for this competition yet.</div>
                      : (
                        <div className="fa-form-grid">
                          <label className="fa-field">
                            <span>Statistic type</span>
                            <select value={statistic} onChange={e => setStatistic(e.target.value)}>
                              <option value="">— Select —</option>
                              {statisticTypes.map(r => (
                                <option key={r.code} value={r.code}>
                                  {r.label}{!r.observed ? ' (no data yet)' : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="fa-field">
                            <span>Points per unit</span>
                            <input type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 3" />
                          </label>
                          <button
                            className="fa-btn fa-btn--gradient"
                            disabled={saving || !statistic || !points}
                            onClick={() => void run(() => adminCreateScoringRule({ fantasy_competition: competition.id, statistic_type: statistic, points, conditions: {}, enabled: true }), 'Scoring rule added.').then(ok => { if (ok) { setStatistic(''); setPoints(''); } })}
                          >
                            Add rule
                          </button>
                        </div>
                      )
                    }

                    <h2>Current Scoring Rules</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Statistic</th><th>Points per unit</th></tr></thead>
                        <tbody>
                          {!competition.scoring_rules.length && <tr className="fa-table__empty"><td colSpan={2}>No scoring rules defined yet.</td></tr>}
                          {competition.scoring_rules.map(r => (
                            <tr key={r.id}><td>{r.statistic_type}</td><td>{r.points}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ════════════ CORRECTIONS ════════════ */}
            {tab === 'corrections' && (
              <section className="fa-panel">
                <h2>Scoring Corrections</h2>
                <p style={{ margin: '-10px 0 0', fontSize: '0.83rem', color: 'var(--color-text-secondary)' }}>
                  Corrections are immutable and audit-trailed. A reason is required.
                </p>

                <div className="fa-form-grid">
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={correctionCompId} onChange={e => void changeCorrectionComp(e.target.value)}>
                      <option value="">— Select —</option>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Gameweek</span>
                    <select value={correctionGameweekId} onChange={e => void loadCorrections(e.target.value)} disabled={!correctionCompId}>
                      <option value="">— Select —</option>
                      {correctionGameweeks.map(r => <option key={r.id} value={r.id}>{r.name} · {r.status}</option>)}
                    </select>
                  </label>
                </div>

                {correctionGameweekId && (
                  <>
                    <div className="fa-form-grid">
                      <label className="fa-field">
                        <span>Player point record</span>
                        <select value={correctionPoint} onChange={e => setCorrectionPoint(e.target.value)}>
                          <option value="">— Select player —</option>
                          {pointRecords.map(r => <option key={r.id} value={r.id}>{r.player.player_name} · current {r.total_points}</option>)}
                        </select>
                      </label>
                      <label className="fa-field">
                        <span>Corrected final points</span>
                        <input type="number" value={correctionValue} onChange={e => setCorrectionValue(e.target.value)} placeholder="New total" />
                      </label>
                      <label className="fa-field fa-form-grid-fullwidth">
                        <span>Audit reason *</span>
                        <textarea value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Required — explain why this correction is necessary" rows={3} />
                      </label>
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !correctionPoint || !correctionValue || !correctionReason.trim()}
                        onClick={() => void run(() => adminCreateCorrection({ player_points: correctionPoint, new_value: correctionValue, reason: correctionReason }), 'Correction saved. Scores recalculated.').then(ok => { if (ok) { setCorrectionPoint(''); setCorrectionValue(''); setCorrectionReason(''); void loadCorrections(correctionGameweekId); } })}
                      >
                        Submit correction
                      </button>
                    </div>

                    <h2>Correction History</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Player</th><th>Previous</th><th>Corrected</th><th>Reason</th><th>Created</th></tr></thead>
                        <tbody>
                          {!corrections.length && <tr className="fa-table__empty"><td colSpan={5}>No corrections for this gameweek.</td></tr>}
                          {corrections.map(r => (
                            <tr key={String(r.id)}>
                              <td>{String(r.player_name)}</td>
                              <td>{String(r.previous_value)}</td>
                              <td><strong>{String(r.new_value)}</strong></td>
                              <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>{String(r.reason)}</td>
                              <td>{new Date(String(r.created_at)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ════════════ LEADERBOARDS ════════════ */}
            {tab === 'leaderboards' && (
              <section className="fa-panel">
                <div className="fa-comp-selector">
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Gameweek leaderboard</span>
                    <select onChange={e => void fetchGameweekLeaderboard(e.target.value).then(setGameweekBoard)}>
                      <option value="">— Overall only —</option>
                      {allGameweeks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>

                <h2>Overall Standings</h2>
                <div className="fa-table-wrap">
                  <table className="fa-table">
                    <thead><tr><th>#</th><th>Team</th><th>Manager</th><th>Points</th></tr></thead>
                    <tbody>
                      {!overall.length && <tr className="fa-table__empty"><td colSpan={4}>No entries yet.</td></tr>}
                      {overall.map(r => (
                        <tr key={r.team_id}>
                          <td><strong>{r.rank}</strong></td>
                          <td>{r.team__name ?? r.team_name}</td>
                          <td>{r.manager}</td>
                          <td><strong>{r.total_points}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {gameweekBoard.length > 0 && (
                  <>
                    <h2>Gameweek Standings</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>#</th><th>Team</th><th>Manager</th><th>Points</th></tr></thead>
                        <tbody>
                          {gameweekBoard.map((r, i) => (
                            <tr key={r.id}>
                              <td><strong>{i + 1}</strong></td>
                              <td>{r.team_name}</td>
                              <td>{r.manager}</td>
                              <td><strong>{r.total_points}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ════════════ LEAGUES ════════════ */}
            {tab === 'leagues' && (
              <section className="fa-panel">
                <h2>Fan League Overview</h2>
                <div className="fa-table-wrap">
                  <table className="fa-table">
                    <thead><tr><th>League</th><th>Competition</th><th>Visibility</th><th>Owner</th><th>Members</th><th>Capacity</th><th>Status</th></tr></thead>
                    <tbody>
                      {!leagueOverview.length && <tr className="fa-table__empty"><td colSpan={7}>No fan leagues created yet.</td></tr>}
                      {leagueOverview.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{competitionName(r.fantasy_competition)}</td>
                          <td>{r.visibility}</td>
                          <td>{r.owner}</td>
                          <td>{r.member_count}</td>
                          <td>{r.capacity ?? 'Unlimited'}</td>
                          <td><span className={`fa-status-pill fa-status-pill--${r.status.toLowerCase()}`}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* ════════════ EDIT COMPETITION MODAL ════════════ */}
        {competitionEdit && (
          <div className="fa-modal-overlay" onClick={() => { setEditingCompId(''); setCompetitionEdit(null); }}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit Fantasy competition">
              <h2>Edit {competitions.find(r => r.id === editingCompId)?.name}</h2>
              <p>Canonical competition and season are read-only.</p>
              <div className="fa-modal-form">
                <div className="fa-form-grid">
                  {(['name','description','registration_deadline','squad_size','starting_lineup_size','bench_size','initial_budget','max_players_per_team','captain_multiplier','free_transfers_per_gameweek','transfer_penalty'] as const).map(f => (
                    <label key={f} className={fieldCls(compEditErrors, f)}>
                      <span>{f.replaceAll('_',' ')}</span>
                      <input
                        aria-label={f.replaceAll('_',' ')}
                        type={f === 'registration_deadline' ? 'datetime-local' : 'text'}
                        value={competitionEdit[f]}
                        onChange={e => setCompetitionEdit({ ...competitionEdit, [f]: e.target.value })}
                      />
                      {compEditErrors[f] && <span className="fa-field-error">{compEditErrors[f]}</span>}
                    </label>
                  ))}
                  <label className="fa-field">
                    <span>Visibility</span>
                    <select value={competitionEdit.visibility} onChange={e => setCompetitionEdit({ ...competitionEdit, visibility: e.target.value as FantasyCompetition['visibility'] })}>
                      <option>PUBLIC</option><option>PRIVATE</option>
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Registration state</span>
                    <select value={competitionEdit.registration_state} onChange={e => setCompetitionEdit({ ...competitionEdit, registration_state: e.target.value as FantasyCompetition['registration_state'] })}>
                      <option>OPEN</option><option>CLOSED</option>
                    </select>
                  </label>
                  <label className="fa-checkbox-row">
                    <input type="checkbox" checked={competitionEdit.enabled} onChange={e => setCompetitionEdit({ ...competitionEdit, enabled: e.target.checked })} />
                    Enabled (visible to fans)
                  </label>
                  <label className="fa-checkbox-row">
                    <input type="checkbox" checked={competitionEdit.vice_captain_fallback} onChange={e => setCompetitionEdit({ ...competitionEdit, vice_captain_fallback: e.target.checked })} />
                    Vice captain fallback
                  </label>
                  {(['position_rules','formation_rules','tie_break_rules','prize_metadata'] as const).map(f => (
                    <label key={f} className={`fa-field fa-form-grid-fullwidth ${compEditErrors[f] ? 'fa-field--error' : ''}`}>
                      <span>{f.replaceAll('_',' ')} JSON</span>
                      <textarea
                        aria-label={f.replaceAll('_',' ')}
                        value={competitionEdit[f]}
                        onChange={e => { setCompetitionEdit({ ...competitionEdit, [f]: e.target.value }); setCompEditErrors(p => ({ ...p, [f]: '' })); }}
                        rows={4}
                      />
                      {compEditErrors[f] && <span className="fa-field-error">{compEditErrors[f]}</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => { setEditingCompId(''); setCompetitionEdit(null); setCompEditErrors({}); }}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void saveCompetition()}>Save competition</button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ EDIT PLAYER MODAL ════════════ */}
        {playerEdit && editingPlayerId && (
          <div className="fa-modal-overlay" onClick={() => { setEditingPlayerId(''); setPlayerEdit(null); }}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit Fantasy player">
              <h2>Edit {currentPlayers.find(r => r.id === editingPlayerId)?.player_name}</h2>
              <p>Canonical participant, club, and sport are read-only.</p>
              <div className="fa-modal-form">
                <label className="fa-field">
                  <span>Fantasy position</span>
                  <select value={playerEdit.position} onChange={e => setPlayerEdit({ ...playerEdit, position: e.target.value })}>
                    {competition && Object.keys(competition.position_rules).map(p => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="fa-field">
                  <span>Price (M)</span>
                  <input type="number" min="0.1" step="0.1" value={playerEdit.price} onChange={e => setPlayerEdit({ ...playerEdit, price: e.target.value })} />
                </label>
                <label className="fa-checkbox-row">
                  <input type="checkbox" checked={playerEdit.eligible} onChange={e => setPlayerEdit({ ...playerEdit, eligible: e.target.checked })} />
                  Eligible (can be selected by fans)
                </label>
                <label className="fa-field">
                  <span>Availability</span>
                  <select value={playerEdit.availability} onChange={e => setPlayerEdit({ ...playerEdit, availability: e.target.value as FantasyAvailability })}>
                    {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => { setEditingPlayerId(''); setPlayerEdit(null); }}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void savePlayer()}>Save player</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
