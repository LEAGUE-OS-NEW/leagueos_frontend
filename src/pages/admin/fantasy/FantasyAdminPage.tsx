import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  adminCreateCompetition, adminCreateCorrection, adminCreateGameweek, adminCreatePlayer,
  adminCreateScoringRule, adminDeleteCompetition, adminDeletePlayer,
  adminFinalizeGameweek, adminRecalculateGameweek, adminTransitionGameweek,
  adminUpdateCompetition, adminUpdateGameweek, adminUpdatePlayer,
  createCanonicalCompetition, createCanonicalSeason,
  fetchAdminCorrections, fetchAdminFantasyCompetitions, fetchAdminLeagueOverview,
  fetchCanonicalFantasyOptions, fetchCanonicalSports, fetchCompetitionLeaderboard,
  fetchFantasyFixtureCandidates, fetchFantasyGameweeks, fetchFantasyPlayerCandidates,
  fetchFantasyPlayers, fetchFantasyStatisticTypes, fetchGameweekLeaderboard, fetchGameweekPoints,
  fetchLeagueMembers,
 type CanonicalCompetition, type CanonicalSport,
  type FantasyAvailability, type FantasyCompetition, type FantasyPlayer, type FantasyStatisticType,
  type CanonicalFantasyOptions, type FantasyFixture, type FantasyGameweek,
  type FantasyLeagueOverview, type FantasyLeagueMember, type FantasyPlayerCandidate,
  type FantasyStanding, type FantasyTeamScore,
} from '../../../services/fantasyAdminService';
import { extractApiError } from '../../../services/apiUtils';
import './FantasyAdminPage.css';

/* ── helpers ─────────────────────────────────────────────── */

type Tab = 'overview'|'competitions'|'players'|'gameweeks'|'scoring'|'corrections'|'leaderboards'|'leagues';
const AVAILABILITY: FantasyAvailability[] = ['AVAILABLE','DOUBTFUL','INJURED','SUSPENDED','UNAVAILABLE'];

const err = (e: unknown) => {
  const details = extractApiError(e);
  const isAxiosError = e != null && typeof e === 'object' && 'response' in e;
  if (!isAxiosError && e instanceof Error) return e.message;
  const fieldErrors = Object.entries(details.fields)
    .filter(([k]) => !['non_field_errors','detail','message'].includes(k))
    .map(([k, msgs]) => `${k}: ${msgs.join(', ')}`)
    .join(' | ');
  return fieldErrors ? `${details.message} — ${fieldErrors}` : details.message;
};

function safeJson<T>(raw: string): [T, null] | [null, string] {
  try { return [JSON.parse(raw) as T, null]; }
  catch (e) { return [null, e instanceof Error ? e.message : 'Invalid JSON']; }
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
  gameweek_rules: JSON.stringify(row.gameweek_rules ?? {}, null, 2),
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
    transfer_penalty: '4', position_rules: '{}', formation_rules: '{}',
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
  const [playerEdit, setPlayerEdit] = useState<{position:string;price:string;eligible:boolean;availability:FantasyAvailability}|null>(null);

  // UI state
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  type DeleteTarget =
    | { kind: 'competition'; id: string; name: string }
    | { kind: 'player'; id: string; name: string };
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
    const e: Record<string,string> = {};
    if (!compForm.competition) e.competition = 'Required';
    if (!compForm.season)      e.season = 'Required';
    if (!compForm.name.trim()) e.name = 'Required';
    const sq = Number(compForm.squad_size);
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
    const [posRules, posErr] = safeJson<Record<string,number>>(compForm.position_rules);
    const [fmtRules, fmtErr] = safeJson<Record<string,{min:number;max:number}>>(compForm.formation_rules);
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
      enabled: true, visibility: 'PUBLIC', registration_state: 'OPEN',
      vice_captain_fallback: true,
      tie_break_rules: ['total_points','fewer_transfer_penalties','earlier_registration'],
      gameweek_rules: { deadline_hours_before_start: 1 },
    }), 'Fantasy competition created.');
    if (ok) setCompForm({ competition:'', season:'', name:'', description:'',
      squad_size:'', starting_lineup_size:'', bench_size:'',
      initial_budget:'100', max_players_per_team:'3', captain_multiplier:'2',
      free_transfers_per_gameweek:'1', transfer_penalty:'4',
      position_rules:'{}', formation_rules:'{}' });
  };

  /* ── competition edit ─────────────────────────────────── */

  const saveCompetition = async () => {
    if (!competitionEdit || !editingCompId) return;
    const e: Record<string,string> = {};
    const [posRules, posErr]   = safeJson<Record<string,number>>(competitionEdit.position_rules);
    const [fmtRules, fmtErr]   = safeJson<Record<string,{min:number;max:number}>>(competitionEdit.formation_rules);
    const [tieRules, tieErr]   = safeJson<string[]>(competitionEdit.tie_break_rules);
    const [prizeRules, prizeErr] = safeJson<Record<string,unknown>>(competitionEdit.prize_metadata);
    const [gwRules, gwErr]     = safeJson<Record<string,unknown>>(competitionEdit.gameweek_rules ?? '{}');
    if (posErr)   e.position_rules   = posErr;
    if (fmtErr)   e.formation_rules  = fmtErr;
    if (tieErr)   e.tie_break_rules  = tieErr;
    if (prizeErr) e.prize_metadata   = prizeErr;
    if (gwErr)    e.gameweek_rules   = gwErr;
    if (Object.keys(e).length) { setCompEditErrors(e); return; }
    // Validation passed — close the modal immediately so the UI feels responsive.
    const snapshot = { ...competitionEdit };
    const snapId = editingCompId;
    setEditingCompId(''); setCompetitionEdit(null); setCompEditErrors({});
    void run(() => adminUpdateCompetition(snapId, {
      name: snapshot.name, description: snapshot.description,
      enabled: snapshot.enabled, visibility: snapshot.visibility,
      registration_state: snapshot.registration_state,
      registration_deadline: snapshot.registration_deadline || null,
      squad_size: Number(snapshot.squad_size),
      starting_lineup_size: Number(snapshot.starting_lineup_size),
      bench_size: Number(snapshot.bench_size),
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
      eligible: snapshot.eligible, availability: snapshot.availability,
    }), 'Fantasy player updated.');
  };

  /* ── delete competition / player ─────────────────────── */

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id: targetId, name } = deleteTarget;
    setDeleteTarget(null);
    if (kind === 'competition') {
      await run(() => adminDeleteCompetition(targetId), `"${name}" deleted.`);
      // If the deleted competition was selected, fall back to the first remaining one.
      setCompetitionId(cur => cur === targetId ? '' : cur);
    } else {
      await runAndRefreshPlayers(() => adminDeletePlayer(targetId), `"${name}" removed from pool.`);
    }
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
  const pooledPlayerIds = new Set(currentPlayers.map(p => p.player));

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
                {/* Note about canonical competition/season creation */}
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
                      {canonical.seasons.filter(r => r.competition === compForm.competition).map(r => <option value={r.id} key={r.id}>{r.name}{r.is_active ? ' (active)' : ''}</option>)}
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
                    <span>Position rules JSON *  <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>e.g. {'{"GK":1,"DEF":4,"MID":4,"FWD":2}'}</small></span>
                    <textarea value={compForm.position_rules} onChange={e => setCompForm({ ...compForm, position_rules: e.target.value })} rows={3} />
                    {compFormErrors.position_rules && <span className="fa-field-error">{compFormErrors.position_rules}</span>}
                  </label>
                  <label className={`${fieldCls(compFormErrors,'formation_rules')} fa-form-grid-fullwidth`}>
                    <span>Formation rules JSON  <small style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>e.g. {'{"GK":{"min":1,"max":1}}'}</small></span>
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
                    <thead><tr><th>Name</th><th>Sport</th><th>Registration</th><th>Visibility</th><th>Squad</th><th>Budget</th><th>Enabled</th><th></th></tr></thead>
                    <tbody>
                      {!competitions.length && <tr className="fa-table__empty"><td colSpan={8}>No competitions yet.</td></tr>}
                      {competitions.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.sport}</td>
                          <td><span className={`fa-status-pill fa-status-pill--${r.registration_state.toLowerCase()}`}>{r.registration_state}</span></td>
                          <td>{r.visibility}</td>
                          <td>{r.squad_size}</td>
                          <td>{r.initial_budget}</td>
                          <td>{r.enabled ? <span className="fa-status-pill fa-status-pill--open">Yes</span> : <span className="fa-status-pill fa-status-pill--unavailable">No</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="fa-btn fa-btn--sm" onClick={() => { setEditingCompId(r.id); setCompetitionEdit(editableCompetition(r)); setCompEditErrors({}); }}>Edit</button>
                              <button className="fa-btn fa-btn--sm fa-btn--danger" onClick={() => setDeleteTarget({ kind: 'competition', id: r.id, name: r.name })}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                    <h2>Add Player to Pool</h2>
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
                      <button
                        className="fa-btn fa-btn--gradient"
                        disabled={saving || !candidateId || !price || Number(price) <= 0 || pooledPlayerIds.has(candidateId)}
                        onClick={() => void runAndRefreshPlayers(
                          () => adminCreatePlayer({ fantasy_competition: competition.id, player: candidateId, position, price: Number(price), eligible: true, availability: playerAvailability }),
                          'Player added to pool.'
                        ).then(ok => { if (ok) { setCandidateId(''); setPrice(''); setPlayerAvailability('AVAILABLE'); } })}
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
                        <thead><tr><th>Player</th><th>Club</th><th>Position</th><th>Price</th><th>Eligible</th><th>Availability</th><th></th></tr></thead>
                        <tbody>
                          {!filteredPlayers.length && <tr className="fa-table__empty"><td colSpan={7}>{currentPlayers.length ? 'No players match filters.' : 'No players in this competition pool yet.'}</td></tr>}
                          {filteredPlayers.map(r => (
                            <tr key={r.id}>
                              <td><strong>{r.player_name}</strong></td>
                              <td>{r.club || '—'}</td>
                              <td>{r.position}</td>
                              <td>{r.price}</td>
                              <td>{r.eligible ? '✓' : '✗'}</td>
                              <td><span className={`fa-status-pill fa-status-pill--${r.availability.toLowerCase()}`}>{r.availability}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="fa-btn fa-btn--sm" onClick={() => { setEditingPlayerId(r.id); setPlayerEdit({ position: r.position, price: String(r.price), eligible: r.eligible, availability: r.availability }); }}>Edit</button>
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
                      Only statistic types found in authoritative match data are available.
                    </p>
                    {!statisticTypes.length
                      ? <div className="fa-empty" style={{ padding:'20px 0' }}>No statistic types available for this competition yet.</div>
                      : (
                        <div className="fa-form-grid">
                          <label className="fa-field">
                            <span>Statistic type</span>
                            <select value={statistic} onChange={e => setStatistic(e.target.value)}>
                              <option value="">— Select —</option>
                              {statisticTypes.map(r => (
                                <option key={r.code} value={r.code}>{r.label}{!r.observed ? ' (no data yet)' : ''}</option>
                              ))}
                            </select>
                          </label>
                          <label className="fa-field">
                            <span>Points per unit</span>
                            <input type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 3 or -1" />
                          </label>
                          <button
                            className="fa-btn fa-btn--gradient"
                            disabled={saving || !statistic || !points || isNaN(Number(points))}
                            onClick={() => void run(() => adminCreateScoringRule({ fantasy_competition: competition.id, statistic_type: statistic, points, conditions: {}, enabled: true }), 'Scoring rule added.').then(ok => { if (ok) { setStatistic(''); setPoints(''); } })}
                          >
                            Add rule
                          </button>
                        </div>
                      )
                    }
                    <h2>Current Scoring Rules</h2>
                    <p style={{ margin:'-10px 0 0', fontSize:'0.82rem', color:'var(--color-text-muted)' }}>
                      Edit/disable individual rules requires a backend PATCH endpoint (not yet available). Use corrections for one-off adjustments.
                    </p>
                    <div className="fa-table-wrap">
                      <table className="fa-table">
                        <thead><tr><th>Statistic</th><th>Points per unit</th><th>Enabled</th><th>Conditions</th></tr></thead>
                        <tbody>
                          {!competition.scoring_rules.length && <tr className="fa-table__empty"><td colSpan={4}>No scoring rules defined yet.</td></tr>}
                          {competition.scoring_rules.map(r => (
                            <tr key={r.id}>
                              <td>{r.statistic_type}</td>
                              <td><strong>{r.points}</strong></td>
                              <td>{r.enabled ? <span className="fa-status-pill fa-status-pill--open">Yes</span> : <span className="fa-status-pill fa-status-pill--unavailable">No</span>}</td>
                              <td style={{ fontSize:'0.76rem', color:'var(--color-text-muted)' }}>{Object.keys(r.conditions).length ? JSON.stringify(r.conditions) : '—'}</td>
                            </tr>
                          ))}
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
            <div className="fa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit Fantasy competition">
              <h2>Edit {competitions.find(r => r.id === editingCompId)?.name}</h2>
              <p>Canonical competition and season are read-only.</p>
              <div className="fa-modal-form">
                <div className="fa-form-grid">
                  {(['name','description','registration_deadline','squad_size','starting_lineup_size','bench_size','initial_budget','max_players_per_team','captain_multiplier','free_transfers_per_gameweek','transfer_penalty'] as const).map(f => (
                    <label key={f} className={fieldCls(compEditErrors, f)}>
                      <span>{f.replaceAll('_',' ')}</span>
                      <input aria-label={f.replaceAll('_',' ')} type={f === 'registration_deadline' ? 'datetime-local' : ['squad_size','starting_lineup_size','bench_size','initial_budget','max_players_per_team','captain_multiplier','free_transfers_per_gameweek','transfer_penalty'].includes(f) ? 'number' : 'text'} value={competitionEdit[f]} onChange={e => setCompetitionEdit({ ...competitionEdit, [f]: e.target.value })} />
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
                  {(['position_rules','formation_rules','tie_break_rules','prize_metadata','gameweek_rules'] as const).map(f => (
                    <label key={f} className={`fa-field fa-form-grid-fullwidth ${compEditErrors[f] ? 'fa-field--error' : ''}`}>
                      <span>{f.replaceAll('_',' ')} JSON</span>
                      <textarea aria-label={f.replaceAll('_',' ')} value={competitionEdit[f]} rows={4}
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
              <h2>Delete {deleteTarget.kind === 'competition' ? 'Competition' : 'Player'}</h2>
              <p>
                Are you sure you want to delete{' '}
                <strong>{deleteTarget.name}</strong>?
                {deleteTarget.kind === 'competition' && (
                  <> This will also remove all associated players, gameweeks, and scoring rules.</>
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

      </div>
    </AdminLayout>
  );
}
