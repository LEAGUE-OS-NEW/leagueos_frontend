import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Competition, FantasyTeam, Player, SquadSlot, Toast } from './types';
import { competitionFromApi, playerFromApi, teamFromApi } from './data';
import {
  createFantasyTeam, fetchFantasyCompetitions, fetchFantasyPlayers,
  fetchMyLeagues, fetchMyTeams, fetchTeamPoints, joinFantasyLeagueByCode,
  makeFantasyTransfer, updateFantasyLineup, type FantasyTeamSelection,
} from '../../../services/fantasyService';
import { extractApiError } from '../../../services/apiUtils';
import { fetchFanNotificationSummary, markFanNotificationRead, type NotificationItem } from '../../../services/fanNotificationsServices';
import FantasyHub from './sections/FantasyHub';
import CompetitionDetail from './sections/CompetitionDetail';
import SquadBuilder from './sections/SquadBuilder';
import MyTeam from './sections/MyTeam';
import Transfers from './sections/Transfers';
import Leagues from './sections/Leagues';
import { BellIcon, TrophyIcon } from './sections/shared';
import { Drawer } from './sections/Modal';
import Sidebar from '../../../components/fan/Sidebar';
import Footer from '../../../components/landing/Footer';
import { SPORT_META } from './SportMeta';
import './FantasyCompetitions.css';

type Screen = 'hub' | 'competition' | 'build' | 'team' | 'transfers' | 'leagues';

function selections(
  squad: SquadSlot[],
  captain: string | null,
  vice: string | null,
): FantasyTeamSelection[] {
  return squad.map(s => ({
    fantasy_player: s.playerId,
    is_starter: s.isStarter,
    bench_order: s.isStarter ? null : (s.benchOrder ?? 0),
    is_captain: s.playerId === captain,
    is_vice_captain: s.playerId === vice,
  }));
}

export default function FantasyCompetitions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('hub');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [active, setActive] = useState<Competition | null>(null);
  const [teams, setTeams] = useState<Record<string, FantasyTeam>>({});
  const [players, setPlayers] = useState<Record<string, Player[]>>({});
  const [leagueCount, setLeagueCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Pending invite code — set when the user arrives from:
   *   a) LeagueInviteLanding (?pendingCode=XYZ) after the backend said "no team"
   *   b) Typing a code into Leagues and finding they need a team first
   *
   * Cleared after a successful auto-join following team creation.
   */
  const [pendingCode, setPendingCode] = useState<string>(() =>
    (searchParams.get('pendingCode') ?? '').trim().toUpperCase(),
  );

  // Track whether the URL-param deep-link has been applied on first load.
  const deepLinkApplied = useRef(false);

  // ── Toasts ─────────────────────────────────────────────────────────────────
  function toast(message: string, tone: Toast['tone'] = 'success') {
    setToasts(t => [...t, { id: String(Date.now()), message, tone }]);
  }

  // ── Data loading ────────────────────────────────────────────────────────────
  // load is also called imperatively (refresh button, after mutations) so it
  // stays as a useCallback. The initial-load effect invokes it via an async
  // IIFE so the React Compiler can track the async boundary.
  const load = useCallback(async (): Promise<Competition[]> => {
    setLoading(true);
    setError('');
    let cs: Competition[] = [];
    try {
      const [apiCompetitions, apiTeams, myLeagues] = await Promise.all([
        fetchFantasyCompetitions(),
        fetchMyTeams(),
        fetchMyLeagues(),
      ]);
      cs = apiCompetitions.map(competitionFromApi);
      setCompetitions(cs);
      setLeagueCount(myLeagues.length);
      const mapped: Record<string, FantasyTeam> = {};
      await Promise.all(
        apiTeams.map(async t => {
          const c = cs.find(x => x.id === t.fantasy_competition);
          if (c) mapped[c.id] = teamFromApi(t, c, await fetchTeamPoints(t.id));
        }),
      );
      setTeams(mapped);
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setLoading(false);
    }
    // Non-critical — notifications never crash the page
    fetchFanNotificationSummary()
      .then(s => setNotifications(s.notifications.filter(n => n.eventType?.startsWith('FANTASY_'))))
      .catch(() => {});
    return cs;
  }, []);

  // Initial load — then apply URL deep-link params once data is ready.
  // The async IIFE lets the React Compiler see the await boundary so it does
  // not flag setState calls inside the awaited callbacks as synchronous.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cs = await load();
      if (cancelled) return;
      if (deepLinkApplied.current) return;
      deepLinkApplied.current = true;

      const paramCompId = searchParams.get('competitionId') ?? '';
      const paramScreen = searchParams.get('screen') ?? '';
      const paramCode   = (searchParams.get('pendingCode') ?? '').trim().toUpperCase();

      // Clean URL params — we've consumed them, no need to keep them.
      // Use replace so the back button doesn't loop back to the param URL.
      if (paramCompId || paramScreen || paramCode) {
        setSearchParams({}, { replace: true });
      }

      // Determine target competition: from ?competitionId= or from the code's
      // competition (we don't know that yet without a league lookup, so for
      // pendingCode we land on the hub and let the user pick).
      const targetComp = paramCompId ? cs.find(c => c.id === paramCompId) : null;

      if (targetComp) {
        // Deep-link to a specific competition + screen (e.g. after a successful
        // join from LeagueInviteLanding → screen=leagues).
        void openCompetition(
          targetComp,
          (paramScreen as Screen) || 'leagues',
        );
      }
      // pendingCode is already in state from the useState initialiser above.
      // When the user picks a competition and goes to leagues, Leagues.tsx will
      // auto-open the join modal with the pre-filled code.
    })().catch(() => {});
    return () => { cancelled = true; };
  // load is stable (useCallback []). openCompetition and setSearchParams are
  // stable refs. searchParams is intentionally read once at mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // Silent 60-second background refresh
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const [apiCompetitions, apiTeams, myLeagues] = await Promise.all([
          fetchFantasyCompetitions(),
          fetchMyTeams(),
          fetchMyLeagues(),
        ]);
        const cs = apiCompetitions.map(competitionFromApi);
        setCompetitions(cs);
        setLeagueCount(myLeagues.length);
        if (active) {
          const rows = (await fetchFantasyPlayers(active.id)).map(p => playerFromApi(p, active.sport));
          setPlayers(prev => ({ ...prev, [active.id]: rows }));
        }
        const mapped: Record<string, FantasyTeam> = {};
        await Promise.all(
          apiTeams.map(async t => {
            const c = cs.find(x => x.id === t.fantasy_competition);
            if (c) mapped[c.id] = teamFromApi(t, c, await fetchTeamPoints(t.id));
          }),
        );
        setTeams(mapped);
      } catch { /* silent — background refresh */ }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [active]);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  async function ensurePlayers(c: Competition) {
    const rows = (await fetchFantasyPlayers(c.id)).map(p => playerFromApi(p, c.sport));
    setPlayers(prev => ({ ...prev, [c.id]: rows }));
    return rows;
  }

  async function openCompetition(c: Competition, next: Screen = 'competition') {
    setActive(c);
    try {
      await ensurePlayers(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load players.');
      return;
    }
    setScreen(next);
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  /**
   * Called by SquadBuilder when the user confirms their squad.
   * If a pendingCode is set, automatically re-tries the league join now that
   * the team exists — the backend will accept it this time.
   */
  async function submitted(
    c: Competition,
    result: { squad: SquadSlot[]; captainId: string; viceCaptainId: string; teamName: string },
  ) {
    try {
      const row = await createFantasyTeam({
        name: result.teamName,
        fantasy_competition: c.id,
        selections: selections(result.squad, result.captainId, result.viceCaptainId),
      });
      setTeams(prev => ({ ...prev, [c.id]: teamFromApi(row, c) }));
      toast(`${result.teamName} saved.`);

      // Auto-join the pending private league now that the team exists.
      if (pendingCode) {
        const codeToJoin = pendingCode;
        setPendingCode('');
        try {
          await joinFantasyLeagueByCode(codeToJoin);
          toast('Joined the private league — check your Leagues tab.');
          setScreen('leagues');
        } catch (joinErr) {
          // Surface a specific error; don't block the team-saved success.
          const { message } = extractApiError(joinErr);
          toast(`Team saved, but could not join league: ${message}`, 'warning');
          setScreen('team');
        }
      } else {
        setScreen('team');
      }
    } catch (e) {
      toast(extractApiError(e).message, 'warning');
    }
  }

  async function saveSquad(
    c: Competition,
    squad: SquadSlot[],
    captain: string | null,
    vice: string | null,
  ) {
    const team = teams[c.id];
    const row = await updateFantasyLineup(team.id, selections(squad, captain, vice));
    setTeams(prev => ({ ...prev, [c.id]: teamFromApi(row, c) }));
    toast('Lineup saved.');
  }

  async function transfer(c: Competition, outId: string, inId: string) {
    const team = teams[c.id];
    const gameweek = c.api.current_gameweek?.id;
    if (!gameweek) throw new Error('No current gameweek is available.');
    const row = await makeFantasyTransfer(team.id, { gameweek, player_out: outId, player_in: inId });
    const scores = await fetchTeamPoints(team.id);
    setTeams(prev => ({ ...prev, [c.id]: teamFromApi(row, c, scores) }));
    toast('Transfer confirmed.');
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeTeam = active ? teams[active.id] : undefined;
  const pool = active ? (players[active.id] ?? []) : [];

  // The Leagues tab is accessible whenever a competition is active — regardless
  // of whether a team exists — so a user arriving via an invite code can reach
  // the join modal even before building their squad.
  const leaguesTabEnabled = !!active;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="fantasy-content">

        <header className="topbar">
          <nav className="topnav">
            <button
              className={screen === 'hub' ? 'active' : ''}
              onClick={() => { setScreen('hub'); setActive(null); }}
            >
              Fantasy Hub
            </button>
            <button disabled={!activeTeam} onClick={() => setScreen('team')}>
              My Team
            </button>
            <button disabled={!activeTeam} onClick={() => setScreen('transfers')}>
              Transfers
            </button>
            {/* Leagues tab enabled when any competition is active so users
                arriving from an invite link can join before they have a team */}
            <button
              disabled={!leaguesTabEnabled}
              className={screen === 'leagues' ? 'active' : ''}
              onClick={() => setScreen('leagues')}
            >
              Leagues
            </button>
          </nav>
          <div className="topbar-right">
            <button
              className="icon-btn"
              aria-label="Refresh Fantasy data"
              title="Refresh"
              onClick={() => void load()}
              disabled={loading}
            >
              ↺
            </button>
            <button
              className="icon-btn"
              aria-label="Fantasy notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <BellIcon />
              {notifications.filter(n => !n.isRead).length || ''}
            </button>
            <div className="user-chip">
              <TrophyIcon size={14} />Fantasy Manager
            </div>
          </div>
        </header>

        <main className="app-main">
          {loading && (
            <div className="empty-state"><h3>Loading Fantasy…</h3></div>
          )}
          {error && (
            <div className="empty-state" role="alert">
              <h3>Fantasy unavailable</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={() => void load()}>Try again</button>
            </div>
          )}

          {/* Hub */}
          {!loading && !error && screen === 'hub' && (
            <FantasyHub
              teams={teams}
              competitions={competitions}
              leagueCount={leagueCount}
              onOpenCompetition={c => void openCompetition(c)}
              onManageTeam={c => void openCompetition(c, 'team')}
            />
          )}

          {/* Competition detail */}
          {screen === 'competition' && active && (
            <CompetitionDetail
              competition={active}
              hasTeam={!!activeTeam}
              onBack={() => setScreen('hub')}
              onCreateTeam={() => setScreen('build')}
              onManageTeam={() => setScreen('team')}
            />
          )}

          {/* Squad builder */}
          {screen === 'build' && active && (
            <SquadBuilder
              competition={active}
              players={pool}
              teamName={`My ${SPORT_META[active.sport].label} Team`}
              onCancel={() => setScreen('competition')}
              onSubmitted={r => void submitted(active, r)}
            />
          )}

          {/* My team */}
          {screen === 'team' && active && activeTeam && (
            <MyTeam
              competition={active}
              team={activeTeam}
              players={pool}
              onGoTransfers={() => setScreen('transfers')}
              onSwapLineup={(starter, bench) => {
                const squad = activeTeam.squad.map(s =>
                  s.playerId === starter ? { ...s, isStarter: false }
                  : s.playerId === bench  ? { ...s, isStarter: true }
                  : s,
                );
                void saveSquad(active, squad, activeTeam.captainId, activeTeam.viceCaptainId)
                  .catch(e => toast(extractApiError(e).message, 'warning'));
              }}
              onEditLineup={() => setScreen('build')}
              onChangeCaptain={(captainId, viceId) => {
                void saveSquad(active, activeTeam.squad, captainId, viceId)
                  .catch(e => toast(extractApiError(e).message, 'warning'));
              }}
              onViewFixtures={() => navigate('/fixtures')}
            />
          )}

          {/* Transfers */}
          {screen === 'transfers' && active && activeTeam && (
            <Transfers
              competition={active}
              team={activeTeam}
              players={pool}
              onBack={() => setScreen('team')}
              onConfirm={(o, i) => transfer(active, o, i)}
            />
          )}

          {/* Leagues — rendered whenever a competition is active (team optional).
              The pendingCode flows through as initialCode so the join modal
              auto-opens. onNeedTeam navigates to the squad builder. */}
          {screen === 'leagues' && active && (
            <Leagues
              competition={active}
              team={activeTeam}
              initialCode={pendingCode || undefined}
              onNeedTeam={() => {
                // User clicked "Build my squad" inside Leagues — take them to
                // the competition detail first (so they have full context) then
                // straight to the builder.
                setScreen('build');
              }}
            />
          )}
        </main>

        {/* Notifications drawer */}
        {notificationsOpen && (
          <Drawer
            title="Fantasy notifications"
            subtitle={`${notifications.filter(n => !n.isRead).length} unread`}
            onClose={() => setNotificationsOpen(false)}
          >
            {notifications.length
              ? notifications.map(n => (
                  <button
                    className="league-card"
                    key={n.id}
                    onClick={() =>
                      void markFanNotificationRead(n.id).then(() =>
                        setNotifications(rows =>
                          rows.map(x => x.id === n.id ? { ...x, isRead: true } : x),
                        ),
                      )
                    }
                  >
                    <strong>{n.title}</strong>
                    <span>{n.message}</span>
                  </button>
                ))
              : <p>No Fantasy notifications.</p>
            }
          </Drawer>
        )}

        <div className="toast-stack" aria-live="polite">
          {toasts.map(t => (
            <div className={`toast toast-${t.tone}`} key={t.id}>{t.message}</div>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
