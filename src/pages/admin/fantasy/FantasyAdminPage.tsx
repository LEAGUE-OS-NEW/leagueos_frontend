import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import apiClient from '../../../services/apiClient';
import {
  adminCreateCompetition, adminCreateCorrection, adminCreateGameweek, adminCreatePlayer,
  adminCreateScoringRule, adminDeleteCompetition, adminDeletePlayer, adminDeleteScoringRule,
  adminFinalizeGameweek, adminRecalculateGameweek, adminTransitionGameweek,
  adminUpdateCompetition, adminUpdateGameweek, adminUpdatePlayer, adminUpdateScoringRule,
  createCanonicalCompetition, createCanonicalSeason,
  fetchAdminCorrections, fetchAdminFantasyCompetitions, fetchAdminLeagueOverview,
  fetchCanonicalFantasyOptions, fetchCanonicalSports, fetchCompetitionLeaderboard,
  fetchFantasyFixtureCandidates, fetchFantasyGameweeks, fetchFantasyPlayerCandidates,
  fetchFantasyPlayers, fetchFantasyStatisticTypes, fetchGameweekLeaderboard, fetchGameweekPoints,
  fetchLeagueMembers, createMatchPlayerStatistic, fetchMatchPlayerStatistics,
  adminCreateFullPlayer,
 type CanonicalCompetition, type CanonicalSport,
  type FantasyAvailability, type FantasyCompetition, type FantasyPlayer, type FantasyScoringRule, type FantasyStatisticType, type ScoringRuleType,
  type CanonicalFantasyOptions, type FantasyFixture, type FantasyGameweek,
  type FantasyLeagueOverview, type FantasyLeagueMember, type FantasyPlayerCandidate,
  type FantasyStanding, type FantasyTeamScore,
  type CreatedMatchStatistic,
  type AdminCreateFullPlayerPayload,
} from '../../../services/fantasyAdminService';
import { extractApiError } from '../../../services/apiUtils';
import MatchStatisticsReview from './MatchStatisticsReview';
import './FantasyAdminPage.css';

/* ── helpers ─────────────────────────────────────────────── */

type Tab = 'overview'|'competitions'|'players'|'gameweeks'|'scoring'|'corrections'|'leaderboards'|'leagues'|'match-stats';
const AVAILABILITY: FantasyAvailability[] = ['AVAILABLE','DOUBTFUL','INJURED','SUSPENDED','UNAVAILABLE'];

const err = (e: unknown) => {
  const details = extractApiError(e);
  const isAxiosError = e != null && typeof e === 'object' && 'response' in e;
  if (!isAxiosError && e instanceof Error) return e.message;
  const fieldErrors = Object.entries(details.fields)
    .filter(([k]) => !['non_field_errors','detail','message'].includes(k))
    .map(([k, msgs]) => `${k}: ${msgs.join(', ')}`)
    .join(' | ');
  const base = fieldErrors ? `${details.message} — ${fieldErrors}` : details.message;
  // Replace the raw Django uniqueness message with a friendly admin-readable one.
  if (base.includes('must make a unique set') || base.includes('competition, season'))
    return 'A Fantasy Competition already exists for this Competition and Season. Select a different season or use Edit Existing.';
  return base;
};

function safeJson<T>(raw: string): [T, null] | [null, string] {
  try { return [JSON.parse(raw) as T, null]; }
  catch (e) { return [null, e instanceof Error ? e.message : 'Invalid JSON']; }
}

/**
 * Wrap user-entered content with { } to form a complete JSON object string,
 * unless the trimmed value is already wrapped (prevents double-wrapping).
 * An empty string becomes '{}' so safeJson still succeeds for optional fields.
 */
function wrapJsonObject(raw: string): string {
  const t = raw.trim();
  if (t === '' || t === '{}') return '{}';
  if (t.startsWith('{') && t.endsWith('}')) return t;   // already wrapped
  return `{${t}}`;
}

/**
 * Strip the outermost { } from a JSON object string so the textarea shows
 * only the interior content (key-value pairs) without the surrounding braces.
 * If the value is '{}' (empty object) or not wrapped, returns an empty string.
 */
function stripJsonObjectBraces(jsonStr: string): string {
  const t = jsonStr.trim();
  if (t === '{}') return '';
  if (t.startsWith('{') && t.endsWith('}')) {
    // Remove outer braces and re-indent by trimming any leading/trailing whitespace
    return t.slice(1, -1).trim();
  }
  return t;
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
  // Strip outer { } so the textarea shows only the inner key-value content
  position_rules: stripJsonObjectBraces(JSON.stringify(row.position_rules, null, 2)),
  formation_rules: stripJsonObjectBraces(JSON.stringify(row.formation_rules, null, 2)),
  tie_break_rules: JSON.stringify(row.tie_break_rules, null, 2),
  prize_metadata: stripJsonObjectBraces(JSON.stringify(row.prize_metadata, null, 2)),
  gameweek_rules: stripJsonObjectBraces(JSON.stringify(row.gameweek_rules ?? {}, null, 2)),
});

/* ── scoring rule helpers ─────────────────────────────── */

/** Build the conditions object for a scoring rule from form state. */
function buildConditions(
  rt: ScoringRuleType,
  bracketMin: string,
  bracketMax: string,
  perN: string,
  positionPts: Record<string, string>,
): Record<string, unknown> {
  if (rt === 'BRACKET') {
    return {
      min: Number(bracketMin),
      max: bracketMax.trim() === '' ? null : Number(bracketMax),
    };
  }
  if (rt === 'PER_N') {
    return { per_n: Number(perN) };
  }
  if (rt === 'POSITION') {
    const positions: Record<string, number> = {};
    for (const [pos, pts] of Object.entries(positionPts)) {
      positions[pos] = Number(pts);
    }
    return { positions };
  }
  // PER_UNIT and FLAT: empty conditions
  return {};
}

/** Validate create/edit form conditions before submitting. Returns error string or null. */
function validateConditions(
  rt: ScoringRuleType,
  bracketMin: string,
  bracketMax: string,
  perN: string,
  positionPts: Record<string, string>,
): string | null {
  if (rt === 'BRACKET') {
    const min = Number(bracketMin);
    if (bracketMin.trim() === '' || isNaN(min) || min < 0)
      return 'Minimum is required and must be ≥ 0.';
    if (bracketMax.trim() !== '') {
      const max = Number(bracketMax);
      if (isNaN(max)) return 'Maximum must be a number or left empty for no upper bound.';
      if (max <= min) return 'Maximum must be greater than minimum.';
    }
  }
  if (rt === 'PER_N') {
    const n = Number(perN);
    if (perN.trim() === '' || isNaN(n) || n < 1) return 'N must be a positive integer (≥ 1).';
  }
  if (rt === 'POSITION') {
    const keys = Object.keys(positionPts);
    if (!keys.length) return 'At least one position must have a points value.';
    for (const [pos, pts] of Object.entries(positionPts)) {
      if (pts.trim() === '' || isNaN(Number(pts)))
        return `Points for position "${pos}" must be a number.`;
    }
  }
  return null;
}

/** Produce a human-readable summary of a scoring rule for the table. */
function describeRule(rule: FantasyScoringRule): string {
  const rt = rule.rule_type ?? 'PER_UNIT';
  const pts = rule.points;
  const stat = rule.statistic_type.replace(/_/g, ' ').toLowerCase();
  if (rt === 'FLAT') return `${pts} pts (flat)`;
  if (rt === 'BRACKET') {
    const c = rule.conditions as { min?: number; max?: number | null };
    const min = c.min ?? 0;
    const max = c.max;
    const range = max != null ? `${min}–${max}` : `${min}+`;
    return `${range} → ${pts} pt${Number(pts) !== 1 ? 's' : ''}`;
  }
  if (rt === 'PER_N') {
    const c = rule.conditions as { per_n?: number };
    return `${pts} pt per ${c.per_n ?? '?'} ${stat}`;
  }
  if (rt === 'POSITION') {
    const c = rule.conditions as { positions?: Record<string, number> };
    const pos = c.positions ?? {};
    return Object.entries(pos).map(([p, v]) => `${p} ${v}`).join(' • ') || `${pts} pts`;
  }
  // PER_UNIT
  return `${pts} pts per ${stat}`;
}

/* ── component ────────────────────────────────────────────── */

export default function FantasyAdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  // Core data
  const [competitions, setCompetitions] = useState<FantasyCompetition[]>([]);
  const [competitionId, setCompetitionId] = useState('');
  const [players, setPlayers] = useState<FantasyPlayer[]>([]);
  const [candidates, setCandidates] = useState<FantasyPlayerCandidate[]>([]);
  const [canonical, setCanonical] = useState<CanonicalFantasyOptions>({ competitions: [], seasons: [], taken_pairs: [] });

  // Players tab filters
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerPosFilter, setPlayerPosFilter] = useState('');
  const [playerAvailFilter, setPlayerAvailFilter] = useState('');
  const [playerEligFilter, setPlayerEligFilter] = useState<'all'|'eligible'|'ineligible'>('all');

  // Players tab add form
  const [candidateId, setCandidateId] = useState('');
  const [position, setPosition] = useState('');
  const [price, setPrice] = useState('');
  const [playerAvailability, setPlayerAvailability] = useState<FantasyAvailability>('AVAILABLE');
  const [playerEligible, setPlayerEligible] = useState(true);

  // "Add Player" full-create modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  type AddPlayerForm = {
    first_name: string; last_name: string; sport: string; club: string;
    profile_position: string; shirt_number: string; nationality: string;
    fantasy_position: string; price: string; starting_points: string;
    eligible: boolean; availability: FantasyAvailability;
  };
  const emptyAddPlayerForm: AddPlayerForm = {
    first_name: '', last_name: '', sport: '', club: '',
    profile_position: '', shirt_number: '', nationality: '',
    fantasy_position: '', price: '', starting_points: '0',
    eligible: true, availability: 'AVAILABLE',
  };
  const [addPlayerForm, setAddPlayerForm] = useState<AddPlayerForm>(emptyAddPlayerForm);
  const [addPlayerErrors, setAddPlayerErrors] = useState<Record<string, string>>({});
  // Clubs + sports for the Add Player modal dropdowns
  const [allClubs, setAllClubs] = useState<Array<{id: string; name: string; sport_id: string | null}>>([]);
  const [allCountries, setAllCountries] = useState<Array<{id: string; name: string}>>([]);

  // Gameweeks tab
  const [allGameweeks, setAllGameweeks] = useState<FantasyGameweek[]>([]);
  const [fixtures, setFixtures] = useState<FantasyFixture[]>([]);
  const [gwFixtureIds, setGwFixtureIds] = useState<Record<string, string[]>>({});
  const [newGwFixtureIds, setNewGwFixtureIds] = useState<string[]>([]);
  const [gwForm, setGwForm] = useState({ number: '', name: '', starts_at: '', deadline_at: '', ends_at: '' });
  const [gwFormErrors, setGwFormErrors] = useState<Record<string,string>>({});
  const [confirmGwAction, setConfirmGwAction] = useState<{label:string; action:()=>Promise<unknown>; success:string}|null>(null);

  // Scoring tab
  const [statistic, setStatistic] = useState('');
  const [points, setPoints] = useState('');
  const [ruleType, setRuleType] = useState<ScoringRuleType>('PER_UNIT');
  const [newRuleEnabled, setNewRuleEnabled] = useState(true);
  const [bracketMin, setBracketMin] = useState('');
  const [bracketMax, setBracketMax] = useState(''); // empty string = no upper bound (null)
  const [perN, setPerN] = useState('');
  const [positionPts, setPositionPts] = useState<Record<string, string>>({});
  const [statisticTypes, setStatisticTypes] = useState<FantasyStatisticType[]>([]);

  // Corrections tab
  const [correctionCompId, setCorrectionCompId] = useState('');
  const [correctionGameweekId, setCorrectionGameweekId] = useState('');
  const [pointRecords, setPointRecords] = useState<Array<{id:string;player:{player_name:string};total_points:string}>>([]);
  const [correctionPoint, setCorrectionPoint] = useState('');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [corrections, setCorrections] = useState<Array<Record<string, unknown>>>([]);
  const [correctionGameweeks, setCorrectionGameweeks] = useState<FantasyGameweek[]>([]);
  const [showCorrectionConfirm, setShowCorrectionConfirm] = useState(false);

  // Match Statistics tab
  const [msCompId, setMsCompId] = useState('');
  const [msFixtureId, setMsFixtureId] = useState('');
  const [msParticipantId, setMsParticipantId] = useState('');
  const [msStatType, setMsStatType] = useState('');
  const [msValue, setMsValue] = useState('');
  const [msFixtures, setMsFixtures] = useState<FantasyFixture[]>([]);
  const [msPlayers, setMsPlayers] = useState<FantasyPlayer[]>([]);
  const [msStatTypes, setMsStatTypes] = useState<FantasyStatisticType[]>([]);
  const [msCreated, setMsCreated] = useState<CreatedMatchStatistic | null>(null);
  const [msHistory, setMsHistory] = useState<CreatedMatchStatistic[]>([]);
  const [msGwId, setMsGwId] = useState('');
  const [msGwRecalcResult, setMsGwRecalcResult] = useState<string | null>(null);

  // Leaderboards tab
  const [overall, setOverall] = useState<FantasyStanding[]>([]);
  const [gameweekBoard, setGameweekBoard] = useState<FantasyTeamScore[]>([]);
  const [selectedGwId, setSelectedGwId] = useState('');
  const [leagueOverview, setLeagueOverview] = useState<FantasyLeagueOverview[]>([]);
  const [openLeagueId, setOpenLeagueId] = useState('');
  const [leagueMembers, setLeagueMembers] = useState<FantasyLeagueMember[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Competition create form
  const [compForm, setCompForm] = useState({
    competition: '', season: '', name: '', description: '',
    squad_size: '', starting_lineup_size: '', bench_size: '',
    initial_budget: '100', max_players_per_team: '3',
    captain_multiplier: '2', free_transfers_per_gameweek: '1',
    transfer_penalty: '4', position_rules: '', formation_rules: '',
    enabled: true, visibility: 'PUBLIC' as FantasyCompetition['visibility'],
    registration_state: 'OPEN' as FantasyCompetition['registration_state'],
    vice_captain_fallback: true,
  });
  const [compFormErrors, setCompFormErrors] = useState<Record<string, string>>({});

  // "Add Competition / Season" modal — functional, backed by real endpoints.
  const [showCanonicalModal, setShowCanonicalModal] = useState(false);
  const [canonicalMode, setCanonicalMode] = useState<'competition'|'season'>('competition');
  const [canonicalSports, setCanonicalSports] = useState<CanonicalSport[]>([]);
  const [canonicalCompetitions, setCanonicalCompetitions] = useState<CanonicalCompetition[]>([]);
  const [canonicalForm, setCanonicalForm] = useState({
    sport: '', name: '', country_code: 'UG',
    competition: '', season_name: '', starts_on: '', ends_on: '', is_active: true,
  });
  const [canonicalFormErrors, setCanonicalFormErrors] = useState<Record<string,string>>({});
  const [canonicalSaving, setCanonicalSaving] = useState(false);
  const [canonicalError, setCanonicalError] = useState('');
  const [canonicalSuccess, setCanonicalSuccess] = useState('');

  // Inline edit modals
  const [editingCompId, setEditingCompId] = useState('');
  const [competitionEdit, setCompetitionEdit] = useState<ReturnType<typeof editableCompetition>|null>(null);
  const [compEditErrors, setCompEditErrors] = useState<Record<string, string>>({});
  const [editingPlayerId, setEditingPlayerId] = useState('');
  const [playerEdit, setPlayerEdit] = useState<{position:string;price:string;starting_points:string;eligible:boolean;availability:FantasyAvailability}|null>(null);

  // Scoring rule edit state
  const [editingScoringRuleId, setEditingScoringRuleId] = useState('');
  const [scoringRuleEdit, setScoringRuleEdit] = useState<{
    points: string;
    enabled: boolean;
    ruleType: ScoringRuleType;
    bracketMin: string;
    bracketMax: string; // '' = no upper bound
    perN: string;
    positionPts: Record<string, string>;
  } | null>(null);

  // UI state
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  type DeleteTarget =
    | { kind: 'competition'; id: string; name: string }
    | { kind: 'player'; id: string; name: string }
    | { kind: 'scoring_rule'; id: string; name: string };
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const competition = competitions.find(r => r.id === competitionId);
  const currentPlayers = players.filter(r => r.fantasy_competition === competitionId);
  const gameweeks = useMemo(() => competitions.flatMap(r => r.current_gameweek ? [r.current_gameweek] : []), [competitions]);

  // Overview warnings — derived from already-loaded data
  const overviewWarnings = useMemo(() => {
    const w: string[] = [];
    competitions.forEach(c => {
      if (!players.some(p => p.fantasy_competition === c.id))
        w.push(`"${c.name}" has no players configured.`);
      if (!c.scoring_rules.length)
        w.push(`"${c.name}" has no scoring rules.`);
    });
    allGameweeks.forEach(gw => {
      if (!gw.fixture_details.length)
        w.push(`Gameweek "${gw.name}" has no fixtures assigned.`);
      if (gw.status === 'SCORING')
        w.push(`Gameweek "${gw.name}" is currently in SCORING — recalculate or finalize when ready.`);
      if (gw.status === 'LOCKED')
        w.push(`Gameweek "${gw.name}" is LOCKED — begin scoring when match data is ready.`);
    });
    return w;
  }, [competitions, players, allGameweeks]);

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
      setPlayers(pool); setCandidates(cands); setAllGameweeks(weeks);
      setFixtures(evts); setStatisticTypes(stats); setOverall(ranking);
      setGwFixtureIds(prev => {
        const next = { ...prev };
        weeks.forEach(gw => { if (!next[gw.id]) next[gw.id] = gw.fixture_details.map(f => f.id); });
        return next;
      });
    }).catch(e => setError(err(e)));
  }, [competitionId]);

  const autoPosition = useMemo(() => {
    const cand = candidates.find(r => r.id === candidateId);
    if (!cand || !competition) return '';
    return competition.position_rules[cand.profile_position] !== undefined
      ? cand.profile_position
      : Object.keys(competition.position_rules)[0] ?? '';
  }, [candidateId, candidates, competition]);

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

  // Like run() but also re-fetches the player pool + candidates after the action,
  // so newly added players appear immediately in the table and the dropdown
  // no longer shows them.
  const runAndRefreshPlayers = async (action: () => Promise<unknown>, success: string) => {
    const ok = await run(action, success);
    if (ok && competitionId) {
      try {
        const [pool, cands] = await Promise.all([
          fetchFantasyPlayers(competitionId),
          fetchFantasyPlayerCandidates(competitionId),
        ]);
        setPlayers(pool);
        setCandidates(cands);
      } catch { /* non-fatal — table will still reflect the reload */ }
    }
    return ok;
  };

  const runAndRefreshGameweeks = async (action: () => Promise<unknown>, success: string) => {
    const ok = await run(action, success);
    if (ok && competitionId) {
      try {
        const weeks = await fetchFantasyGameweeks(competitionId);
        setAllGameweeks(weeks);
        setGwFixtureIds(prev => {
          const next = { ...prev };
          weeks.forEach(gw => { if (!next[gw.id]) next[gw.id] = gw.fixture_details.map(f => f.id); });
          return next;
        });
      } catch { /* non-fatal */ }
    }
    return ok;
  };

  /* ── competition create ───────────────────────────────── */

  const submitCreateCompetition = async () => {
    // Belt-and-suspenders: the button is already disabled when existingPair is set,
    // but guard here too in case the check is bypassed (e.g. keyboard submit).
    if (existingPair) return;
    const e: Record<string,string> = {};
    if (!compForm.competition) e.competition = 'Required';
    if (!compForm.season)      e.season = 'Required';
    if (!compForm.name.trim()) e.name = 'Required';    const sq = Number(compForm.squad_size);
    const si = Number(compForm.starting_lineup_size);
    const bn = Number(compForm.bench_size);
    const ib = Number(compForm.initial_budget);
    const mp = Number(compForm.max_players_per_team);
    const cm = Number(compForm.captain_multiplier);
    const ft = Number(compForm.free_transfers_per_gameweek);
    const tp = Number(compForm.transfer_penalty);
    if (!compForm.squad_size || sq <= 0)           e.squad_size = 'Must be > 0';
    if (!compForm.starting_lineup_size || si <= 0) e.starting_lineup_size = 'Must be > 0';
    if (compForm.bench_size === '' || bn < 0)       e.bench_size = 'Must be ≥ 0';
    if (sq > 0 && si > 0 && bn >= 0 && si + bn !== sq)
      e.bench_size = `starting (${si}) + bench (${bn}) must equal squad size (${sq})`;
    if (ib <= 0) e.initial_budget = 'Must be > 0';
    if (mp <= 0) e.max_players_per_team = 'Must be > 0';
    if (cm <= 0) e.captain_multiplier = 'Must be > 0';
    if (ft < 0)  e.free_transfers_per_gameweek = 'Cannot be negative';
    if (tp < 0)  e.transfer_penalty = 'Cannot be negative';
    const [posRules, posErr] = safeJson<Record<string,number>>(wrapJsonObject(compForm.position_rules));
    const [fmtRules, fmtErr] = safeJson<Record<string,{min:number;max:number}>>(wrapJsonObject(compForm.formation_rules));
    if (posErr) e.position_rules = posErr;
    if (fmtErr) e.formation_rules = fmtErr;
    if (Object.keys(e).length) { setCompFormErrors(e); return; }
    setCompFormErrors({});
    const ok = await run(() => adminCreateCompetition({
      competition: compForm.competition, season: compForm.season,
      name: compForm.name.trim(), description: compForm.description.trim(),
      squad_size: sq, starting_lineup_size: si, bench_size: bn,
      initial_budget: compForm.initial_budget, max_players_per_team: mp,
      captain_multiplier: compForm.captain_multiplier,
      free_transfers_per_gameweek: ft, transfer_penalty: tp,
      position_rules: posRules ?? undefined, formation_rules: fmtRules ?? undefined,
      enabled: compForm.enabled,
      visibility: compForm.visibility,
      registration_state: compForm.registration_state,
      vice_captain_fallback: compForm.vice_captain_fallback,
      tie_break_rules: ['total_points','fewer_transfer_penalties','earlier_registration'],
      gameweek_rules: { deadline_hours_before_start: 1 },
    }), 'Fantasy competition created.');
    if (ok) setCompForm({ competition:'', season:'', name:'', description:'',
      squad_size:'', starting_lineup_size:'', bench_size:'',
      initial_budget:'100', max_players_per_team:'3', captain_multiplier:'2',
      free_transfers_per_gameweek:'1', transfer_penalty:'4',
      position_rules:'', formation_rules:'',
      enabled: true, visibility: 'PUBLIC', registration_state: 'OPEN',
      vice_captain_fallback: true,
    });
  };

  /* ── competition edit ─────────────────────────────────── */

  const saveCompetition = async () => {
    if (!competitionEdit || !editingCompId) return;
    const e: Record<string,string> = {};
    const [posRules, posErr]     = safeJson<Record<string,number>>(wrapJsonObject(competitionEdit.position_rules));
    const [fmtRules, fmtErr]     = safeJson<Record<string,{min:number;max:number}>>(wrapJsonObject(competitionEdit.formation_rules));
    const [tieRules, tieErr]     = safeJson<string[]>(competitionEdit.tie_break_rules);
    const [prizeRules, prizeErr] = safeJson<Record<string,unknown>>(wrapJsonObject(competitionEdit.prize_metadata));
    const [gwRules, gwErr]       = safeJson<Record<string,unknown>>(wrapJsonObject(competitionEdit.gameweek_rules ?? ''));
    if (posErr)   e.position_rules   = posErr;
    if (fmtErr)   e.formation_rules  = fmtErr;
    if (tieErr)   e.tie_break_rules  = tieErr;
    if (prizeErr) e.prize_metadata   = prizeErr;
    if (gwErr)    e.gameweek_rules   = gwErr;
    // Squad size cross-validation: starting_lineup_size + bench_size must equal squad_size
    const sq = Number(competitionEdit.squad_size);
    const si = Number(competitionEdit.starting_lineup_size);
    const bn = Number(competitionEdit.bench_size);
    if (sq > 0 && si > 0 && bn >= 0 && si + bn !== sq)
      e.bench_size = `starting (${si}) + bench (${bn}) must equal squad size (${sq})`;
    if (Object.keys(e).length) { setCompEditErrors(e); return; }
    setCompEditErrors({});
    // Keep the modal open while saving so the Save button is visibly disabled
    // and any API error appears before the user dismisses the form.
    const snapId = editingCompId;
    const snapshot = { ...competitionEdit };
    const ok = await run(() => adminUpdateCompetition(snapId, {
      name: snapshot.name, description: snapshot.description,
      enabled: snapshot.enabled, visibility: snapshot.visibility,
      registration_state: snapshot.registration_state,
      registration_deadline: snapshot.registration_deadline || null,
      squad_size: sq,
      starting_lineup_size: si,
      bench_size: bn,
      initial_budget: snapshot.initial_budget,
      max_players_per_team: Number(snapshot.max_players_per_team),
      captain_multiplier: snapshot.captain_multiplier,
      vice_captain_fallback: snapshot.vice_captain_fallback,
      free_transfers_per_gameweek: Number(snapshot.free_transfers_per_gameweek),
      transfer_penalty: Number(snapshot.transfer_penalty),
      position_rules: posRules ?? undefined, formation_rules: fmtRules ?? undefined,
      tie_break_rules: tieRules ?? undefined, prize_metadata: prizeRules ?? undefined,
      gameweek_rules: gwRules ?? undefined,
    }), 'Fantasy competition updated.');
    // Only close the modal on success so errors remain visible in context.
    if (ok) { setEditingCompId(''); setCompetitionEdit(null); }
  };

  /* ── player edit ──────────────────────────────────────── */

  const savePlayer = async () => {
    if (!playerEdit || !editingPlayerId) return;
    if (Number(playerEdit.price) <= 0) { setError('Price must be > 0'); return; }
    // Validation passed — close immediately, save in background.
    const snapshot = { ...playerEdit };
    const snapId = editingPlayerId;
    setEditingPlayerId(''); setPlayerEdit(null);
    void runAndRefreshPlayers(() => adminUpdatePlayer(snapId, {
      position: snapshot.position, price: Number(snapshot.price),
      starting_points: Number(snapshot.starting_points ?? 0),
      eligible: snapshot.eligible, availability: snapshot.availability,
    }), 'Fantasy player updated.');
  };

  /* ── scoring rule edit ────────────────────────── */

  const submitAddPlayer = async () => {
    if (!competition) return;
    const e: Record<string, string> = {};
    if (!addPlayerForm.first_name.trim()) e.first_name = 'Required';
    if (!addPlayerForm.last_name.trim())  e.last_name  = 'Required';
    if (!addPlayerForm.sport)             e.sport      = 'Required';
    if (!addPlayerForm.club)              e.club       = 'Required';
    if (!addPlayerForm.profile_position.trim()) e.profile_position = 'Required';
    if (!addPlayerForm.fantasy_position)  e.fantasy_position = 'Required';
    if (!addPlayerForm.price || Number(addPlayerForm.price) <= 0) e.price = 'Must be > 0';
    if (addPlayerForm.starting_points !== '' && Number(addPlayerForm.starting_points) < 0)
      e.starting_points = 'Cannot be negative';
    if (Object.keys(e).length) { setAddPlayerErrors(e); return; }
    setAddPlayerErrors({});
    const payload: AdminCreateFullPlayerPayload = {
      first_name: addPlayerForm.first_name.trim(),
      last_name:  addPlayerForm.last_name.trim(),
      // Resolve the Sport UUID from the loaded sports catalog using the competition's sport slug
      sport: canonicalSports.find(s => s.slug === competition.sport || s.name.toLowerCase() === competition.sport.toLowerCase())?.id ?? addPlayerForm.sport,
      club:       addPlayerForm.club,
      profile_position: addPlayerForm.profile_position.trim(),
      shirt_number: addPlayerForm.shirt_number ? Number(addPlayerForm.shirt_number) : null,
      nationality:  addPlayerForm.nationality || null,
      fantasy_competition: competitionId,
      fantasy_position:   addPlayerForm.fantasy_position,
      price:          Number(addPlayerForm.price),
      starting_points: Number(addPlayerForm.starting_points || 0),
      eligible:     addPlayerForm.eligible,
      availability: addPlayerForm.availability,
    };
    const ok = await runAndRefreshPlayers(() => adminCreateFullPlayer(payload), 'Player created and added to pool.');
    if (ok) { setShowAddPlayerModal(false); setAddPlayerForm(emptyAddPlayerForm); }
  };

  const saveScoringRule = async () => {
    if (!scoringRuleEdit || !editingScoringRuleId) return;
    if (!scoringRuleEdit.points || isNaN(Number(scoringRuleEdit.points))) {
      setError('Points must be a valid number.');
      return;
    }
    const condErr = validateConditions(
      scoringRuleEdit.ruleType,
      scoringRuleEdit.bracketMin,
      scoringRuleEdit.bracketMax,
      scoringRuleEdit.perN,
      scoringRuleEdit.positionPts,
    );
    if (condErr) { setError(condErr); return; }
    const conditions = buildConditions(
      scoringRuleEdit.ruleType,
      scoringRuleEdit.bracketMin,
      scoringRuleEdit.bracketMax,
      scoringRuleEdit.perN,
      scoringRuleEdit.positionPts,
    );
    const snapshot = { ...scoringRuleEdit };
    const snapId = editingScoringRuleId;
    setEditingScoringRuleId(''); setScoringRuleEdit(null);
    await run(() => adminUpdateScoringRule(snapId, {
      points: snapshot.points,
      enabled: snapshot.enabled,
      rule_type: snapshot.ruleType,
      conditions,
    }), 'Scoring rule updated.');
  };

  /* ── delete competition / player / scoring rule ─────────────────────── */

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id: targetId, name } = deleteTarget;
    setDeleteTarget(null);
    if (kind === 'competition') {
      await run(() => adminDeleteCompetition(targetId), `"${name}" deleted.`);
      // If the deleted competition was selected, fall back to the first remaining one.
      setCompetitionId(cur => cur === targetId ? '' : cur);
    } else if (kind === 'scoring_rule') {
      await run(() => adminDeleteScoringRule(targetId), `Scoring rule "${name}" deleted.`);
    } else {
      await runAndRefreshPlayers(() => adminDeletePlayer(targetId), `"${name}" removed from pool.`);
    }
  };

  /* ── quick enable/disable toggle ─────────────────────── */

  const toggleEnabled = async (row: FantasyCompetition) => {
    await run(
      () => adminUpdateCompetition(row.id, { enabled: !row.enabled }),
      `"${row.name}" ${!row.enabled ? 'enabled' : 'disabled'}.`
    );
  };

  /* ── gameweek create validation ───────────────────────── */

  const validateGwForm = () => {
    const e: Record<string,string> = {};
    if (!gwForm.number || Number(gwForm.number) <= 0) e.number = 'Must be > 0';
    if (!gwForm.name.trim())    e.name = 'Required';
    if (!gwForm.deadline_at)    e.deadline_at = 'Required';
    if (gwForm.starts_at && gwForm.deadline_at &&
        new Date(gwForm.starts_at) >= new Date(gwForm.deadline_at))
      e.deadline_at = 'Deadline must be after start';
    if (gwForm.deadline_at && gwForm.ends_at &&
        new Date(gwForm.deadline_at) >= new Date(gwForm.ends_at))
      e.ends_at = 'End must be after deadline';
    setGwFormErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── corrections ─────────────────────────────────────── */

  const loadCorrections = async (gwId: string) => {
    setCorrectionGameweekId(gwId);
    setPointRecords([]); setCorrections([]);
    if (!gwId) return;
    try {
      const [records, audit] = await Promise.all([fetchGameweekPoints(gwId), fetchAdminCorrections(gwId)]);
      setPointRecords(records as Array<{id:string;player:{player_name:string};total_points:string}>);
      setCorrections(audit);
    } catch (e) { setError(err(e)); }
  };

  const changeCorrectionComp = async (cId: string) => {
    setCorrectionCompId(cId); setCorrectionGameweekId('');
    setPointRecords([]); setCorrections([]);
    if (!cId) return;
    try { setCorrectionGameweeks(await fetchFantasyGameweeks(cId)); }
    catch (e) { setError(err(e)); }
  };

  const submitCorrection = async () => {
    setShowCorrectionConfirm(false);
    const ok = await run(
      () => adminCreateCorrection({ player_points: correctionPoint, new_value: correctionValue, reason: correctionReason }),
      'Correction saved. Scores recalculated.'
    );
    if (ok) {
      setCorrectionPoint(''); setCorrectionValue(''); setCorrectionReason('');
      void loadCorrections(correctionGameweekId);
    }
  };

  /* ── leaderboards ────────────────────────────────────── */

  const refreshLeaderboard = async () => {
    setLbLoading(true);
    try {
      const rows = await fetchCompetitionLeaderboard(competitionId);
      setOverall(rows);
      if (selectedGwId) {
        const gw = await fetchGameweekLeaderboard(selectedGwId);
        setGameweekBoard(gw);
      }
    } catch (e) { setError(err(e)); }
    finally { setLbLoading(false); }
  };

  /* ── leagues ─────────────────────────────────────────── */

  const openLeague = async (id: string) => {
    if (openLeagueId === id) { setOpenLeagueId(''); setLeagueMembers([]); return; }
    setOpenLeagueId(id);
    try { setLeagueMembers(await fetchLeagueMembers(id)); }
    catch { setLeagueMembers([]); }
  };

  /* ── canonical competition / season create ───────────── */

  const submitCanonical = async () => {
    const e: Record<string,string> = {};
    if (!canonicalForm.sport) e.sport = 'Required';
    if (canonicalMode === 'competition') {
      if (!canonicalForm.name.trim()) e.name = 'Required';
    } else {
      if (!canonicalForm.competition) e.competition = 'Required';
      if (!canonicalForm.season_name.trim()) e.season_name = 'Required';
    }
    if (Object.keys(e).length) { setCanonicalFormErrors(e); return; }
    // Validation passed — close immediately, complete the save in the background.
    setShowCanonicalModal(false);
    setCanonicalFormErrors({});
    setCanonicalSaving(true); setCanonicalError(''); setCanonicalSuccess('');
    try {
      if (canonicalMode === 'competition') {
        await createCanonicalCompetition({
          sport: canonicalForm.sport,
          name: canonicalForm.name.trim(),
          country_code: canonicalForm.country_code || 'UG',
          is_active: canonicalForm.is_active,
        });
        setNotice('Canonical competition created.');
      } else {
        await createCanonicalSeason({
          sport: canonicalForm.sport,
          competition: canonicalForm.competition || null,
          name: canonicalForm.season_name.trim(),
          starts_on: canonicalForm.starts_on || null,
          ends_on: canonicalForm.ends_on || null,
          is_active: canonicalForm.is_active,
        });
        setNotice('Canonical season created.');
      }
      // Refresh canonical options so the new item appears in dropdowns.
      const options = await fetchCanonicalFantasyOptions();
      setCanonical(options);
      setCanonicalCompetitions(options.competitions.map(c => ({ id:c.id, name:c.name, slug:c.sport_slug ?? '', country_code:'', sport:c.sport, sport_slug:c.sport_slug ?? '' })));
    } catch (err2) {
      setError(err(err2));
    } finally {
      setCanonicalSaving(false);
    }
  };

  /* ── utils ───────────────────────────────────────────── */

  const fieldCls = (errs: Record<string,string>, key: string) =>
    `fa-field${errs[key] ? ' fa-field--error' : ''}`;

  const competitionName = (fcId: string) =>
    competitions.find(c => c.id === fcId)?.name ?? fcId;

  // Players filtered by search + filters
  const filteredPlayers = useMemo(() => currentPlayers.filter(p => {
    if (playerSearch && !p.player_name.toLowerCase().includes(playerSearch.toLowerCase()) &&
        !p.club.toLowerCase().includes(playerSearch.toLowerCase())) return false;
    if (playerPosFilter && p.position !== playerPosFilter) return false;
    if (playerAvailFilter && p.availability !== playerAvailFilter) return false;
    if (playerEligFilter === 'eligible' && !p.eligible) return false;
    if (playerEligFilter === 'ineligible' && p.eligible) return false;
    return true;
  }), [currentPlayers, playerSearch, playerPosFilter, playerAvailFilter, playerEligFilter]);

  // Candidates already in pool (prevent duplicates)
  const pooledPlayerIds = useMemo(() => new Set(currentPlayers.map(p => p.player)), [currentPlayers]);

  // Stable reference to taken_pairs — memoized so downstream useMemos have a stable dep.
  const takenPairs = useMemo(() => canonical.taken_pairs ?? [], [canonical.taken_pairs]);

  // Set of season IDs that are already covered by a FantasyCompetition for the
  // currently selected canonical competition. Used to annotate the Season dropdown.
  const takenSeasonIds = useMemo(
    () => new Set(
      takenPairs
        .filter(p => p.competition === compForm.competition)
        .map(p => p.season)
    ),
    [takenPairs, compForm.competition]
  );

  // If both competition + season are selected and the pair is already taken,
  // this holds the existing FantasyCompetition details so we can offer Edit Existing.
  // No useMemo needed: takenPairs is already memoized, so the found item (a reference
  // into that same array) is transitively stable. The React Compiler lint rule
  // (preserve-manual-memoization) flags a manual useMemo here as unnecessary.
  const existingPair =
    takenPairs.find(
      p => p.competition === compForm.competition && p.season === compForm.season
    ) ?? null;

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */

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
          {(['overview','competitions','players','gameweeks','scoring','corrections','leaderboards','leagues','match-stats'] as Tab[]).map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'match-stats' ? 'Match Stats' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="fa-empty">Loading Fantasy operations…</div>
        ) : (
          <>

            {/* ════ OVERVIEW ════ */}
            {tab === 'overview' && (
              <>
                <div className="fa-stats">
                  <article><span>Fantasy competitions</span><strong>{competitions.length}</strong></article>
                  <article><span>Configured players</span><strong>{players.length}</strong></article>
                  <article><span>Active gameweeks</span><strong>{gameweeks.length}</strong></article>
                  <article>
                    <span>Awaiting / scoring</span>
                    <strong>{allGameweeks.filter(r => ['LOCKED','LIVE','SCORING'].includes(r.status)).length}</strong>
                  </article>
                </div>
                {overviewWarnings.length > 0 && (
                  <div className="fa-panel" style={{ gap: 8 }}>
                    <h2>⚠ Operational warnings</h2>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {overviewWarnings.map((w, i) => (
                        <li key={i} style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* ════ COMPETITIONS ════ */}
            {tab === 'competitions' && (
              <section className="fa-panel">
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:4 }}>
                  <h2>Create Fantasy Competition</h2>
                  <button className="fa-btn fa-btn--sm" onClick={() => {
                    setCanonicalMode('competition');
                    setCanonicalForm({ sport:'', name:'', country_code:'UG', competition:'', season_name:'', starts_on:'', ends_on:'', is_active:true });
                    setCanonicalFormErrors({}); setCanonicalError(''); setCanonicalSuccess('');
                    setShowCanonicalModal(true);
                    void fetchCanonicalSports().then(setCanonicalSports).catch(e => setCanonicalError(err(e)));
                    void fetchCanonicalFantasyOptions().then(o => setCanonicalCompetitions(o.competitions.map(c => ({ id:c.id, name:c.name, slug:c.sport_slug ?? '', country_code:'', sport:c.sport, sport_slug:c.sport_slug ?? '' })))).catch(() => {});
                  }}>
                    + Add Competition / Season
                  </button>
                </div>

                <div className="fa-form-grid">
                  {/* ── Identity ─────────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Identity</div>
                  <label className={fieldCls(compFormErrors,'competition')}>
                    <span>Real competition / league *</span>
                    <select value={compForm.competition} onChange={e => setCompForm({ ...compForm, competition: e.target.value, season: '' })}>
                      <option value="">— Select competition —</option>
                      {canonical.competitions.map(r => <option value={r.id} key={r.id}>{r.name} · {r.sport}</option>)}
                    </select>
                    {compFormErrors.competition && <span className="fa-field-error">{compFormErrors.competition}</span>}
                  </label>
                  <label className={fieldCls(compFormErrors,'season')}>
                    <span>Season *</span>
                    <select value={compForm.season} onChange={e => setCompForm({ ...compForm, season: e.target.value })} disabled={!compForm.competition}>
                      <option value="">{compForm.competition ? '— Select season —' : '— Select competition first —'}</option>
                      {canonical.seasons.filter(r => r.competition === compForm.competition).map(r => {
                        const taken = takenSeasonIds.has(r.id);
                        return (
                          <option value={r.id} key={r.id} disabled={taken}>
                            {r.name}{r.is_active ? ' ✓ active' : ''}{taken ? ' — Fantasy competition exists' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {compFormErrors.season && <span className="fa-field-error">{compFormErrors.season}</span>}
                  </label>
                  <label className={fieldCls(compFormErrors,'name')}>
                    <span>Fantasy competition name *</span>
                    <input
                      aria-label="name"
                      type="text"
                      value={compForm.name}
                      onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                      placeholder="e.g. Premier Fantasy 2026/27"
                    />
                    {compFormErrors.name && <span className="fa-field-error">{compFormErrors.name}</span>}
                  </label>
                  <label className="fa-field">
                    <span>Description</span>
                    <input type="text" value={compForm.description} onChange={e => setCompForm({ ...compForm, description: e.target.value })} placeholder="Optional" />
                  </label>

                  {/* ── Visibility & Access ───────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Visibility &amp; Access</div>
                  <label className="fa-field">
                    <span>Visibility</span>
                    <select
                      aria-label="visibility"
                      value={compForm.visibility}
                      onChange={e => setCompForm({ ...compForm, visibility: e.target.value as FantasyCompetition['visibility'] })}
                    >
                      <option value="PUBLIC">Public — anyone can join</option>
                      <option value="PRIVATE">Private — invite only</option>
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Registration state</span>
                    <select
                      aria-label="registration state"
                      value={compForm.registration_state}
                      onChange={e => setCompForm({ ...compForm, registration_state: e.target.value as FantasyCompetition['registration_state'] })}
                    >
                      <option value="OPEN">Open — fans can register</option>
                      <option value="CLOSED">Closed — no new entries</option>
                    </select>
                  </label>
                  <div className="fa-form-grid-fullwidth" style={{ display:'flex', gap:24, flexWrap:'wrap', paddingTop:4 }}>
                    <label className="fa-checkbox-row" aria-label="enabled">
                      <input
                        type="checkbox"
                        aria-label="enabled"
                        checked={compForm.enabled}
                        onChange={e => setCompForm({ ...compForm, enabled: e.target.checked })}
                      />
                      Enabled — visible to fans
                    </label>
                    <label className="fa-checkbox-row" aria-label="vice captain fallback">
                      <input
                        type="checkbox"
                        checked={compForm.vice_captain_fallback}
                        onChange={e => setCompForm({ ...compForm, vice_captain_fallback: e.target.checked })}
                      />
                      Vice-captain fallback
                    </label>
                  </div>

                  {/* ── Squad Rules ───────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Squad Rules</div>
                  {(['squad_size','starting_lineup_size','bench_size'] as const).map(f => (
                    <label key={f} className={fieldCls(compFormErrors, f)}>
                      <span>{f.replaceAll('_',' ')} *</span>
                      <input
                        aria-label={f.replaceAll('_',' ')}
                        type="number" min="0"
                        value={compForm[f]}
                        onChange={e => setCompForm({ ...compForm, [f]: e.target.value })}
                        placeholder={f === 'squad_size' ? 'e.g. 15' : f === 'starting_lineup_size' ? 'e.g. 11' : 'e.g. 4'}
                      />
                      {compFormErrors[f] && <span className="fa-field-error">{compFormErrors[f]}</span>}
                    </label>
                  ))}
                  <label className={fieldCls(compFormErrors,'initial_budget')}>
                    <span>Starting budget (M)</span>
                    <input
                      aria-label="initial budget"
                      type="number" min="1" step="0.5"
                      value={compForm.initial_budget}
                      onChange={e => setCompForm({ ...compForm, initial_budget: e.target.value })}
                      placeholder="e.g. 100"
                    />
                    {compFormErrors.initial_budget && <span className="fa-field-error">{compFormErrors.initial_budget}</span>}
                  </label>
                  <label className={fieldCls(compFormErrors,'max_players_per_team')}>
                    <span>Max players per club</span>
                    <input
                      aria-label="max players per team"
                      type="number" min="1"
                      value={compForm.max_players_per_team}
                      onChange={e => setCompForm({ ...compForm, max_players_per_team: e.target.value })}
                      placeholder="e.g. 3"
                    />
                    {compFormErrors.max_players_per_team && <span className="fa-field-error">{compFormErrors.max_players_per_team}</span>}
                  </label>
                  <label className={fieldCls(compFormErrors,'captain_multiplier')}>
                    <span>Captain score multiplier</span>
                    <input
                      aria-label="captain multiplier"
                      type="number" min="1" step="0.5"
                      value={compForm.captain_multiplier}
                      onChange={e => setCompForm({ ...compForm, captain_multiplier: e.target.value })}
                      placeholder="e.g. 2"
                    />
                    {compFormErrors.captain_multiplier && <span className="fa-field-error">{compFormErrors.captain_multiplier}</span>}
                  </label>

                  {/* ── Position Limits ───────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Position Limits</div>
                  <label className={`${fieldCls(compFormErrors,'position_rules')} fa-form-grid-fullwidth`}>
                    <span>
                      Position limits (squad count per position) *
                      <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:8 }}>enter contents without outer {'{ }'} — e.g. <code style={{ fontFamily:'monospace', fontSize:'0.82em' }}>"GK":2,"DEF":5,"MID":5,"FWD":3</code></small>
                    </span>
                    <textarea
                      aria-label="position rules"
                      value={compForm.position_rules}
                      onChange={e => setCompForm({ ...compForm, position_rules: e.target.value })}
                      rows={3}
                      placeholder={'"GK":2,"DEF":5,"MID":5,"FWD":3'}
                    />
                    {compFormErrors.position_rules && <span className="fa-field-error">{compFormErrors.position_rules}</span>}
                  </label>
                  <label className={`${fieldCls(compFormErrors,'formation_rules')} fa-form-grid-fullwidth`}>
                    <span>
                      Starting XI limits (min/max starters per position)
                      <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:8 }}>enter contents without outer {'{ }'} — e.g. <code style={{ fontFamily:'monospace', fontSize:'0.82em' }}>"GK":{'{"min":1,"max":1}'},"DEF":{'{"min":3,"max":5}'}</code></small>
                    </span>
                    <textarea
                      aria-label="formation rules"
                      value={compForm.formation_rules}
                      onChange={e => setCompForm({ ...compForm, formation_rules: e.target.value })}
                      rows={3}
                      placeholder={'"GK":{"min":1,"max":1}'}
                    />
                    {compFormErrors.formation_rules && <span className="fa-field-error">{compFormErrors.formation_rules}</span>}
                  </label>

                  {/* ── Transfer Rules ────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Transfer Rules</div>
                  <label className={fieldCls(compFormErrors,'free_transfers_per_gameweek')}>
                    <span>Free transfers per gameweek</span>
                    <input
                      aria-label="free transfers per gameweek"
                      type="number" min="0"
                      value={compForm.free_transfers_per_gameweek}
                      onChange={e => setCompForm({ ...compForm, free_transfers_per_gameweek: e.target.value })}
                      placeholder="e.g. 1"
                    />
                    {compFormErrors.free_transfers_per_gameweek && <span className="fa-field-error">{compFormErrors.free_transfers_per_gameweek}</span>}
                  </label>
                  <label className={fieldCls(compFormErrors,'transfer_penalty')}>
                    <span>Penalty points per extra transfer</span>
                    <input
                      aria-label="transfer penalty"
                      type="number" min="0"
                      value={compForm.transfer_penalty}
                      onChange={e => setCompForm({ ...compForm, transfer_penalty: e.target.value })}
                      placeholder="e.g. 4"
                    />
                    {compFormErrors.transfer_penalty && <span className="fa-field-error">{compFormErrors.transfer_penalty}</span>}
                  </label>

                  {/* ── Duplicate pair warning + action ──────── */}
                  {existingPair && (
                    <div className="fa-form-grid-fullwidth" style={{ padding:'10px 14px', borderRadius:8, background:'var(--color-warning-bg,#2a1f00)', border:'1px solid var(--color-warning-border,#7a5c00)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                      <span style={{ fontSize:'0.85rem', color:'var(--color-warning-text,#f5c518)' }}>
                        A Fantasy Competition already exists for this Competition and Season:
                        {' '}<strong>{existingPair.fantasy_competition_name}</strong>
                      </span>
                      <button
                        type="button"
                        className="fa-btn fa-btn--sm"
                        onClick={() => {
                          const match = competitions.find(c => c.id === existingPair.fantasy_competition_id);
                          if (match) { setEditingCompId(match.id); setCompetitionEdit(editableCompetition(match)); setCompEditErrors({}); }
                        }}
                      >
                        Edit Existing
                      </button>
                    </div>
                  )}

                  <button
                    className="fa-btn fa-btn--gradient fa-form-grid-fullwidth"
                    style={{ justifySelf:'start' }}
                    disabled={saving || !!existingPair}
                    onClick={() => void submitCreateCompetition()}
                  >
                    Create competition
                  </button>
                </div>

                {/* ── Competition list ─────────────────────── */}
                <h2>Official Fantasy Competitions</h2>
                <div className="fa-table-wrap">
                  <table className="fa-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>League / Season</th>
                        <th>Sport</th>
                        <th>Registration</th>
                        <th>Visibility</th>
                        <th>Squad</th>
                        <th>Budget</th>
                        <th>Enabled</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!competitions.length && <tr className="fa-table__empty"><td colSpan={9}>No competitions yet.</td></tr>}
                      {competitions.map(r => {
                        const linkedComp = canonical.competitions.find(c => c.id === r.competition);
                        const linkedSeason = canonical.seasons.find(s => s.id === r.season);
                        return (
                          <tr key={r.id}>
                            <td><strong>{r.name}</strong></td>
                            <td style={{ fontSize:'0.78rem', color:'var(--color-text-secondary)' }}>
                              <span style={{ display:'block' }}>{linkedComp?.name ?? r.competition}</span>
                              <span style={{ color:'var(--color-text-muted)' }}>{linkedSeason?.name ?? r.season_name}</span>
                            </td>
                            <td style={{ textTransform:'capitalize' }}>{r.sport}</td>
                            <td><span className={`fa-status-pill fa-status-pill--${r.registration_state.toLowerCase()}`}>{r.registration_state}</span></td>
                            <td>
                              <span className={`fa-status-pill fa-status-pill--${r.visibility === 'PUBLIC' ? 'open' : 'draft'}`}>
                                {r.visibility}
                              </span>
                            </td>
                            <td>{r.squad_size}</td>
                            <td>{r.initial_budget}M</td>
                            <td>
                              <button
                                className={`fa-btn fa-btn--sm${r.enabled ? '' : ' fa-btn--ghost'}`}
                                style={{ minWidth:64 }}
                                disabled={saving}
                                aria-label={r.enabled ? 'Disable competition' : 'Enable competition'}
                                onClick={() => void toggleEnabled(r)}
                                title={r.enabled ? 'Click to disable' : 'Click to enable'}
                              >
                                {r.enabled
                                  ? <><span style={{ color:'#4ade80' }}>●</span> Enabled</>
                                  : <><span style={{ color:'#9ca3af' }}>●</span> Disabled</>
                                }
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="fa-btn fa-btn--sm" onClick={() => { setEditingCompId(r.id); setCompetitionEdit(editableCompetition(r)); setCompEditErrors({}); }}>Edit</button>
                                <button className="fa-btn fa-btn--sm fa-btn--danger" onClick={() => setDeleteTarget({ kind: 'competition', id: r.id, name: r.name })}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ════ PLAYERS ════ */}
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
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:4 }}>
                      <h2 style={{ margin: 0 }}>Add Player to Pool</h2>
                      <button
                        className="fa-btn fa-btn--sm"
                        onClick={() => {
                        setAddPlayerForm({ ...emptyAddPlayerForm, sport: competition.competition, fantasy_position: Object.keys(competition.position_rules)[0] ?? '' });
                        setAddPlayerErrors({});
                        // Fetch clubs and countries for the modal dropdowns
                        void fetchCanonicalSports().then(setCanonicalSports).catch(() => {});
                        void apiClient.get('/admin/clubs/', { params: { sport: competition.competition } })
                          .then(r => {
                            const rows = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
                            setAllClubs(rows.map((c: {id:string; name:string; sport:string|null}) => ({ id: c.id, name: c.name, sport_id: c.sport ?? null })));
                          }).catch(() => {});
                        void apiClient.get('/profiles/countries/')
                          .then(r => {
                            const rows = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
                            setAllCountries(rows.map((c: {id:string; name:string}) => ({ id: c.id, name: c.name })));
                          }).catch(() => {});
                        setShowAddPlayerModal(true);
                      }}
                      >
                        + Add New Player
                      </button>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Add an existing athlete from the canonical roster, or + Add New Player to create a new player from scratch (Super Admin override).
                    </p>
                    <div className="fa-form-grid">
                      <label className="fa-field">
                        <span>Athlete</span>
                        <select value={candidateId} onChange={e => setCandidateId(e.target.value)}>
                          <option value="">— Select athlete —</option>
                          {candidates
                            .filter(r => !pooledPlayerIds.has(r.id))
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name} — {r.club ?? 'No club'}
                              </option>
                            ))}
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
                      <label className="fa-checkbox-row">
                        <input type="checkbox" checked={playerEligible} onChange={e => setPlayerEligible(e.target.checked)} />
                        <span>Eligible</span>
                      </label>
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !candidateId || !price || Number(price) <= 0 || pooledPlayerIds.has(candidateId)}
                        onClick={() => void runAndRefreshPlayers(
                          () => adminCreatePlayer({ fantasy_competition: competition.id, player: candidateId, position, price: Number(price), eligible: playerEligible, availability: playerAvailability }),
                          'Player added to pool.'
                        ).then(ok => { if (ok) { setCandidateId(''); setPrice(''); setPlayerAvailability('AVAILABLE'); setPlayerEligible(true); } })}
                      >
                        Add to pool
                      </button>
                    </div>

                    {/* Pool counts */}
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.82rem', color:'var(--color-text-secondary)', marginBottom:4 }}>
                      <span>Total: <strong>{currentPlayers.length}</strong></span>
                      <span>Eligible: <strong>{currentPlayers.filter(p => p.eligible).length}</strong></span>
                      <span>Unavailable: <strong>{currentPlayers.filter(p => p.availability !== 'AVAILABLE').length}</strong></span>
                    </div>

                    {/* Search + filters */}
                    <div className="fa-form-grid" style={{ marginBottom: 0 }}>
                      <label className="fa-field">
                        <span>Search</span>
                        <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="Name or club…" />
                      </label>
                      <label className="fa-field">
                        <span>Position</span>
                        <select value={playerPosFilter} onChange={e => setPlayerPosFilter(e.target.value)}>
                          <option value="">All positions</option>
                          {Object.keys(competition.position_rules).map(p => <option key={p}>{p}</option>)}
                        </select>
                      </label>
                      <label className="fa-field">
                        <span>Availability</span>
                        <select value={playerAvailFilter} onChange={e => setPlayerAvailFilter(e.target.value)}>
                          <option value="">All</option>
                          {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </label>
                      <label className="fa-field">
                        <span>Eligibility</span>
                        <select value={playerEligFilter} onChange={e => setPlayerEligFilter(e.target.value as typeof playerEligFilter)}>
                          <option value="all">All</option>
                          <option value="eligible">Eligible</option>
                          <option value="ineligible">Ineligible</option>
                        </select>
                      </label>
                    </div>

                    <h2>Player Pool</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Player</th><th>Club</th><th>Position</th><th>Price</th><th>Start Pts</th><th>Eligible</th><th>Availability</th><th></th></tr></thead>
                        <tbody>
                          {!filteredPlayers.length && <tr className="fa-table__empty"><td colSpan={8}>{currentPlayers.length ? 'No players match filters.' : 'No players in this competition pool yet.'}</td></tr>}
                          {filteredPlayers.map(r => (
                            <tr key={r.id}>
                              <td><strong>{r.player_name}</strong></td>
                              <td>{typeof r.club === 'object' && r.club !== null ? (r.club as {name:string}).name : r.club || '—'}</td>
                              <td>{r.position}</td>
                              <td>{r.price}</td>
                              <td>{r.starting_points ?? '0'}</td>
                              <td>{r.eligible ? '✓' : '✗'}</td>
                              <td><span className={`fa-status-pill fa-status-pill--${r.availability.toLowerCase()}`}>{r.availability}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="fa-btn fa-btn--sm" onClick={() => { setEditingPlayerId(r.id); setPlayerEdit({ position: r.position, price: String(r.price), starting_points: String(r.starting_points ?? 0), eligible: r.eligible, availability: r.availability }); }}>Edit</button>
                                  <button className="fa-btn fa-btn--sm fa-btn--danger" onClick={() => setDeleteTarget({ kind: 'player', id: r.id, name: r.player_name })}>Delete</button>
                                </div>
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

            {/* ════ GAMEWEEKS ════ */}
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
                      <label className={fieldCls(gwFormErrors,'number')}>
                        <span>Number *</span>
                        <input type="number" value={gwForm.number} onChange={e => setGwForm({ ...gwForm, number: e.target.value })} placeholder="e.g. 1" />
                        {gwFormErrors.number && <span className="fa-field-error">{gwFormErrors.number}</span>}
                      </label>
                      <label className={fieldCls(gwFormErrors,'name')}>
                        <span>Name *</span>
                        <input value={gwForm.name} onChange={e => setGwForm({ ...gwForm, name: e.target.value })} placeholder="e.g. Gameweek 1" />
                        {gwFormErrors.name && <span className="fa-field-error">{gwFormErrors.name}</span>}
                      </label>
                      {(['starts_at','deadline_at','ends_at'] as const).map(f => (
                        <label key={f} className={fieldCls(gwFormErrors, f)}>
                          <span>{f.replaceAll('_',' ')}{f === 'deadline_at' ? ' *' : ''}</span>
                          <input type="datetime-local" value={gwForm[f]} onChange={e => setGwForm({ ...gwForm, [f]: e.target.value })} />
                          {gwFormErrors[f] && <span className="fa-field-error">{gwFormErrors[f]}</span>}
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
                        disabled={saving}
                        onClick={() => {
                          if (!validateGwForm()) return;
                          void runAndRefreshGameweeks(
                            () => adminCreateGameweek({ fantasy_competition: competition.id, number: Number(gwForm.number), name: gwForm.name, starts_at: gwForm.starts_at, deadline_at: gwForm.deadline_at, ends_at: gwForm.ends_at, status: 'DRAFT', fixtures: newGwFixtureIds }),
                            'Gameweek created.'
                          ).then(ok => { if (ok) { setGwForm({ number:'', name:'', starts_at:'', deadline_at:'', ends_at:'' }); setGwFormErrors({}); setNewGwFixtureIds([]); } });
                        }}
                      >
                        Create gameweek
                      </button>
                    </div>

                    <h2>Manage Gameweeks</h2>
                    {!allGameweeks.length && <div className="fa-empty" style={{ padding:'24px 0' }}>No gameweeks yet for this competition.</div>}
                    {allGameweeks.map(row => {
                      const gwIds = gwFixtureIds[row.id] ?? [];
                      const toggle = (fId: string) => setGwFixtureIds(p => ({ ...p, [row.id]: p[row.id]?.includes(fId) ? p[row.id].filter(x => x !== fId) : [...(p[row.id] ?? []), fId] }));
                      const confirmAction = (label: string, action: () => Promise<unknown>, success: string) =>
                        setConfirmGwAction({ label, action, success });
                      return (
                        <div className="fa-card" key={row.id}>
                          <h3>
                            #{row.number} — {row.name}
                            <span className={`fa-status-pill fa-status-pill--${row.status.toLowerCase()}`}>{row.status}</span>
                          </h3>
                          <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
                            {row.starts_at   && <span>Starts: {new Date(row.starts_at).toLocaleString()}</span>}
                            {row.deadline_at && <span>Deadline: {new Date(row.deadline_at).toLocaleString()}</span>}
                            {row.ends_at     && <span>Ends: {new Date(row.ends_at).toLocaleString()}</span>}
                          </div>
                          <p style={{ margin:0, fontSize:'0.83rem', color:'var(--color-text-secondary)' }}>
                            Fixtures: {row.fixture_details.length ? row.fixture_details.map(f => f.name).join(', ') : 'None assigned'}
                          </p>
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
                            <button className="fa-btn fa-btn--sm" disabled={saving} onClick={() => void runAndRefreshGameweeks(() => adminUpdateGameweek(row.id, { fixtures: gwIds }), 'Fixtures saved.')}>
                              Save fixtures
                            </button>
                            {row.status === 'DRAFT' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving} onClick={() => void runAndRefreshGameweeks(() => adminTransitionGameweek(row.id, 'OPEN'), 'Gameweek opened.')}>
                                Open
                              </button>
                            )}
                            {row.status === 'OPEN' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving}
                                onClick={() => confirmAction(`Lock entries for "${row.name}"?`, () => adminTransitionGameweek(row.id, 'LOCKED'), 'Gameweek locked.')}>
                                Lock entries
                              </button>
                            )}
                            {row.status === 'LOCKED' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving}
                                onClick={() => confirmAction(`Begin scoring for "${row.name}"?`, () => adminTransitionGameweek(row.id, 'SCORING'), 'Scoring started.')}>
                                Begin scoring
                              </button>
                            )}
                            {(row.status === 'LOCKED' || row.status === 'SCORING') && (
                              <button className="fa-btn fa-btn--sm" disabled={saving} onClick={() => void runAndRefreshGameweeks(() => adminRecalculateGameweek(row.id), 'Scores recalculated.')}>
                                Recalculate
                              </button>
                            )}
                            {row.status === 'SCORING' && (
                              <button className="fa-btn fa-btn--gradient fa-btn--sm" disabled={saving}
                                onClick={() => confirmAction(`Finalize "${row.name}"? This cannot be undone.`, () => adminFinalizeGameweek(row.id), 'Gameweek finalized.')}>
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

            {/* ════ SCORING ════ */}
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
                    <p style={{ margin:'-10px 0 0', fontSize:'0.83rem', color:'var(--color-text-secondary)' }}>
                      Configure how statistics translate to fantasy points. Select a rule type to see the required fields.
                    </p>
                    {!statisticTypes.length
                      ? <div className="fa-empty" style={{ padding:'20px 0' }}>No statistic types available for this competition yet.</div>
                      : (
                        <div className="fa-form-grid">
                          {/* ── Statistic ── */}
                          <label className="fa-field" aria-label="statistic type label">
                            <span>Statistic type</span>
                            <select
                              aria-label="statistic type"
                              value={statistic}
                              onChange={e => setStatistic(e.target.value)}
                            >
                              <option value="">— Select —</option>
                              {statisticTypes.map(r => (
                                <option key={r.code} value={r.code}>{r.label}{!r.observed ? ' (no data yet)' : ''}</option>
                              ))}
                            </select>
                          </label>

                          {/* ── Rule Type ── */}
                          <label className="fa-field">
                            <span>Rule type</span>
                            <select
                              aria-label="rule type"
                              value={ruleType}
                              onChange={e => {
                                const rt = e.target.value as ScoringRuleType;
                                setRuleType(rt);
                                // Clear conditions from incompatible previous type
                                setBracketMin(''); setBracketMax('');
                                setPerN('');
                                // Seed position inputs from competition's position_rules
                                if (rt === 'POSITION') {
                                  const seed: Record<string, string> = {};
                                  for (const pos of Object.keys(competition.position_rules)) seed[pos] = '0';
                                  setPositionPts(seed);
                                } else {
                                  setPositionPts({});
                                }
                              }}
                            >
                              <option value="PER_UNIT">Per unit — value × points</option>
                              <option value="FLAT">Flat — fixed points when stat &gt; 0</option>
                              <option value="BRACKET">Bracket — points when value in range</option>
                              <option value="PER_N">Per N — floor(value ÷ N) × points</option>
                              <option value="POSITION">Position-based — points by position</option>
                            </select>
                          </label>

                          {/* ── BRACKET fields ── */}
                          {ruleType === 'BRACKET' && (
                            <>
                              <label className="fa-field">
                                <span>Minimum value (inclusive) *</span>
                                <input
                                  aria-label="bracket minimum"
                                  type="number" min="0" step="1"
                                  value={bracketMin}
                                  onChange={e => setBracketMin(e.target.value)}
                                  placeholder="e.g. 1"
                                />
                              </label>
                              <label className="fa-field">
                                <span>Maximum value (inclusive) — leave empty for no upper bound</span>
                                <input
                                  aria-label="bracket maximum"
                                  type="number" min="1" step="1"
                                  value={bracketMax}
                                  onChange={e => setBracketMax(e.target.value)}
                                  placeholder="e.g. 59 — or leave empty for 60+"
                                />
                              </label>
                            </>
                          )}

                          {/* ── PER_N field ── */}
                          {ruleType === 'PER_N' && (
                            <label className="fa-field">
                              <span>Every N units *</span>
                              <input
                                aria-label="per n value"
                                type="number" min="1" step="1"
                                value={perN}
                                onChange={e => setPerN(e.target.value)}
                                placeholder="e.g. 3"
                              />
                            </label>
                          )}

                          {/* ── POSITION fields ── */}
                          {ruleType === 'POSITION' && (
                            <div className="fa-form-grid-fullwidth" style={{ display:'flex', flexDirection:'column', gap:6 }}>
                              <span style={{ fontSize:'0.82rem', fontWeight:600 }}>Points per position</span>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                                {Object.keys(competition.position_rules).map(pos => (
                                  <label key={pos} className="fa-field" style={{ minWidth:80 }}>
                                    <span>{pos}</span>
                                    <input
                                      aria-label={`position points ${pos}`}
                                      type="number" step="1"
                                      value={positionPts[pos] ?? '0'}
                                      onChange={e => setPositionPts(prev => ({ ...prev, [pos]: e.target.value }))}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Points ── */}
                          {ruleType !== 'POSITION' && (
                            <label className="fa-field">
                              <span>
                                {ruleType === 'FLAT' ? 'Points (flat)' :
                                 ruleType === 'BRACKET' ? 'Points awarded when in range' :
                                 ruleType === 'PER_N' ? 'Points per N' :
                                 'Points per unit'}
                              </span>
                              <input
                                aria-label="points per unit"
                                type="number" step="any"
                                value={points}
                                onChange={e => setPoints(e.target.value)}
                                placeholder="e.g. 3 or -1"
                              />
                            </label>
                          )}

                          <label className="fa-checkbox-row">
                            <input
                              type="checkbox"
                              aria-label="rule enabled"
                              checked={newRuleEnabled}
                              onChange={e => setNewRuleEnabled(e.target.checked)}
                            />
                            Active (rule will participate in scoring immediately)
                          </label>

                          <button
                            className="fa-btn fa-btn--gradient"
                            disabled={
                              saving || !statistic ||
                              (ruleType !== 'POSITION' && (!points || isNaN(Number(points)))) ||
                              (ruleType === 'BRACKET' && bracketMin.trim() === '') ||
                              (ruleType === 'PER_N' && (perN.trim() === '' || Number(perN) < 1)) ||
                              (ruleType === 'POSITION' && Object.keys(positionPts).length === 0)
                            }
                            onClick={() => {
                              const condErr = validateConditions(ruleType, bracketMin, bracketMax, perN, positionPts);
                              if (condErr) { setError(condErr); return; }
                              const conditions = buildConditions(ruleType, bracketMin, bracketMax, perN, positionPts);
                              const effectivePoints = ruleType === 'POSITION' ? '0' : points;
                              void run(
                                () => adminCreateScoringRule({
                                  fantasy_competition: competition.id,
                                  statistic_type: statistic,
                                  rule_type: ruleType,
                                  points: effectivePoints,
                                  conditions,
                                  enabled: newRuleEnabled,
                                }),
                                'Scoring rule added.',
                              ).then(ok => {
                                if (ok) {
                                  setStatistic(''); setPoints(''); setRuleType('PER_UNIT');
                                  setBracketMin(''); setBracketMax('');
                                  setPerN(''); setPositionPts({});
                                  setNewRuleEnabled(true);
                                }
                              });
                            }}
                          >
                            Add rule
                          </button>
                        </div>
                      )
                    }
                    <h2>Current Scoring Rules</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead>
                          <tr>
                            <th>Statistic</th>
                            <th>Rule type</th>
                            <th>Rule</th>
                            <th>Enabled</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {!competition.scoring_rules.length && (
                            <tr className="fa-table__empty"><td colSpan={5}>No scoring rules defined yet.</td></tr>
                          )}
                          {competition.scoring_rules.map((r: FantasyScoringRule) => {
                            const rt = r.rule_type ?? 'PER_UNIT';
                            return (
                              <tr key={r.id}>
                                <td>{r.statistic_type}</td>
                                <td style={{ fontSize:'0.76rem', color:'var(--color-text-muted)' }}>{rt}</td>
                                <td style={{ fontSize:'0.84rem' }}><strong>{describeRule(r)}</strong></td>
                                <td>{r.enabled ? <span className="fa-status-pill fa-status-pill--open">Yes</span> : <span className="fa-status-pill fa-status-pill--unavailable">No</span>}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      className="fa-btn fa-btn--sm"
                                      aria-label={`Edit scoring rule ${r.statistic_type}`}
                                      onClick={() => {
                                        const editRt: ScoringRuleType = (r.rule_type as ScoringRuleType) ?? 'PER_UNIT';
                                        const editConditions = r.conditions ?? {};
                                        // Decode conditions back into form fields
                                        let eMin = '', eMax = '', ePerN = '';
                                        let ePosPts: Record<string, string> = {};
                                        if (editRt === 'BRACKET') {
                                          const bc = editConditions as { min?: number; max?: number | null };
                                          eMin = bc.min != null ? String(bc.min) : '';
                                          eMax = bc.max != null ? String(bc.max) : '';
                                        }
                                        if (editRt === 'PER_N') {
                                          const nc = editConditions as { per_n?: number };
                                          ePerN = nc.per_n != null ? String(nc.per_n) : '';
                                        }
                                        if (editRt === 'POSITION') {
                                          const pc = editConditions as { positions?: Record<string, number> };
                                          ePosPts = Object.fromEntries(
                                            Object.entries(pc.positions ?? {}).map(([k, v]) => [k, String(v)])
                                          );
                                        }
                                        setEditingScoringRuleId(r.id);
                                        setScoringRuleEdit({
                                          points: String(r.points),
                                          enabled: r.enabled,
                                          ruleType: editRt,
                                          bracketMin: eMin,
                                          bracketMax: eMax,
                                          perN: ePerN,
                                          positionPts: ePosPts,
                                        });
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="fa-btn fa-btn--sm fa-btn--danger"
                                      aria-label={`Delete scoring rule ${r.statistic_type}`}
                                      onClick={() => setDeleteTarget({ kind: 'scoring_rule', id: r.id, name: r.statistic_type })}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ════ CORRECTIONS ════ */}
            {tab === 'corrections' && (
              <section className="fa-panel">
                <h2>Scoring Corrections</h2>
                <p style={{ margin:'-10px 0 0', fontSize:'0.83rem', color:'var(--color-text-secondary)' }}>
                  Corrections are immutable and audit-trailed. A reason is required. Corrections cannot be edited or deleted.
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
                      {correctionPoint && correctionValue && (
                        <p style={{ gridColumn:'1/-1', margin:0, padding:'10px 14px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:8, fontSize:'0.83rem', color:'#fde047' }}>
                          <strong>Preview:</strong> {pointRecords.find(r => r.id === correctionPoint)?.player.player_name} — current: <strong>{pointRecords.find(r => r.id === correctionPoint)?.total_points}</strong> → new: <strong>{correctionValue}</strong>
                        </p>
                      )}
                      <label className="fa-field fa-form-grid-fullwidth">
                        <span>Audit reason *</span>
                        <textarea value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Required — explain why this correction is necessary" rows={3} />
                      </label>
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !correctionPoint || !correctionValue || isNaN(Number(correctionValue)) || !correctionReason.trim()}
                        onClick={() => setShowCorrectionConfirm(true)}
                      >
                        Submit correction
                      </button>
                    </div>
                    <h2>Correction History</h2>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Player</th><th>Previous</th><th>Corrected</th><th>Reason</th><th>Actor</th><th>Created</th></tr></thead>
                        <tbody>
                          {!corrections.length && <tr className="fa-table__empty"><td colSpan={6}>No corrections for this gameweek.</td></tr>}
                          {corrections.map(r => (
                            <tr key={String(r.id)}>
                              <td>{String(r.player_name)}</td>
                              <td>{String(r.previous_value)}</td>
                              <td><strong>{String(r.new_value)}</strong></td>
                              <td style={{ maxWidth:220, whiteSpace:'normal' }}>{String(r.reason)}</td>
                              <td>{r.actor ? String(r.actor) : '—'}</td>
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

            {/* ════ LEADERBOARDS ════ */}
            {tab === 'leaderboards' && (
              <section className="fa-panel">
                <div className="fa-comp-selector" style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
                  <label className="fa-field">
                    <span>Competition</span>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}>
                      {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Gameweek leaderboard</span>
                    <select value={selectedGwId} onChange={e => { setSelectedGwId(e.target.value); void fetchGameweekLeaderboard(e.target.value).then(setGameweekBoard).catch(() => setGameweekBoard([])); }}>
                      <option value="">— Overall only —</option>
                      {allGameweeks.map(r => <option key={r.id} value={r.id}>{r.name} · {r.status}</option>)}
                    </select>
                  </label>
                  <button className="fa-btn fa-btn--sm" disabled={lbLoading} onClick={() => void refreshLeaderboard()}>
                    {lbLoading ? 'Refreshing…' : '↺ Refresh'}
                  </button>
                </div>
                {competitionId && <p style={{ margin:0, fontSize:'0.78rem', color:'var(--color-text-muted)' }}>Competition: <strong>{competitionName(competitionId)}</strong>{selectedGwId ? ` · Gameweek: ${allGameweeks.find(g => g.id === selectedGwId)?.name}` : ' · Overall standings'}</p>}

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
                    <h2>Gameweek Standings — {allGameweeks.find(g => g.id === selectedGwId)?.name}</h2>
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

            {/* ════ LEAGUES ════ */}
            {tab === 'leagues' && (
              <section className="fa-panel">
                <h2>Fan League Overview</h2>
                <div className="fa-table-wrap">
                  <table className="fa-table">
                    <thead><tr><th>League</th><th>Competition</th><th>Visibility</th><th>Owner</th><th>Members</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {!leagueOverview.length && <tr className="fa-table__empty"><td colSpan={8}>No fan leagues created yet.</td></tr>}
                      {leagueOverview.map(r => (
                        <>
                          <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => void openLeague(r.id)}>
                            <td><strong>{r.name}</strong></td>
                            <td>{competitionName(r.fantasy_competition)}</td>
                            <td>{r.visibility}</td>
                            <td>{r.owner}</td>
                            <td>{r.member_count}</td>
                            <td>{r.capacity ?? 'Unlimited'}</td>
                            <td><span className={`fa-status-pill fa-status-pill--${r.status.toLowerCase()}`}>{r.status}</span></td>
                            <td style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{openLeagueId === r.id ? '▲' : '▼'}</td>
                          </tr>
                          {openLeagueId === r.id && (
                            <tr key={`${r.id}-members`}>
                              <td colSpan={8} style={{ padding:'0 0 12px', background:'var(--color-bg-elevated,#0f0a1d)' }}>
                                {!leagueMembers.length
                                  ? <p style={{ margin:'12px 14px', fontSize:'0.83rem', color:'var(--color-text-muted)' }}>No members yet.</p>
                                  : (
                                    <table className="fa-table" style={{ marginTop:4 }}>
                                      <thead><tr><th>Rank</th><th>Team</th><th>Manager</th><th>Points</th><th>Joined</th></tr></thead>
                                      <tbody>
                                        {leagueMembers.map(m => (
                                          <tr key={m.team_id}>
                                            <td>{m.rank}</td>
                                            <td>{m.fantasy_team}</td>
                                            <td>{m.manager}</td>
                                            <td>{m.total_points}</td>
                                            <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )
                                }
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ════ MATCH STATISTICS ════ */}
            {tab === 'match-stats' && (
              <>
                {/* PRIMARY: Admin review / management workflow */}
                <MatchStatisticsReview
                  competitions={competitions}
                  allGameweeks={allGameweeks}
                />

                {/* SECONDARY: Test data entry tool (dev / seeding use only) */}
                <details className="fa-panel" style={{ padding: 0 }}>
                  <summary
                    style={{
                      padding: 'clamp(14px,2.5vw,20px) clamp(18px,3vw,26px)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      color: 'var(--color-text-secondary)',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', opacity: 0.7 }}>▶</span>
                    Developer tool — Create statistic manually (test / seed data only)
                  </summary>

                  <div style={{ padding: '0 clamp(18px,3vw,26px) clamp(18px,3vw,26px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', padding: '10px 14px', background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                      <strong>⚠ Dev / test tool.</strong> Use this only to seed MatchPlayerStatistic records when testing
                      the scoring engine without a real Club Admin feed. In production, Club Admin uploads match data —
                      use the review panel above to manage it.
                    </p>

                    {/* Competition selector */}
                    <div className="fa-comp-selector">
                      <label className="fa-field">
                        <span>Fantasy Competition</span>
                        <select
                          value={msCompId}
                          onChange={async e => {
                            const cId = e.target.value;
                            setMsCompId(cId);
                            setMsFixtureId(''); setMsParticipantId(''); setMsStatType(''); setMsValue('');
                            setMsCreated(null); setMsHistory([]);
                            if (!cId) { setMsFixtures([]); setMsPlayers([]); setMsStatTypes([]); return; }
                            try {
                              const [fixtures, players, types] = await Promise.all([
                                fetchFantasyFixtureCandidates(cId),
                                fetchFantasyPlayers(cId),
                                fetchFantasyStatisticTypes(cId),
                              ]);
                              setMsFixtures(fixtures); setMsPlayers(players); setMsStatTypes(types);
                            } catch (e) { setError(err(e)); }
                          }}
                        >
                          <option value="">— Select competition —</option>
                          {competitions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                    </div>

                    {msCompId && (
                      <>
                        <div className="fa-form-grid">
                          <label className="fa-field">
                            <span>Fixture *</span>
                            <select value={msFixtureId} onChange={e => { setMsFixtureId(e.target.value); setMsCreated(null); }}>
                              <option value="">— Select fixture —</option>
                              {msFixtures.map(f => <option key={f.id} value={f.id}>{f.name} — {f.status}</option>)}
                            </select>
                          </label>
                          <label className="fa-field">
                            <span>Player *</span>
                            <select value={msParticipantId} onChange={e => { setMsParticipantId(e.target.value); setMsCreated(null); }}>
                              <option value="">— Select player —</option>
                              {msPlayers.map(p => <option key={p.id} value={p.player}>{p.player_name} — {p.position} — {p.club}</option>)}
                            </select>
                          </label>
                          <label className="fa-field">
                            <span>Statistic Type *</span>
                            <select value={msStatType} onChange={e => { setMsStatType(e.target.value); setMsCreated(null); }}>
                              <option value="">— Select —</option>
                              {msStatTypes.map(s => <option key={s.code} value={s.code}>{s.label}{!s.observed ? ' (no data yet)' : ''}</option>)}
                            </select>
                          </label>
                          <label className="fa-field">
                            <span>Value *</span>
                            <input type="number" min="0" step="any" value={msValue} onChange={e => { setMsValue(e.target.value); setMsCreated(null); }} placeholder="e.g. 2" />
                          </label>
                          <button
                            className="fa-btn fa-btn--gradient"
                            disabled={saving || !msFixtureId || !msParticipantId || !msStatType || !msValue || isNaN(Number(msValue))}
                            onClick={async () => {
                              setError(''); setNotice(''); setSaving(true); setMsCreated(null);
                              try {
                                const created = await createMatchPlayerStatistic({ fixture: msFixtureId, participant: msParticipantId, stat_type: msStatType, value: msValue });
                                setMsCreated(created);
                                setNotice(`✓ Statistic created: ${created.participant_name} — ${created.stat_type} = ${created.value} in ${created.fixture_name}.`);
                                try { const history = await fetchMatchPlayerStatistics(); setMsHistory(history); } catch { /* non-fatal */ }
                              } catch (e) { setError(err(e)); } finally { setSaving(false); }
                            }}
                          >
                            Create Statistic
                          </button>
                        </div>

                        {msCreated && (
                          <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8 }}>
                            <p style={{ margin: 0, fontSize: '0.86rem', color: '#86efac' }}>
                              <strong>✓ Statistic created:</strong> {msCreated.participant_name} — {msCreated.stat_type} = {msCreated.value} in {msCreated.fixture_name}
                            </p>
                            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#bbf7d0' }}>
                              <strong>MatchCentre:</strong> {msCreated.match_centre_created ? 'Created automatically' : 'Re-used existing'}
                            </p>
                          </div>
                        )}

                        {/* Recalculate */}
                        <div style={{ padding: '16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>Recalculate Fantasy Points</h4>
                          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            Creating a statistic does <strong>not</strong> automatically update fantasy points.
                            Select a gameweek and recalculate to apply scoring rules.
                          </p>
                          <div className="fa-form-grid">
                            <label className="fa-field">
                              <span>Gameweek</span>
                              <select value={msGwId} onChange={e => { setMsGwId(e.target.value); setMsGwRecalcResult(null); }}>
                                <option value="">— Select gameweek —</option>
                                {allGameweeks.filter(gw => gw.fantasy_competition === msCompId).map(gw => (
                                  <option key={gw.id} value={gw.id}>{gw.name} — {gw.status}</option>
                                ))}
                              </select>
                            </label>
                            <button className="fa-btn fa-btn--gradient" disabled={saving || !msGwId}
                              onClick={async () => {
                                setError(''); setNotice(''); setSaving(true); setMsGwRecalcResult(null);
                                try { const result = await adminRecalculateGameweek(msGwId); setMsGwRecalcResult(result.detail); setNotice(`✓ ${result.detail}`); }
                                catch (e) { setError(err(e)); } finally { setSaving(false); }
                              }}
                            >
                              Recalculate
                            </button>
                          </div>
                          {msGwRecalcResult && <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#86efac' }}>{msGwRecalcResult}</p>}
                        </div>

                        {/* History */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h3 style={{ margin: 0 }}>Recent Statistics</h3>
                          <button className="fa-btn fa-btn--sm" onClick={async () => { try { const history = await fetchMatchPlayerStatistics(); setMsHistory(history); } catch (e) { setError(err(e)); } }}>↺ Refresh</button>
                        </div>
                        <div className="fa-table-wrap">
                          <table className="fa-table">
                            <thead><tr><th>Player</th><th>Fixture</th><th>Statistic</th><th>Value</th></tr></thead>
                            <tbody>
                              {!msHistory.length && <tr className="fa-table__empty"><td colSpan={4}>No statistics yet. Click Refresh after creating one.</td></tr>}
                              {msHistory.map(s => (
                                <tr key={s.id}>
                                  <td>{s.participant_name}</td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.fixture_name}</td>
                                  <td>{s.stat_type}</td>
                                  <td><strong>{s.value}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </details>
              </>
            )}
          </>
        )}

        {/* ════ ADD CANONICAL COMPETITION / SEASON MODAL ════ */}
        {showCanonicalModal && (
          <div className="fa-modal-overlay" onClick={() => setShowCanonicalModal(false)}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add canonical competition or season" style={{ maxWidth: 560 }}>
              <h2>Add Competition / Season</h2>
              <p>Create a canonical competition or season in the League OS sports catalog.</p>

              {/* Mode toggle */}
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <button
                  className={`fa-btn fa-btn--sm${canonicalMode === 'competition' ? ' fa-btn--gradient' : ''}`}
                  onClick={() => { setCanonicalMode('competition'); setCanonicalFormErrors({}); setCanonicalError(''); setCanonicalSuccess(''); }}
                >
                  Add Competition
                </button>
                <button
                  className={`fa-btn fa-btn--sm${canonicalMode === 'season' ? ' fa-btn--gradient' : ''}`}
                  onClick={() => { setCanonicalMode('season'); setCanonicalFormErrors({}); setCanonicalError(''); setCanonicalSuccess(''); }}
                >
                  Add Season
                </button>
              </div>

              {canonicalError && (
                <div className="fa-error-banner" role="alert" style={{ marginBottom:12 }}>
                  <span>{canonicalError}</span>
                </div>
              )}
              {canonicalSuccess && (
                <div className="fa-success-banner" role="status" style={{ marginBottom:12 }}>
                  <span>✓ {canonicalSuccess}</span>
                </div>
              )}

              <div className="fa-modal-form">
                <div className="fa-form-grid">
                  <label className={fieldCls(canonicalFormErrors,'sport')}>
                    <span>Sport *</span>
                    <select value={canonicalForm.sport} onChange={e => setCanonicalForm({ ...canonicalForm, sport: e.target.value })}>
                      <option value="">— Select —</option>
                      {canonicalSports.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    {canonicalFormErrors.sport && <span className="fa-field-error">{canonicalFormErrors.sport}</span>}
                  </label>

                  {canonicalMode === 'competition' ? (
                    <>
                      <label className={fieldCls(canonicalFormErrors,'name')}>
                        <span>Competition name *</span>
                        <input value={canonicalForm.name} onChange={e => setCanonicalForm({ ...canonicalForm, name: e.target.value })} placeholder="e.g. Uganda Premier League" />
                        {canonicalFormErrors.name && <span className="fa-field-error">{canonicalFormErrors.name}</span>}
                      </label>
                      <label className="fa-field">
                        <span>Country code</span>
                        <input value={canonicalForm.country_code} maxLength={2} onChange={e => setCanonicalForm({ ...canonicalForm, country_code: e.target.value.toUpperCase() })} placeholder="UG" />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className={fieldCls(canonicalFormErrors,'competition')}>
                        <span>Canonical competition *</span>
                        <select value={canonicalForm.competition} onChange={e => setCanonicalForm({ ...canonicalForm, competition: e.target.value })}>
                          <option value="">— Select —</option>
                          {canonicalCompetitions.filter(c => !canonicalForm.sport || c.sport_slug === (canonicalSports.find(s => s.id === canonicalForm.sport)?.slug ?? '')).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        {canonicalFormErrors.competition && <span className="fa-field-error">{canonicalFormErrors.competition}</span>}
                      </label>
                      <label className={fieldCls(canonicalFormErrors,'season_name')}>
                        <span>Season name *</span>
                        <input value={canonicalForm.season_name} onChange={e => setCanonicalForm({ ...canonicalForm, season_name: e.target.value })} placeholder="e.g. 2026" />
                        {canonicalFormErrors.season_name && <span className="fa-field-error">{canonicalFormErrors.season_name}</span>}
                      </label>
                      <label className="fa-field">
                        <span>Starts on</span>
                        <input type="date" value={canonicalForm.starts_on} onChange={e => setCanonicalForm({ ...canonicalForm, starts_on: e.target.value })} />
                      </label>
                      <label className="fa-field">
                        <span>Ends on</span>
                        <input type="date" value={canonicalForm.ends_on} onChange={e => setCanonicalForm({ ...canonicalForm, ends_on: e.target.value })} />
                      </label>
                    </>
                  )}

                  <label className="fa-checkbox-row">
                    <input type="checkbox" checked={canonicalForm.is_active} onChange={e => setCanonicalForm({ ...canonicalForm, is_active: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>

              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => setShowCanonicalModal(false)}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={canonicalSaving} onClick={() => void submitCanonical()}>
                  {canonicalSaving ? 'Saving…' : canonicalMode === 'competition' ? 'Create Competition' : 'Create Season'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ EDIT COMPETITION MODAL ════ */}
        {competitionEdit && (
          <div className="fa-modal-overlay" onClick={() => { setEditingCompId(''); setCompetitionEdit(null); }}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit Fantasy competition" style={{ maxWidth: 640 }}>
              <h2>Edit {competitions.find(r => r.id === editingCompId)?.name}</h2>
              <p>Real competition and season are read-only. Changes save immediately on confirm.</p>
              <div className="fa-modal-form">
                <div className="fa-form-grid">

                  {/* ── Identity ─────────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Identity</div>
                  <label className={fieldCls(compEditErrors,'name')}>
                    <span>Name</span>
                    <input aria-label="name" type="text" value={competitionEdit.name} onChange={e => setCompetitionEdit({ ...competitionEdit, name: e.target.value })} />
                    {compEditErrors.name && <span className="fa-field-error">{compEditErrors.name}</span>}
                  </label>
                  <label className="fa-field">
                    <span>Description</span>
                    <input aria-label="description" type="text" value={competitionEdit.description} onChange={e => setCompetitionEdit({ ...competitionEdit, description: e.target.value })} />
                  </label>

                  {/* ── Visibility & Access ───────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Visibility &amp; Access</div>
                  <label className="fa-field">
                    <span>Visibility</span>
                    <select aria-label="visibility" value={competitionEdit.visibility} onChange={e => setCompetitionEdit({ ...competitionEdit, visibility: e.target.value as FantasyCompetition['visibility'] })}>
                      <option value="PUBLIC">Public — anyone can join</option>
                      <option value="PRIVATE">Private — invite only</option>
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Registration state</span>
                    <select aria-label="registration state" value={competitionEdit.registration_state} onChange={e => setCompetitionEdit({ ...competitionEdit, registration_state: e.target.value as FantasyCompetition['registration_state'] })}>
                      <option value="OPEN">Open — fans can register</option>
                      <option value="CLOSED">Closed — no new entries</option>
                    </select>
                  </label>
                  <label className="fa-field">
                    <span>Registration deadline</span>
                    <input aria-label="registration deadline" type="datetime-local" value={competitionEdit.registration_deadline} onChange={e => setCompetitionEdit({ ...competitionEdit, registration_deadline: e.target.value })} />
                  </label>
                  <div className="fa-form-grid-fullwidth" style={{ display:'flex', gap:24, flexWrap:'wrap', paddingTop:2 }}>
                    <label className="fa-checkbox-row">
                      <input type="checkbox" checked={competitionEdit.enabled} onChange={e => setCompetitionEdit({ ...competitionEdit, enabled: e.target.checked })} />
                      Enabled (visible to fans)
                    </label>
                    <label className="fa-checkbox-row">
                      <input type="checkbox" checked={competitionEdit.vice_captain_fallback} onChange={e => setCompetitionEdit({ ...competitionEdit, vice_captain_fallback: e.target.checked })} />
                      Vice-captain fallback
                    </label>
                  </div>

                  {/* ── Squad Rules ───────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Squad Rules</div>
                  {(['squad_size','starting_lineup_size','bench_size'] as const).map(f => (
                    <label key={f} className={fieldCls(compEditErrors, f)}>
                      <span>{f.replaceAll('_',' ')}</span>
                      <input aria-label={f.replaceAll('_',' ')} type="number" min="0" value={competitionEdit[f]} onChange={e => setCompetitionEdit({ ...competitionEdit, [f]: e.target.value })} />
                      {compEditErrors[f] && <span className="fa-field-error">{compEditErrors[f]}</span>}
                    </label>
                  ))}
                  <label className={fieldCls(compEditErrors,'initial_budget')}>
                    <span>Starting budget (M)</span>
                    <input aria-label="initial budget" type="number" min="1" step="0.5" value={competitionEdit.initial_budget} onChange={e => setCompetitionEdit({ ...competitionEdit, initial_budget: e.target.value })} />
                    {compEditErrors.initial_budget && <span className="fa-field-error">{compEditErrors.initial_budget}</span>}
                  </label>
                  <label className={fieldCls(compEditErrors,'max_players_per_team')}>
                    <span>Max players per club</span>
                    <input aria-label="max players per team" type="number" min="1" value={competitionEdit.max_players_per_team} onChange={e => setCompetitionEdit({ ...competitionEdit, max_players_per_team: e.target.value })} />
                    {compEditErrors.max_players_per_team && <span className="fa-field-error">{compEditErrors.max_players_per_team}</span>}
                  </label>
                  <label className="fa-field">
                    <span>Captain score multiplier</span>
                    <input aria-label="captain multiplier" type="number" min="1" step="0.5" value={competitionEdit.captain_multiplier} onChange={e => setCompetitionEdit({ ...competitionEdit, captain_multiplier: e.target.value })} />
                  </label>

                  {/* ── Position Limits ───────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Position Limits</div>
                  <label className={`fa-field fa-form-grid-fullwidth ${compEditErrors.position_rules ? 'fa-field--error' : ''}`}>
                    <span>Position limits <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6 }}>squad count per position — enter contents without outer {'{ }'}, e.g. <code style={{ fontFamily:'monospace', fontSize:'0.82em' }}>"GK":2,"DEF":5,"MID":5,"FWD":3</code></small></span>
                    <textarea aria-label="position rules" value={competitionEdit.position_rules} rows={3}
                      placeholder={'"GK":2,"DEF":5,"MID":5,"FWD":3'}
                      onChange={e => { setCompetitionEdit({ ...competitionEdit, position_rules: e.target.value }); setCompEditErrors(p => ({ ...p, position_rules: '' })); }} />
                    {compEditErrors.position_rules && <span className="fa-field-error">{compEditErrors.position_rules}</span>}
                  </label>
                  <label className={`fa-field fa-form-grid-fullwidth ${compEditErrors.formation_rules ? 'fa-field--error' : ''}`}>
                    <span>Starting XI limits <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6 }}>min/max starters per position — enter contents without outer {'{ }'}, e.g. <code style={{ fontFamily:'monospace', fontSize:'0.82em' }}>"GK":{'{"min":1,"max":1}'}</code></small></span>
                    <textarea aria-label="formation rules" value={competitionEdit.formation_rules} rows={3}
                      placeholder={'"GK":{"min":1,"max":1}'}
                      onChange={e => { setCompetitionEdit({ ...competitionEdit, formation_rules: e.target.value }); setCompEditErrors(p => ({ ...p, formation_rules: '' })); }} />
                    {compEditErrors.formation_rules && <span className="fa-field-error">{compEditErrors.formation_rules}</span>}
                  </label>

                  {/* ── Transfer Rules ────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Transfer Rules</div>
                  <label className={fieldCls(compEditErrors,'free_transfers_per_gameweek')}>
                    <span>Free transfers per gameweek</span>
                    <input aria-label="free transfers per gameweek" type="number" min="0" value={competitionEdit.free_transfers_per_gameweek} onChange={e => setCompetitionEdit({ ...competitionEdit, free_transfers_per_gameweek: e.target.value })} />
                    {compEditErrors.free_transfers_per_gameweek && <span className="fa-field-error">{compEditErrors.free_transfers_per_gameweek}</span>}
                  </label>
                  <label className={fieldCls(compEditErrors,'transfer_penalty')}>
                    <span>Penalty per extra transfer</span>
                    <input aria-label="transfer penalty" type="number" min="0" value={competitionEdit.transfer_penalty} onChange={e => setCompetitionEdit({ ...competitionEdit, transfer_penalty: e.target.value })} />
                    {compEditErrors.transfer_penalty && <span className="fa-field-error">{compEditErrors.transfer_penalty}</span>}
                  </label>

                  {/* ── Advanced ──────────────────────────────── */}
                  <div className="fa-form-section-label fa-form-grid-fullwidth">Advanced (JSON)</div>
                  {/* tie_break_rules is a JSON array — kept as-is, user types the full [...] value */}
                  <label className={`fa-field fa-form-grid-fullwidth ${compEditErrors.tie_break_rules ? 'fa-field--error' : ''}`}>
                    <span>tie break rules <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6 }}>JSON array — e.g. <code style={{ fontFamily:'monospace', fontSize:'0.82em' }}>["total_points","earlier_registration"]</code></small></span>
                    <textarea aria-label="tie break rules" value={competitionEdit.tie_break_rules} rows={3}
                      onChange={e => { setCompetitionEdit({ ...competitionEdit, tie_break_rules: e.target.value }); setCompEditErrors(p => ({ ...p, tie_break_rules: '' })); }} />
                    {compEditErrors.tie_break_rules && <span className="fa-field-error">{compEditErrors.tie_break_rules}</span>}
                  </label>
                  {/* prize_metadata and gameweek_rules are JSON objects — user enters contents without outer { } */}
                  {(['prize_metadata','gameweek_rules'] as const).map(f => (
                    <label key={f} className={`fa-field fa-form-grid-fullwidth ${compEditErrors[f] ? 'fa-field--error' : ''}`}>
                      <span>{f.replaceAll('_',' ')} <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6 }}>enter contents without outer {'{ }'}</small></span>
                      <textarea aria-label={f.replaceAll('_',' ')} value={competitionEdit[f]} rows={3}
                        onChange={e => { setCompetitionEdit({ ...competitionEdit, [f]: e.target.value }); setCompEditErrors(p => ({ ...p, [f]: '' })); }} />
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

        {/* ════ EDIT PLAYER MODAL ════ */}
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
                <label className="fa-field">
                  <span>Starting Points</span>
                  <input type="number" min="0" step="0.5" value={playerEdit.starting_points} onChange={e => setPlayerEdit({ ...playerEdit, starting_points: e.target.value })} placeholder="0" />
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

        {/* ════ GAMEWEEK ACTION CONFIRMATION ════ */}
        {confirmGwAction && (
          <div className="fa-modal-overlay" onClick={() => setConfirmGwAction(null)}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Confirm gameweek action" style={{ maxWidth: 400 }}>
              <h2>Confirm</h2>
              <p>{confirmGwAction.label}</p>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => setConfirmGwAction(null)}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => {
                  const { action, success } = confirmGwAction;
                  setConfirmGwAction(null);
                  void runAndRefreshGameweeks(action, success);
                }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* ════ DELETE CONFIRMATION ════ */}
        {deleteTarget && (
          <div className="fa-modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="fa-modal fa-modal--danger" onClick={e => e.stopPropagation()} role="dialog" aria-label="Confirm delete" style={{ maxWidth: 420 }}>
              <h2>Delete {deleteTarget.kind === 'competition' ? 'Competition' : deleteTarget.kind === 'scoring_rule' ? 'Scoring Rule' : 'Player'}</h2>
              <p>
                Are you sure you want to delete{' '}
                <strong>{deleteTarget.name}</strong>?
                {deleteTarget.kind === 'competition' && (
                  <> This will also remove all associated players, gameweeks, and scoring rules.</>
                )}
                {deleteTarget.kind === 'scoring_rule' && (
                  <> This scoring rule will no longer apply to any future recalculations.</>
                )}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>This action cannot be undone.</p>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="fa-btn fa-btn--danger" disabled={saving} onClick={() => void confirmDelete()}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ EDIT SCORING RULE MODAL ════ */}
        {scoringRuleEdit && editingScoringRuleId && (
          <div className="fa-modal-overlay" onClick={() => { setEditingScoringRuleId(''); setScoringRuleEdit(null); }}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit scoring rule" style={{ maxWidth: 480 }}>
              <h2>Edit Scoring Rule</h2>
              <p>Statistic type is read-only. Update the rule type, conditions and points below.</p>
              <div className="fa-modal-form">
                {/* ── Rule Type ── */}
                <label className="fa-field">
                  <span>Rule type</span>
                  <select
                    aria-label="rule type"
                    value={scoringRuleEdit.ruleType}
                    onChange={e => {
                      const rt = e.target.value as ScoringRuleType;
                      setScoringRuleEdit(prev => prev ? {
                        ...prev,
                        ruleType: rt,
                        bracketMin: '',
                        bracketMax: '',
                        perN: '',
                        positionPts: rt === 'POSITION'
                          ? Object.fromEntries(Object.keys(competition?.position_rules ?? {}).map(p => [p, '0']))
                          : {},
                      } : null);
                    }}
                  >
                    <option value="PER_UNIT">Per unit — value × points</option>
                    <option value="FLAT">Flat — fixed points when stat &gt; 0</option>
                    <option value="BRACKET">Bracket — points when value in range</option>
                    <option value="PER_N">Per N — floor(value ÷ N) × points</option>
                    <option value="POSITION">Position-based — points by position</option>
                  </select>
                </label>

                {/* ── BRACKET fields ── */}
                {scoringRuleEdit.ruleType === 'BRACKET' && (
                  <>
                    <label className="fa-field">
                      <span>Minimum value (inclusive) *</span>
                      <input
                        aria-label="bracket minimum"
                        type="number" min="0" step="1"
                        value={scoringRuleEdit.bracketMin}
                        onChange={e => setScoringRuleEdit(prev => prev ? { ...prev, bracketMin: e.target.value } : null)}
                        placeholder="e.g. 1"
                      />
                    </label>
                    <label className="fa-field">
                      <span>Maximum value — leave empty for no upper bound</span>
                      <input
                        aria-label="bracket maximum"
                        type="number" min="1" step="1"
                        value={scoringRuleEdit.bracketMax}
                        onChange={e => setScoringRuleEdit(prev => prev ? { ...prev, bracketMax: e.target.value } : null)}
                        placeholder="empty = no upper bound"
                      />
                    </label>
                  </>
                )}

                {/* ── PER_N field ── */}
                {scoringRuleEdit.ruleType === 'PER_N' && (
                  <label className="fa-field">
                    <span>Every N units *</span>
                    <input
                      aria-label="per n value"
                      type="number" min="1" step="1"
                      value={scoringRuleEdit.perN}
                      onChange={e => setScoringRuleEdit(prev => prev ? { ...prev, perN: e.target.value } : null)}
                      placeholder="e.g. 3"
                    />
                  </label>
                )}

                {/* ── POSITION fields ── */}
                {scoringRuleEdit.ruleType === 'POSITION' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:'0.82rem', fontWeight:600 }}>Points per position</span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                      {Object.keys(competition?.position_rules ?? {}).map(pos => (
                        <label key={pos} className="fa-field" style={{ minWidth:80 }}>
                          <span>{pos}</span>
                          <input
                            aria-label={`position points ${pos}`}
                            type="number" step="1"
                            value={scoringRuleEdit.positionPts[pos] ?? '0'}
                            onChange={e => setScoringRuleEdit(prev => prev ? {
                              ...prev,
                              positionPts: { ...prev.positionPts, [pos]: e.target.value },
                            } : null)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Points (hidden for POSITION) ── */}
                {scoringRuleEdit.ruleType !== 'POSITION' && (
                  <label className="fa-field">
                    <span>
                      {scoringRuleEdit.ruleType === 'FLAT' ? 'Points (flat)' :
                       scoringRuleEdit.ruleType === 'BRACKET' ? 'Points awarded when in range' :
                       scoringRuleEdit.ruleType === 'PER_N' ? 'Points per N' :
                       'Points per unit'}
                    </span>
                    <input
                      aria-label="points per unit"
                      type="number" step="any"
                      value={scoringRuleEdit.points}
                      onChange={e => setScoringRuleEdit(prev => prev ? { ...prev, points: e.target.value } : null)}
                    />
                  </label>
                )}

                <label className="fa-checkbox-row">
                  <input
                    type="checkbox"
                    aria-label="rule enabled"
                    checked={scoringRuleEdit.enabled}
                    onChange={e => setScoringRuleEdit(prev => prev ? { ...prev, enabled: e.target.checked } : null)}
                  />
                  Enabled
                </label>
              </div>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => { setEditingScoringRuleId(''); setScoringRuleEdit(null); }}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void saveScoringRule()}>Save rule</button>
              </div>
            </div>
          </div>
        )}

        {/* ════ CORRECTION CONFIRMATION ════ */}
        {showCorrectionConfirm && (
          <div className="fa-modal-overlay" onClick={() => setShowCorrectionConfirm(false)}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Confirm correction" style={{ maxWidth: 420 }}>
              <h2>Confirm Correction</h2>
              <p>
                <strong>{pointRecords.find(r => r.id === correctionPoint)?.player.player_name}</strong><br />
                Current points: <strong>{pointRecords.find(r => r.id === correctionPoint)?.total_points}</strong><br />
                New points: <strong>{correctionValue}</strong><br />
                Reason: <em>{correctionReason}</em>
              </p>
              <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)' }}>This correction is immutable and cannot be edited or deleted after submission.</p>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => setShowCorrectionConfirm(false)}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void submitCorrection()}>Submit correction</button>
              </div>
            </div>
          </div>
        )}

        {/* ════ ADD NEW PLAYER MODAL ════ */}
        {showAddPlayerModal && competition && (
          <div className="fa-modal-overlay" onClick={() => { setShowAddPlayerModal(false); setAddPlayerForm(emptyAddPlayerForm); setAddPlayerErrors({}); }}>
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add new player" style={{ maxWidth: 620 }}>
              <h2>Add New Player</h2>
              <p style={{ margin: '-6px 0 12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Creates a new athlete record and adds them directly to the <strong>{competition.name}</strong> player pool.
                Use this when a club failed to submit a player who should be available in Fantasy.
              </p>
              <div className="fa-modal-form">
                <div className="fa-form-grid">

                  <div className="fa-form-section-label fa-form-grid-fullwidth">Player Information</div>

                  <label className={`fa-field${addPlayerErrors.first_name ? ' fa-field--error' : ''}`}>
                    <span>First Name *</span>
                    <input type="text" value={addPlayerForm.first_name} onChange={e => setAddPlayerForm({ ...addPlayerForm, first_name: e.target.value })} placeholder="e.g. John" />
                    {addPlayerErrors.first_name && <span className="fa-field-error">{addPlayerErrors.first_name}</span>}
                  </label>

                  <label className={`fa-field${addPlayerErrors.last_name ? ' fa-field--error' : ''}`}>
                    <span>Last Name *</span>
                    <input type="text" value={addPlayerForm.last_name} onChange={e => setAddPlayerForm({ ...addPlayerForm, last_name: e.target.value })} placeholder="e.g. Doe" />
                    {addPlayerErrors.last_name && <span className="fa-field-error">{addPlayerErrors.last_name}</span>}
                  </label>

                  <label className="fa-field">
                    <span>Jersey Number</span>
                    <input type="number" min="1" max="99" value={addPlayerForm.shirt_number} onChange={e => setAddPlayerForm({ ...addPlayerForm, shirt_number: e.target.value })} placeholder="Optional" />
                  </label>

                  <label className="fa-form-grid-fullwidth" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '2px 0 4px' }}>
                    Photo URL and Date of Birth can be updated later via the athlete profile editor.
                  </label>

                  <div className="fa-form-section-label fa-form-grid-fullwidth">Sporting Information</div>

                  <label className={`fa-field${addPlayerErrors.sport ? ' fa-field--error' : ''}`}>
                    <span>Sport *</span>
                    <input type="text" value={competition.sport} readOnly style={{ opacity: 0.7 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fixed to the selected competition's sport.</span>
                    {addPlayerErrors.sport && <span className="fa-field-error">{addPlayerErrors.sport}</span>}
                  </label>

                  <label className={`fa-field${addPlayerErrors.club ? ' fa-field--error' : ''}`}>
                    <span>Club / Team *</span>
                    <select value={addPlayerForm.club} onChange={e => setAddPlayerForm({ ...addPlayerForm, club: e.target.value })}>
                      <option value="">— Select club —</option>
                      {allClubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {addPlayerErrors.club && <span className="fa-field-error">{addPlayerErrors.club}</span>}
                  </label>

                  <label className={`fa-field${addPlayerErrors.profile_position ? ' fa-field--error' : ''}`}>
                    <span>Position (profile) *</span>
                    <select value={addPlayerForm.profile_position} onChange={e => setAddPlayerForm({ ...addPlayerForm, profile_position: e.target.value })}>
                      <option value="">— Select —</option>
                      {Object.keys(competition.position_rules).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {addPlayerErrors.profile_position && <span className="fa-field-error">{addPlayerErrors.profile_position}</span>}
                  </label>

                  <label className="fa-field">
  <span>Nationality</span>
  <select
    value={addPlayerForm.nationality}
    onChange={e => setAddPlayerForm({ ...addPlayerForm, nationality: e.target.value })}
  >
    <option value="">— Select nationality —</option>
    {allCountries.map(country => (
      <option key={country.id} value={country.id}>
        {country.name}
      </option>
    ))}
  </select>
</label>

                  <div className="fa-form-section-label fa-form-grid-fullwidth">Fantasy Information</div>

                  <label className={`fa-field${addPlayerErrors.fantasy_position ? ' fa-field--error' : ''}`}>
                    <span>Fantasy Position *</span>
                    <select value={addPlayerForm.fantasy_position} onChange={e => setAddPlayerForm({ ...addPlayerForm, fantasy_position: e.target.value })}>
                      <option value="">— Select —</option>
                      {Object.keys(competition.position_rules).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {addPlayerErrors.fantasy_position && <span className="fa-field-error">{addPlayerErrors.fantasy_position}</span>}
                  </label>

                  <label className={`fa-field${addPlayerErrors.price ? ' fa-field--error' : ''}`}>
                    <span>Fantasy Price (M) *</span>
                    <input type="number" min="0.1" step="0.1" value={addPlayerForm.price} onChange={e => setAddPlayerForm({ ...addPlayerForm, price: e.target.value })} placeholder="e.g. 6.5" />
                    {addPlayerErrors.price && <span className="fa-field-error">{addPlayerErrors.price}</span>}
                  </label>

                  <label className={`fa-field${addPlayerErrors.starting_points ? ' fa-field--error' : ''}`}>
                    <span>Starting Points</span>
                    <input type="number" min="0" step="0.5" value={addPlayerForm.starting_points} onChange={e => setAddPlayerForm({ ...addPlayerForm, starting_points: e.target.value })} placeholder="0" />
                    {addPlayerErrors.starting_points && <span className="fa-field-error">{addPlayerErrors.starting_points}</span>}
                  </label>

                  <label className="fa-field">
                    <span>Availability</span>
                    <select value={addPlayerForm.availability} onChange={e => setAddPlayerForm({ ...addPlayerForm, availability: e.target.value as FantasyAvailability })}>
                      {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>

                  <label className="fa-checkbox-row fa-form-grid-fullwidth">
                    <input type="checkbox" checked={addPlayerForm.eligible} onChange={e => setAddPlayerForm({ ...addPlayerForm, eligible: e.target.checked })} />
                    Eligible — player can be selected in Fantasy squads
                  </label>

                </div>
              </div>
              <div className="fa-modal__footer">
                <button className="fa-btn" onClick={() => { setShowAddPlayerModal(false); setAddPlayerForm(emptyAddPlayerForm); setAddPlayerErrors({}); }}>Cancel</button>
                <button className="fa-btn fa-btn--gradient" disabled={saving} onClick={() => void submitAddPlayer()}>
                  {saving ? 'Creating…' : 'Create Player & Add to Pool'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
