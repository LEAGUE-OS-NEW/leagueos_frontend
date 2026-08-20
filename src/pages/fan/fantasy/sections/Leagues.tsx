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

const NO_TEAM_BACKEND_MSG = 'Invalid invite code or no team for this competition.';

// ── Pending invite codes — persisted in localStorage ──────────────────────────
const PENDING_CODES_KEY = 'leagueos:fantasy:pendingInviteCodes';

function loadPendingCodes(): string[] {
  try { return JSON.parse(localStorage.getItem(PENDING_CODES_KEY) ?? '[]'); }
  catch { return []; }
}
function savePendingCodes(codes: string[]) {
  localStorage.setItem(PENDING_CODES_KEY, JSON.stringify([...new Set(codes)]));
}
function addPendingCode(code: string) {
  const c = code.trim().toUpperCase();
  if (c) savePendingCodes([...loadPendingCodes(), c]);
}
function removePendingCode(code: string) {
  savePendingCodes(loadPendingCodes().filter(c => c !== code.toUpperCase()));
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface InviteEntry {
  code: string;
  /** null = invalid / expired. undefined = not yet resolved. */
  league: FantasyLeague | null | undefined;
}

interface Props {
  competition: Competition;
  team?: FantasyTeam;
  initialCode?: string;
  onNeedTeam?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Leagues({ competition, team, initialCode, onNeedTeam }: Props) {
  const [tab, setTab] = useState<'mine' | 'public' | 'invites' | 'overall'>('mine');
  const [mine, setMine] = useState<FantasyLeague[]>([]);
  const [publicRows, setPublic] = useState<FantasyLeague[]>([]);
  const [overall, setOverall] = useState<FantasyStanding[]>([]);

  // Invite codes state
  const [invites, setInvites] = useState<InviteEntry[]>(() => {
    const stored = loadPendingCodes();
    // Absorb initialCode into localStorage immediately
    if (initialCode) {
      const c = initialCode.trim().toUpperCase();
      if (c && !stored.includes(c)) {
        const merged = [...stored, c];
        savePendingCodes(merged);
        return merged.map(code => ({ code, league: undefined }));
      }
    }
    return stored.map(code => ({ code, league: undefined }));
  });

  const [selected, setSelected] = useState<FantasyLeague | null>(null);
  const [members, setMembers] = useState<FantasyLeagueMember[]>([]);
  const [standings, setStandings] = useState<FantasyStanding[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(!!initialCode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [code, setCode] = useState(() => initialCode ?? '');

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [error, setError] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyLinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────────

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
      try { await reload(); }
      catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load leagues.'); }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  // Resolve unresolved invite codes by peeking via join_by_code.
  // If join succeeds the user is now a member — we remove the code and reload.
  // If "no team" error we record a preview stub. Otherwise mark invalid.
  useEffect(() => {
    const unresolved = invites.filter(e => e.league === undefined);
    if (!unresolved.length) return;
    let cancelled = false;

    (async () => {
      const updates: Record<string, FantasyLeague | null> = {};
      await Promise.all(unresolved.map(async ({ code: c }) => {
        try {
          const league = await joinFantasyLeagueByCode(c);
          if (cancelled) return;
          // Successfully joined — remove from pending list and reload
          removePendingCode(c);
          updates[c] = league;
        } catch (err: unknown) {
          if (cancelled) return;
          const msg = extractApiError(err).message;
          if (msg === NO_TEAM_BACKEND_MSG) {
            // Valid code; user just needs a team first — show a preview stub
            updates[c] = {
              id: '',
              name: `Private league (code: ${c})`,
              fantasy_competition: competition.id,
              visibility: 'PRIVATE' as const,
              description: '',
              capacity: null,
              member_count: 0,
            };
          } else {
            updates[c] = null; // invalid / expired / full
          }
        }
      }));

      if (cancelled) return;

      setInvites(prev =>
        prev
          .map(e => e.code in updates ? { ...e, league: updates[e.code] } : e)
          // Remove codes that resolved to a successful join
          .filter(e => {
            if (e.code in updates && updates[e.code] !== null && updates[e.code]?.id) {
              return false; // joined — drop from invites list
            }
            return true;
          }),
      );

      // Sync localStorage
      const remaining = invites
        .filter(e => !(e.code in updates && updates[e.code] !== null && updates[e.code]?.id))
        .map(e => e.code);
      savePendingCodes(remaining);

      await reload();
    })().catch(() => {});

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invites.filter(e => e.league === undefined).length, competition.id]);

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

  // ── Mutations ─────────────────────────────────────────────────────────────────

  async function create() {
    setError('');
    try {
      const payload: Parameters<typeof createFantasyLeague>[0] = {
        fantasy_competition: competition.id, name, visibility,
      };
      if (description.trim()) payload.description = description.trim();
      if (capacity.trim()) {
        const cap = parseInt(capacity, 10);
        if (!isNaN(cap) && cap >= 2) payload.capacity = cap;
      }
      const row = await createFantasyLeague(payload);
      setCreateOpen(false);
      setName(''); setDescription(''); setCapacity('');
      await reload();
      await open(row);
    } catch (e) {
      setError(extractApiError(e).message);
    }
  }

  async function joinByCode() {
    setJoinError('');
    try {
      const cleaned = code.trim().toUpperCase();
      const row = await joinFantasyLeagueByCode(cleaned);
      setJoinOpen(false);
      setCode('');
      // Remove from invites if it was there
      removePendingCode(cleaned);
      setInvites(prev => prev.filter(e => e.code !== cleaned));
      await reload();
      await open(row);
    } catch (e) {
      const { message } = extractApiError(e);
      if (message === NO_TEAM_BACKEND_MSG) {
        setJoinOpen(false);
        const cleaned = code.trim().toUpperCase();
        // Save to invites so it shows in the Invites tab
        addPendingCode(cleaned);
        setInvites(prev =>
          prev.some(e => e.code === cleaned)
            ? prev
            : [...prev, { code: cleaned, league: {
                id: '', name: `Private league (code: ${cleaned})`,
                fantasy_competition: competition.id,
                visibility: 'PRIVATE' as const,
                description: '', capacity: null, member_count: 0,
              }}],
        );
        setCode('');
        if (onNeedTeam) onNeedTeam();
        else setError('You need a Fantasy team for this competition first. Create your squad, then check the Invites tab.');
      } else {
        setJoinError(message);
      }
    }
  }

  async function joinFromInvites(entry: InviteEntry) {
    setError('');
    try {
      const row = await joinFantasyLeagueByCode(entry.code);
      removePendingCode(entry.code);
      setInvites(prev => prev.filter(e => e.code !== entry.code));
      await reload();
      await open(row);
      setTab('mine');
    } catch (e) {
      const { message } = extractApiError(e);
      if (message === NO_TEAM_BACKEND_MSG) {
        if (onNeedTeam) onNeedTeam();
        else setError('Create your Fantasy squad for this competition first.');
      } else {
        setError(message);
      }
    }
  }

  function dismissInvite(entry: InviteEntry) {
    removePendingCode(entry.code);
    setInvites(prev => prev.filter(e => e.code !== entry.code));
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

  // ── Share helpers ─────────────────────────────────────────────────────────────

  function copyCode(inviteCode: string) {
    void navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  function inviteLink(inviteCode: string) {
    return `${window.location.origin}/fan/fantasy/join?code=${encodeURIComponent(inviteCode)}`;
  }

  function copyInviteLink(inviteCode: string) {
    void navigator.clipboard.writeText(inviteLink(inviteCode)).then(() => {
      setCopiedLink(true);
      if (copyLinkTimer.current) clearTimeout(copyLinkTimer.current);
      copyLinkTimer.current = setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  function shareOnWhatsApp(league: FantasyLeague) {
    if (!league.join_code) return;
    const url = inviteLink(league.join_code);
    const text = `Join my Fantasy league "${league.name}" on League OS!\nInvite code: *${league.join_code}*\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function shareNative(league: FantasyLeague) {
    if (!league.join_code) return;
    void navigator.share({
      title: `Join my Fantasy league: ${league.name}`,
      text: `Use invite code ${league.join_code} or open this link to join my league.`,
      url: inviteLink(league.join_code),
    }).catch(() => {});
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const hasTeam = !!team;

  // Active invites = unresolved or stubbed (not invalid, not already joined)
  const activeInvites = invites.filter(e => {
    if (e.league === null) return false;                              // invalid
    if (e.league?.id && mine.some(m => m.id === e.league!.id)) return false; // already joined
    return true;
  });

  const listRows = (tab === 'mine' ? mine : publicRows);

  // ── League card (reused across mine / public tabs) ────────────────────────────

  function LeagueCard({ row }: { row: FantasyLeague }) {
    const isMember = mine.some(x => x.id === row.id);
    const canJoin = tab === 'public' && !isMember;
    return (
      <div className="league-card-v2">
        <span className={`league-card-accent ${row.visibility === 'PRIVATE' ? 'accent-purple' : 'accent-blue'}`} />
        <div className="league-card-body" onClick={() => void open(row)}>
          <div className="league-card-top">
            <div className="league-card-title-group">
              <strong className="league-card-name">{row.name}</strong>
              <span className={`league-card-vis-badge ${row.visibility === 'PRIVATE' ? 'vis-private' : 'vis-public'}`}>
                {row.visibility === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
              </span>
              {isMember && <span className="league-card-member-badge">✓ Joined</span>}
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
          {row.capacity != null && row.capacity > 0 && (
            <div className="league-capacity-bar">
              <div className="league-capacity-fill" style={{ width: `${Math.min(100, (row.member_count / row.capacity) * 100)}%` }} />
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
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="leagues">

      {/* No-team banner */}
      {!hasTeam && (
        <div className="leagues-no-team-banner" role="note">
          <div>
            <strong>You don't have a squad for this competition yet.</strong>
            <p>You can browse and use an invite code, but you'll need to create your team before your entry appears in the standings.</p>
          </div>
          {onNeedTeam && (
            <button className="btn btn-primary" onClick={onNeedTeam}>Build my squad</button>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="leagues-tabs">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My Leagues
        </button>
        <button className={tab === 'public' ? 'active' : ''} onClick={() => setTab('public')}>
          Public Leagues
        </button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}>
          Invites
          {activeInvites.length > 0 && (
            <span className="leagues-tab-badge">{activeInvites.length}</span>
          )}
        </button>
        <button className={tab === 'overall' ? 'active' : ''} onClick={() => setTab('overall')}>
          Overall Leaderboard
        </button>
      </div>

      {error && <p className="transfer-cost-warning" role="alert">{error}</p>}

      {/* ── Invites tab ── */}
      {tab === 'invites' && (
        <div className="leagues-invites">
          <div className="sb-summary-bar">
            <span>Leagues you've been invited to join.</span>
            <button className="btn btn-secondary" onClick={() => setJoinOpen(true)}>
              Enter invite code
            </button>
          </div>

          {activeInvites.length === 0 ? (
            <div className="empty-state">
              <h3>No pending invites</h3>
              <p>Ask a friend to share their private league invite code or link.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setJoinOpen(true)}>
                Enter invite code
              </button>
            </div>
          ) : (
            <div className="league-card-list">
              {activeInvites.map(entry => {
                const preview = entry.league;
                const isResolving = preview === undefined;
                const isStub = preview && !preview.id; // "no team" stub
                return (
                  <div className="league-invite-card-row" key={entry.code}>
                    <span className="league-card-accent accent-purple" />
                    <div className="league-invite-card-body">
                      <div className="league-invite-card-meta">
                        <div className="league-invite-card-title">
                          {isResolving ? (
                            <span className="league-invite-resolving">Checking invite…</span>
                          ) : (
                            <>
                              <strong>{preview?.name ?? `League invite`}</strong>
                              <span className="league-card-vis-badge vis-private">🔒 Private</span>
                              {isStub && (
                                <span className="league-invite-needs-team-badge">Needs squad</span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="invite-code-inline">Code: {entry.code}</span>
                        {preview && !isStub && preview.member_count > 0 && (
                          <span className="league-card-stat" style={{ marginTop: 4 }}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M1 13c0-2.761 2.239-5 5-5h0a5 5 0 015 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}
                          </span>
                        )}
                      </div>
                      <div className="league-invite-card-actions">
                        {isStub ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              if (onNeedTeam) onNeedTeam();
                              else setError('Create your squad for this competition first.');
                            }}
                          >
                            Build squad first
                          </button>
                        ) : !isResolving ? (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!hasTeam}
                            title={hasTeam ? undefined : 'Build your squad first'}
                            onClick={() => void joinFromInvites(entry)}
                          >
                            Join League
                          </button>
                        ) : null}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => dismissInvite(entry)}
                          title="Remove this invite"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show invalid/expired codes separately */}
          {invites.some(e => e.league === null) && (
            <div className="leagues-invalid-invites">
              <p className="league-invite-label">Invalid or expired invites</p>
              {invites.filter(e => e.league === null).map(entry => (
                <div className="league-invite-invalid-row" key={entry.code}>
                  <span className="invite-code-inline">{entry.code}</span>
                  <span className="league-invite-invalid-msg">Invite not valid</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => dismissInvite(entry)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mine & Public tabs ── */}
      {(tab === 'mine' || tab === 'public') && (
        <>
          <div className="sb-summary-bar">
            <span>Compete with friends, clubs and the League OS community.</span>
            <div className="sb-actions" style={{ margin: 0 }}>
              <button className="btn btn-secondary" onClick={() => setJoinOpen(true)}>
                Join by code
              </button>
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
            {listRows.map(row => <LeagueCard key={row.id} row={row} />)}
            {!listRows.length && (
              <div className="empty-state">
                <h3>No leagues found</h3>
                {tab === 'mine' && !hasTeam && <p>Build your squad to start or join a league.</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Overall Leaderboard tab ── */}
      {tab === 'overall' && (
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

          {/* ── Share block — only shown to the league owner (has join_code) ── */}
          {selected.join_code && (
            <div className="league-invite-block">
              <p className="league-invite-label">Invite code — share with friends</p>
              <div className="invite-code" aria-label="League invite code">
                {selected.join_code}
              </div>

              {/* Share buttons */}
              <div className="league-share-grid">
                {/* Copy invite code */}
                <button
                  className={`btn btn-secondary league-share-btn${copied ? ' btn-copied' : ''}`}
                  onClick={() => copyCode(selected.join_code!)}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {copied ? '✓ Copied!' : 'Copy code'}
                </button>

                {/* Copy invite link */}
                <button
                  className={`btn btn-secondary league-share-btn${copiedLink ? ' btn-copied' : ''}`}
                  onClick={() => copyInviteLink(selected.join_code!)}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M6.5 9.5a3.536 3.536 0 005 0l2-2a3.536 3.536 0 00-5-5L7.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M9.5 6.5a3.536 3.536 0 00-5 0l-2 2a3.536 3.536 0 005 5l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {copiedLink ? '✓ Link copied!' : 'Copy link'}
                </button>

                {/* WhatsApp */}
                <button
                  className="btn league-share-btn league-share-whatsapp"
                  onClick={() => shareOnWhatsApp(selected)}
                >
                  {/* WhatsApp logo mark */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>

                {/* Native share (mobile / supported browsers) */}
                {typeof navigator.share === 'function' && (
                  <button
                    className="btn btn-primary league-share-btn"
                    onClick={() => shareNative(selected)}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="13" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="3" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="13" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M4.5 7.25l7-3.5M4.5 8.75l7 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Share
                  </button>
                )}
              </div>

              <p className="league-invite-url-hint">{inviteLink(selected.join_code)}</p>
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
          onClose={() => { setCreateOpen(false); setName(''); setDescription(''); setCapacity(''); }}
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
            <label className="modal-field-label" htmlFor="league-name-input">League name</label>
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
            <label className="modal-field-label" htmlFor="league-desc-input">
              Description <span className="modal-field-optional">(optional)</span>
            </label>
            <input
              id="league-desc-input"
              className="modal-field-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. For the Friday five-a-side crew"
            />
          </div>

          <div className="modal-field-group">
            <label className="modal-field-label" htmlFor="league-capacity-input">
              Max members <span className="modal-field-optional">(optional — leave blank for unlimited)</span>
            </label>
            <input
              id="league-capacity-input"
              className="modal-field-input"
              type="number"
              min="2"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              placeholder="e.g. 20"
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
            <label className="modal-field-label" htmlFor="league-code-input">Invite code</label>
            <input
              id="league-code-input"
              className="modal-field-input modal-code-input"
              value={code}
              autoFocus
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC12345"
            />
          </div>
          {joinError && <p className="modal-field-error" role="alert">{joinError}</p>}
        </Modal>
      )}
    </div>
  );
}
