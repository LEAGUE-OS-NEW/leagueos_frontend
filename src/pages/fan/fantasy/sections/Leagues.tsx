import { useCallback, useEffect, useRef, useState } from 'react';
import type { Competition, FantasyTeam } from '../types';
import type { FantasyLeague, FantasyLeagueMember, FantasyStanding } from '../../../../services/fantasyService';
import {
  createFantasyLeague, fetchCompetitionLeaderboard, fetchLeagueMembers,
  fetchLeagueStandings, fetchMyLeagues, fetchPublicLeagues,
  joinFantasyLeague, joinFantasyLeagueByCode, leaveFantasyLeague,
} from '../../../../services/fantasyService';
import { extractApiError } from '../../../../services/apiUtils';
import { Modal, Drawer } from './Modal';

/**
 * Exact detail text the backend returns when the user has no Fantasy team yet
 * for the competition linked to the invite code.
 * Source: fantasy/views.py LeagueViewSet.join_by_code
 */
const NO_TEAM_BACKEND_MSG = 'Invalid invite code or no team for this competition.';

interface Props {
  competition: Competition;
  /**
   * Undefined when the user has not yet built a squad (join-by-code entry
   * path).  The leagues screen is still shown so they can attempt the join —
   * the backend enforces the team requirement and we surface a clear prompt.
   */
  team?: FantasyTeam;
  /**
   * Invite code to pre-fill the join modal with.  Set by FantasyCompetitions
   * when the user arrives via /fan/fantasy?pendingCode=XYZ.
   */
  initialCode?: string;
  /**
   * Called when a join-by-code attempt fails because the user has no team yet.
   * Parent navigates them to the squad builder for this competition.
   */
  onNeedTeam?: () => void;
}

export default function Leagues({ competition, team, initialCode, onNeedTeam }: Props) {
  const [tab, setTab] = useState<'mine' | 'public' | 'overall'>('mine');
  const [mine, setMine] = useState<FantasyLeague[]>([]);
  const [publicRows, setPublic] = useState<FantasyLeague[]>([]);
  const [overall, setOverall] = useState<FantasyStanding[]>([]);

  const [selected, setSelected] = useState<FantasyLeague | null>(null);
  const [members, setMembers] = useState<FantasyLeagueMember[]>([]);
  const [standings, setStandings] = useState<FantasyStanding[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(!!initialCode);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [code, setCode] = useState(() => initialCode ?? '');

  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState('');   // error inside the join modal
  const [error, setError] = useState('');            // page-level error
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    const [m, p, o] = await Promise.all([
      fetchMyLeagues(),
      fetchPublicLeagues(),
      fetchCompetitionLeaderboard(competition.id),
    ]);
    setMine(m.filter(x => x.fantasy_competition === competition.id));
    setPublic(p.filter(x => x.fantasy_competition === competition.id));
    setOverall(o);
  }, [competition.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load leagues.');
      }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  async function open(row: FantasyLeague) {
    setSelected(row);
    setError('');
    try {
      const [m, s] = await Promise.all([
        fetchLeagueMembers(row.id),
        fetchLeagueStandings(row.id),
      ]);
      setMembers(m);
      setStandings(s);
    } catch (e) {
      setError(extractApiError(e).message);
    }
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  async function create() {
    setError('');
    try {
      const row = await createFantasyLeague({
        fantasy_competition: competition.id, name, visibility,
      });
      setCreateOpen(false);
      setName('');
      await reload();
      await open(row);
    } catch (e) {
      setError(extractApiError(e).message);
    }
  }

  async function joinByCode() {
    setJoinError('');
    try {
      const row = await joinFantasyLeagueByCode(code.trim().toUpperCase());
      setJoinOpen(false);
      setCode('');
      await reload();
      await open(row);
    } catch (e) {
      const { message } = extractApiError(e);
      if (message === NO_TEAM_BACKEND_MSG) {
        // The code is valid — the user just needs a team for this competition.
        setJoinOpen(false);
        setCode('');
        if (onNeedTeam) {
          onNeedTeam();
        } else {
          setError(
            'You need a Fantasy team for this competition before you can join a league. ' +
            'Create your squad first, then use your invite code.',
          );
        }
      } else {
        // Real error: invalid code, league full, already a member, etc.
        setJoinError(message);
      }
    }
  }

  async function joinPublic(row: FantasyLeague) {
    setError('');
    try {
      await joinFantasyLeague(row.id);
      await reload();
      await open(row);
    } catch (e) {
      setError(extractApiError(e).message);
    }
  }

  async function leave() {
    if (!selected) return;
    setError('');
    try {
      await leaveFantasyLeague(selected.id);
      setSelected(null);
      await reload();
    } catch (e) {
      setError(extractApiError(e).message);
    }
  }

  function copyCode(inviteCode: string) {
    void navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const hasTeam = !!team;
  const listRows = tab === 'mine' ? mine : publicRows;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="leagues">

      {/* No-team banner — shown when the user arrived via an invite link but
          hasn't built a squad yet.  Gives them a clear action. */}
      {!hasTeam && (
        <div className="leagues-no-team-banner" role="note">
          <div>
            <strong>You don't have a squad for this competition yet.</strong>
            <p>
              You can browse and use an invite code, but you'll need to create your
              team before your entry appears in the standings.
            </p>
          </div>
          {onNeedTeam && (
            <button className="btn btn-primary" onClick={onNeedTeam}>
              Build my squad
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="leagues-tabs">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My Leagues
        </button>
        <button className={tab === 'public' ? 'active' : ''} onClick={() => setTab('public')}>
          Public Leagues
        </button>
        <button className={tab === 'overall' ? 'active' : ''} onClick={() => setTab('overall')}>
          Overall Leaderboard
        </button>
      </div>

      {error && <p className="transfer-cost-warning" role="alert">{error}</p>}

      {tab !== 'overall' ? (
        <>
          <div className="sb-summary-bar">
            <span>Compete with friends, clubs and the League OS community.</span>
            <div className="sb-actions" style={{ margin: 0 }}>
              {/* Join by code is always available — backend validates the team */}
              <button className="btn btn-secondary" onClick={() => setJoinOpen(true)}>
                Join by code
              </button>
              {/* Create league requires a team (backend enforces: perform_create
                  calls FantasyTeam.objects.get).  Disable and explain when no team. */}
              <button
                className="btn btn-primary"
                disabled={!hasTeam}
                title={hasTeam ? undefined : 'Create a Fantasy squad for this competition first'}
                onClick={() => setCreateOpen(true)}
              >
                Create league
              </button>
            </div>
          </div>

          <div className="league-card-list">
            {listRows.map(row => {
              const isMember = mine.some(x => x.id === row.id);
              const canJoin = tab === 'public' && !isMember;
              return (
                <div className="league-card-v2" key={row.id}>
                  {/* Left accent bar based on visibility */}
                  <span className={`league-card-accent ${row.visibility === 'PRIVATE' ? 'accent-purple' : 'accent-blue'}`} />

                  <div className="league-card-body" onClick={() => void open(row)}>
                    <div className="league-card-top">
                      <div className="league-card-title-group">
                        <strong className="league-card-name">{row.name}</strong>
                        <span className={`league-card-vis-badge ${row.visibility === 'PRIVATE' ? 'vis-private' : 'vis-public'}`}>
                          {row.visibility === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
                        </span>
                        {isMember && (
                          <span className="league-card-member-badge">✓ Joined</span>
                        )}
                      </div>
                      <svg className="league-card-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    <div className="league-card-stats">
                      <div className="league-card-stat">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M1 13c0-2.761 2.239-5 5-5h0a5 5 0 015 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M14 13a3 3 0 00-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        <span>{row.member_count} {row.member_count === 1 ? 'member' : 'members'}</span>
                      </div>
                      {row.capacity != null && (
                        <div className="league-card-stat">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          <span>{row.capacity - row.member_count} spots left</span>
                        </div>
                      )}
                      <div className="league-card-stat">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                        <span>View standings</span>
                      </div>
                    </div>

                    {/* Capacity bar for leagues with a member cap */}
                    {row.capacity != null && row.capacity > 0 && (
                      <div className="league-capacity-bar">
                        <div
                          className="league-capacity-fill"
                          style={{ width: `${Math.min(100, (row.member_count / row.capacity) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {canJoin && (
                    <button
                      className="league-card-join-btn"
                      disabled={!hasTeam}
                      title={hasTeam ? undefined : 'Create a Fantasy squad first'}
                      onClick={e => { e.stopPropagation(); void joinPublic(row); }}
                    >
                      Join
                    </button>
                  )}
                </div>
              );
            })}
            {!listRows.length && (
              <div className="empty-state">
                <h3>No leagues found</h3>
                {tab === 'mine' && !hasTeam && (
                  <p>Build your squad to start or join a league.</p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <table className="standings-table">
          <thead>
            <tr><th>Rank</th><th>Team</th><th>Manager</th><th>Points</th></tr>
          </thead>
          <tbody>
            {overall.map(row => (
              <tr key={row.team_id}>
                <td>{row.rank}</td>
                <td>{row.team__name ?? row.team_name}</td>
                <td>{row.manager}</td>
                <td>{row.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── League detail drawer ── */}
      {selected && (
        <Drawer
          title={selected.name}
          subtitle={`${selected.visibility} · ${selected.member_count} members`}
          onClose={() => setSelected(null)}
        >
          <h3>Standings</h3>
          <table className="standings-table">
            <tbody>
              {standings.map(row => (
                <tr key={row.team_id}>
                  <td>{row.rank}</td>
                  <td>{row.team__name ?? row.team_name}</td>
                  <td>{row.manager}</td>
                  <td>{row.total_points}</td>
                </tr>
              ))}
              {!standings.length && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No scores yet</td></tr>
              )}
            </tbody>
          </table>

          <h3>Members</h3>
          <ul className="rules-list">
            {members.map(row => (
              <li key={row.team_id}>
                <span>{row.fantasy_team} · {row.manager}</span>
                <strong>{row.total_points}</strong>
              </li>
            ))}
          </ul>

          {/* Invite code — only the league owner receives join_code from the API */}
          {selected.join_code && (
            <div className="league-invite-block">
              <p className="league-invite-label">Invite code — share with friends</p>
              <div className="invite-code" aria-label="League invite code">
                {selected.join_code}
              </div>
              <div className="drawer-actions">
                <button
                  className={`btn btn-secondary league-copy-btn${copied ? ' btn-copied' : ''}`}
                  onClick={() => copyCode(selected.join_code!)}
                >
                  {copied ? '✓ Copied!' : 'Copy invite code'}
                </button>
              </div>
            </div>
          )}

          <div className="drawer-actions">
            <button className="btn btn-danger" onClick={() => void leave()}>
              Leave league
            </button>
          </div>
        </Drawer>
      )}

      {/* ── Create league modal ── */}
      {createOpen && (
        <Modal
          title="Create league"
          onClose={() => { setCreateOpen(false); setName(''); }}
          footer={
            <button
              className="btn btn-primary modal-submit-btn"
              disabled={!name.trim()}
              onClick={() => void create()}
            >
              Create league
            </button>
          }
        >
          <div className="modal-field-group">
            <label className="modal-field-label" htmlFor="league-name-input">
              League name
            </label>
            <input
              id="league-name-input"
              className="modal-field-input"
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Invincibles"
            />
          </div>

          <div className="modal-field-group">
            <span className="modal-field-label">Visibility</span>
            <div className="modal-vis-picker">
              <button
                type="button"
                className={`modal-vis-option ${visibility === 'PRIVATE' ? 'modal-vis-active' : ''}`}
                onClick={() => setVisibility('PRIVATE')}
              >
                <span className="modal-vis-icon">🔒</span>
                <span className="modal-vis-text">
                  <strong>Private</strong>
                  <span>Invite only — share a code</span>
                </span>
                {visibility === 'PRIVATE' && (
                  <span className="modal-vis-check">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`modal-vis-option ${visibility === 'PUBLIC' ? 'modal-vis-active' : ''}`}
                onClick={() => setVisibility('PUBLIC')}
              >
                <span className="modal-vis-icon">🌐</span>
                <span className="modal-vis-text">
                  <strong>Public</strong>
                  <span>Anyone can join</span>
                </span>
                {visibility === 'PUBLIC' && (
                  <span className="modal-vis-check">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Join by code modal ── */}
      {joinOpen && (
        <Modal
          title="Join a private league"
          onClose={() => { setJoinOpen(false); setCode(''); setJoinError(''); }}
          footer={
            <button
              className="btn btn-primary modal-submit-btn"
              disabled={!code.trim()}
              onClick={() => void joinByCode()}
            >
              Join league
            </button>
          }
        >
          <div className="modal-join-icon-row">
            <span className="modal-join-icon">🏆</span>
            <p className="modal-join-hint">Enter the invite code shared by the league owner.</p>
          </div>

          <div className="modal-field-group">
            <label className="modal-field-label" htmlFor="league-code-input">
              Invite code
            </label>
            <input
              id="league-code-input"
              className="modal-field-input modal-code-input"
              value={code}
              autoFocus
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
            />
          </div>

          {joinError && (
            <p className="modal-field-error" role="alert">
              {joinError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
