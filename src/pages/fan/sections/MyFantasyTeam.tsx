import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import {
  fetchMyTeams,
  fetchTeamPoints,
  fetchMyLeagues,
  fetchFantasyCompetitions,
  type FantasyTeam,
  type FantasyTeamScore,
  type FantasyLeague,
  type FantasyCompetition,
} from '../../../services/fantasyService';
import './MyFantasyTeam.css';

// Fallback jersey colour used when no club colour is available from the API.
// The full fantasy flow (FantasyCompetitions.tsx) hardcodes the same value
// in playerFromApi: clubColor: '#6c5ce7'.
const FALLBACK_JERSEY = '#6c5ce7';

interface WidgetPlayer {
  id: string;
  name: string;
  points: string; // "12 PTS" or "Awaiting" — display-ready string
  jerseyColor: string;
}

interface WidgetData {
  teamName: string;
  leagueName: string; // empty string when no league found
  totalPoints: number;
  gameweek: string;   // e.g. "Gameweek 3" or "—" when not available
  // Starters grouped by position for the pitch grid.
  // Each inner array is one row (GK row, DEF row, MID row, FWD row).
  rows: WidgetPlayer[][];
}

// ── Position ordering for the pitch ─────────────────────────────────
const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD', 'PG', 'SG', 'SF', 'PF', 'C', 'FR', 'LK', 'BR', 'HB', 'CT', 'B3'];

function groupByPosition(starters: WidgetPlayer[], positionMap: Map<string, string>): WidgetPlayer[][] {
  // Build position → players map
  const byPos = new Map<string, WidgetPlayer[]>();
  for (const p of starters) {
    const pos = positionMap.get(p.id) ?? 'UNK';
    const bucket = byPos.get(pos) ?? [];
    bucket.push(p);
    byPos.set(pos, bucket);
  }
  // Emit rows in position order, skipping empty buckets
  const rows: WidgetPlayer[][] = [];
  for (const pos of POSITION_ORDER) {
    const bucket = byPos.get(pos);
    if (bucket && bucket.length > 0) rows.push(bucket);
  }
  // Any positions not in POSITION_ORDER land in a final catch-all row
  const known = new Set(POSITION_ORDER);
  const extras: WidgetPlayer[] = [];
  for (const [pos, bucket] of byPos) {
    if (!known.has(pos)) extras.push(...bucket);
  }
  if (extras.length) rows.push(extras);
  return rows;
}

// ── Data assembly ────────────────────────────────────────────────────

function buildWidgetData(
  apiTeam: FantasyTeam,
  scores: FantasyTeamScore[],
  leagues: FantasyLeague[],
  competitions: FantasyCompetition[],
): WidgetData {
  // Total points — sum all gameweek scores
  const totalPoints = scores.reduce((sum, s) => sum + Number(s.total_points), 0);

  // Latest score for per-player breakdown (may be undefined before first GW)
  const latest = scores.at(-1);

  // Score breakdown — only available when gameweek is finalized and backend
  // returns the object shape (not an array)
  const breakdownPlayers =
    latest &&
    !Array.isArray(latest.breakdown) &&
    Array.isArray(latest.breakdown?.players)
      ? latest.breakdown.players
      : [];

  // Build a map: fantasy_player_id → display-ready points string
  const pointsByPlayerId = new Map<string, string>();
  for (const row of breakdownPlayers) {
    pointsByPlayerId.set(
      row.player_id,
      row.statistics_available ? `${Number(row.final_points)} PTS` : 'Awaiting',
    );
  }

  // Build a map: fantasy_player_id → position (from selections)
  const positionMap = new Map<string, string>();
  for (const sel of apiTeam.selections) {
    const pos =
      (sel.fantasy_player_detail?.position ?? '').toUpperCase() || 'UNK';
    positionMap.set(sel.fantasy_player, pos);
  }

  // Starters only
  const starterSelections = apiTeam.selections.filter((s) => s.is_starter);

  const starters: WidgetPlayer[] = starterSelections.map((sel) => {
    const detail = sel.fantasy_player_detail;
    // Last name or full name — keep it short for the pitch widget
    const rawName = detail?.name ?? detail?.player_name ?? sel.fantasy_player;
    const name = rawName.split(' ').at(-1) ?? rawName;
    const pts = pointsByPlayerId.get(sel.fantasy_player) ?? '—';
    return {
      id: sel.fantasy_player,
      name,
      points: pts,
      jerseyColor: FALLBACK_JERSEY,
    };
  });

  const rows = groupByPosition(starters, positionMap);

  // League name — first league whose competition matches this team
  const league = leagues.find(
    (l) => l.fantasy_competition === apiTeam.fantasy_competition,
  );
  const leagueName = league?.name ?? '';

  // Gameweek label — from the matching competition's current gameweek
  const competition = competitions.find(
    (c) => c.id === apiTeam.fantasy_competition,
  );
  const gwName = competition?.current_gameweek?.name;
  const gwNumber = competition?.current_gameweek?.number;
  const gameweek = gwName ?? (gwNumber != null ? `Gameweek ${gwNumber}` : '—');

  return {
    teamName: apiTeam.name,
    leagueName,
    totalPoints,
    gameweek,
    rows,
  };
}

// ── Jersey component ─────────────────────────────────────────────────

function Jersey({ color }: { color: string }) {
  return (
    <span className="jersey" aria-hidden="true">
      <span className="jersey-sleeve jersey-sleeve-left" style={{ backgroundColor: color }} />
      <span className="jersey-sleeve jersey-sleeve-right" style={{ backgroundColor: color }} />
      <span className="jersey-body" style={{ backgroundColor: color }} />
      <span className="jersey-collar" />
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────

function MyFantasyTeam() {
  const [widget, setWidget] = useState<WidgetData | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    setNoTeam(false);
    try {
      // Fetch teams first — if empty there is nothing to show
      const teams = await fetchMyTeams();
      if (teams.length === 0) {
        setNoTeam(true);
        return;
      }

      // Use the first team (most recently active). The full Fantasy flow
      // lets the fan pick between multiple teams; the dashboard widget
      // surfaces a summary of the first one.
      const apiTeam = teams[0];

      // Parallel fetch: points, leagues, competitions
      const [scores, leagues, competitions] = await Promise.all([
        fetchTeamPoints(apiTeam.id),
        fetchMyLeagues(),
        fetchFantasyCompetitions(),
      ]);

      setWidget(buildWidgetData(apiTeam, scores, leagues, competitions));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your fantasy team.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // run once on mount — load is defined inside the component but is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="my-fantasy-team dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">My Fantasy Team</h2>
        <Link to="/fan/fantasy" className="dashboard-card-link">
          View team
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={4} />
      ) : error ? (
        <DashboardNotice
          tone="error"
          title="Couldn't load your fantasy team"
          message={error}
          onRetry={() => void load()}
        />
      ) : noTeam ? (
        <DashboardNotice
          tone="empty"
          title="No fantasy team yet"
          message="Join a competition and build your squad to get started."
          actionLabel="Get started"
          actionTo="/fan/fantasy"
        />
      ) : widget ? (
        <>
          <div className="fantasy-header">
            <div className="fantasy-header-team">
              <FiShield className="fantasy-shield-icon" />
              <div>
                <p className="fantasy-team-name">{widget.teamName}</p>
                <p className="fantasy-team-league">
                  {widget.leagueName || 'No league'}
                </p>
              </div>
            </div>
            <div className="fantasy-header-points">
              <p className="fantasy-points-value">
                {widget.totalPoints.toLocaleString()} <span>PTS</span>
              </p>
              {/* Rank is not available from current endpoints — omitted */}
            </div>
          </div>

          {widget.rows.length > 0 ? (
            <div className="fantasy-pitch">
              {widget.rows.map((row, index) => (
                <div className="fantasy-pitch-row" key={index}>
                  {row.map((player) => (
                    <div className="fantasy-player" key={player.id}>
                      <Jersey color={player.jerseyColor} />
                      <span className="fantasy-player-name">{player.name}</span>
                      <span className="fantasy-player-points">{player.points}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '12px 0' }}>
              Squad submitted — points will appear once the gameweek starts.
            </p>
          )}

          <div className="fantasy-footer">
            <span className="fantasy-gameweek">{widget.gameweek}</span>
            <Link to="/fan/fantasy" className="dashboard-card-link">
              View full team
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default MyFantasyTeam;
