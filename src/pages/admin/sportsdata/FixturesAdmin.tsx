import { useEffect, useRef, useState } from 'react';
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiList,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiSlash,
  FiClock,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractApiError } from '../../../services/apiUtils';
import {
  createRealClub,
  deleteRealClub,
  deleteClubLogo,
  fetchRealClubs,
  updateRealClub,
  uploadClubLogo,
  type RealClubSummary,
} from '../../../services/adminUsersService';
import {
  completeFixture,
  createFixture,
  fetchAdminFixtures,
  fetchCompetitions,
  fetchFixtureStatistics,
  fetchParticipants,
  fetchSports,
  rescheduleFixture,
  saveFixtureStatistics,
  setFixtureStatus,
  submitFixtureVerification,
  updateFixtureScore,
  type CompetitionOption,
  type FixtureAdminItem,
  type FixtureStatisticsData,
  type ParticipantOption,
  type SportOption,
  type StatisticEntryRow,
} from '../../../services/fixtureAdminService';
import './FixturesAdmin.css';

const MATCH_TYPE_PRESETS = ['Derby', 'Final', 'Cup Final', 'Rivalry', 'Friendly', 'Other'];

const BLANK_CREATE = {
  sportId: '',
  competitionId: '',
  homeParticipantId: '',
  awayParticipantId: '',
  startsAt: '',
  endsAt: '',
  venue: '',
  matchType: '',
  matchTypeOther: '',
  showInMarkets: false,
  isLiveScoreFeatured: false,
};

const BLANK_CREATE_CLUB = { name: '', sportId: '' };

type ScoreEditorState = { fixtureId: string; homeScore: string; awayScore: string; clockDisplay: string } | null;
type RescheduleEditorState = { fixtureId: string; startsAt: string; venue: string; endsAt: string } | null;
type StatusFilter = 'ALL' | 'LIVE' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED';

function statusPillClass(status: FixtureAdminItem['status']): string {
  switch (status) {
    case 'LIVE':
      return 'fxa-status fxa-status--live';
    case 'COMPLETED':
      return 'fxa-status fxa-status--completed';
    case 'POSTPONED':
      return 'fxa-status fxa-status--postponed';
    case 'CANCELLED':
    case 'ABANDONED':
      return 'fxa-status fxa-status--cancelled';
    default:
      return 'fxa-status fxa-status--scheduled';
  }
}

function formatKickoff(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// Local (not UTC) YYYY-MM-DDTHH:mm — the shape <input type="datetime-local">
// needs for its `min`/`value` attributes. toISOString() would shift the
// displayed time by the browser's UTC offset, which is wrong here.
function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRegisteredDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function FixturesAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [fixtures, setFixtures] = useState<FixtureAdminItem[]>([]);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);

  const [createForm, setCreateForm] = useState(BLANK_CREATE);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  const [showCreateClub, setShowCreateClub] = useState(false);
  const [createClubForm, setCreateClubForm] = useState(BLANK_CREATE_CLUB);
  const [createClubLogo, setCreateClubLogo] = useState<File | null>(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [createClubError, setCreateClubError] = useState('');

  // ── Registered Clubs section ──────────────────────────────────────────
  const [clubsExpanded, setClubsExpanded] = useState(false);
  const [registeredClubs, setRegisteredClubs] = useState<RealClubSummary[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState<string | null>(null);

  // Edit club modal
  const [editClub, setEditClub] = useState<RealClubSummary | null>(null);
  const [editClubForm, setEditClubForm] = useState({ name: '', sportId: '' });
  const [editClubLogo, setEditClubLogo] = useState<File | null>(null);
  const [editClubDeleteLogo, setEditClubDeleteLogo] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editClubError, setEditClubError] = useState('');

  // Delete club confirmation
  const [deleteClub, setDeleteClub] = useState<RealClubSummary | null>(null);
  const [isDeletingClub, setIsDeletingClub] = useState(false);
  const [deleteClubError, setDeleteClubError] = useState('');

  // ── Club list filters ─────────────────────────────────────────────────
  const [clubSportFilter, setClubSportFilter] = useState('ALL');
  const [clubNameSearch, setClubNameSearch] = useState('');

  const [scoreEditor, setScoreEditor] = useState<ScoreEditorState>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const [rescheduleEditor, setRescheduleEditor] = useState<RescheduleEditorState>(null);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [submittingVerificationFor, setSubmittingVerificationFor] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // ── Match Statistics Panel ─────────────────────────────────────────────
  const [statsFixture, setStatsFixture] = useState<FixtureAdminItem | null>(null);
  const [statsData, setStatsData] = useState<FixtureStatisticsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsNotice, setStatsNotice] = useState<string | null>(null);
  const [statsSaving, setStatsSaving] = useState(false);
  // pendingValues: participantId → statType → raw string value being edited
  const [pendingValues, setPendingValues] = useState<Record<string, Record<string, string>>>({});

  const refreshFixtures = () => fetchAdminFixtures().then(setFixtures);

  const loadRegisteredClubs = async () => {
    setClubsLoading(true);
    setClubsError(null);
    try {
      const clubs = await fetchRealClubs();
      // Newest first — backend returns alphabetically; sort by createdAt desc
      const sorted = [...clubs].sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setRegisteredClubs(sorted);
    } catch (err) {
      setClubsError(extractApiError(err).message);
    } finally {
      setClubsLoading(false);
    }
  };

  // ── Match Statistics Panel handlers ───────────────────────────────────

  const openStatsPanel = async (fixture: FixtureAdminItem) => {
    setStatsFixture(fixture);
    setStatsData(null);
    setStatsError(null);
    setStatsNotice(null);
    setPendingValues({});
    setStatsLoading(true);
    try {
      const data = await fetchFixtureStatistics(fixture.id);
      setStatsData(data);
      // Pre-populate pending values from existing stats
      const initial: Record<string, Record<string, string>> = {};
      for (const player of data.players) {
        initial[player.participant_id] = {};
        for (const stat of player.stats) {
          initial[player.participant_id][stat.stat_type] = stat.value;
        }
      }
      setPendingValues(initial);
    } catch (e) {
      setStatsError(extractApiError(e).message);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSaveStatistics = async (triggerScoring: boolean) => {
    if (!statsFixture || !statsData) return;
    setStatsSaving(true);
    setStatsError(null);
    setStatsNotice(null);
    try {
      // Collect all non-empty pending values as rows
      const rows: StatisticEntryRow[] = [];
      for (const [participantId, statMap] of Object.entries(pendingValues)) {
        for (const [statType, rawValue] of Object.entries(statMap)) {
          const trimmed = String(rawValue).trim();
          if (trimmed === '') continue;
          const num = parseFloat(trimmed);
          if (!isNaN(num) && num >= 0) {
            rows.push({ participant: participantId, stat_type: statType, value: num });
          }
        }
      }
      if (rows.length === 0) {
        setStatsError('No statistics entered. Fill in at least one value before saving.');
        return;
      }
      const result = await saveFixtureStatistics(statsFixture.id, {
        statistics: rows,
        trigger_scoring: triggerScoring,
      });
      setStatsNotice(result.message);
      // Reload the panel data to reflect saved state
      const refreshed = await fetchFixtureStatistics(statsFixture.id);
      setStatsData(refreshed);
      const updated: Record<string, Record<string, string>> = {};
      for (const player of refreshed.players) {
        updated[player.participant_id] = {};
        for (const stat of player.stats) {
          updated[player.participant_id][stat.stat_type] = stat.value;
        }
      }
      setPendingValues(updated);
    } catch (e) {
      setStatsError(extractApiError(e).message);
    } finally {
      setStatsSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAdminFixtures(), fetchSports()])
      .then(([fixtureResult, sportResult]) => {
        if (cancelled) return;
        setFixtures(fixtureResult);
        setSports(sportResult);
        if (sportResult.length > 0) setCreateForm((current) => ({ ...current, sportId: sportResult[0].id }));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load fixtures. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!createForm.sportId) return;
    let cancelled = false;
    Promise.all([fetchCompetitions(createForm.sportId), fetchParticipants(createForm.sportId)]).then(
      ([competitionResult, participantResult]) => {
        if (cancelled) return;
        setCompetitions(competitionResult);
        setParticipants(participantResult);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [createForm.sportId]);

  useEffect(() => {
    if (!openActionMenuFor) return;
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuFor(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenuFor]);

  const openCreateClub = () => {
    setCreateClubForm((current) => ({ ...current, sportId: current.sportId || sports[0]?.id || '' }));
    setShowCreateClub(true);
  };

  const handleCreateFixture = async () => {
    if (!createForm.sportId || !createForm.homeParticipantId || !createForm.awayParticipantId || !createForm.startsAt) {
      setCreateMessage('Sport, both teams, and kickoff time are required.');
      return;
    }
    if (new Date(createForm.startsAt) < new Date()) {
      setCreateMessage('Kickoff time cannot be in the past.');
      return;
    }
    if (createForm.endsAt && new Date(createForm.endsAt) < new Date(createForm.startsAt)) {
      setCreateMessage('Anticipated end time cannot be earlier than kickoff.');
      return;
    }
    setIsCreating(true);
    setCreateMessage('');
    try {
      await createFixture({
        sportId: createForm.sportId,
        competitionId: createForm.competitionId || undefined,
        homeParticipantId: createForm.homeParticipantId,
        awayParticipantId: createForm.awayParticipantId,
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: createForm.endsAt ? new Date(createForm.endsAt).toISOString() : undefined,
        venue: createForm.venue,
        matchType: createForm.matchType === 'Other' ? createForm.matchTypeOther : createForm.matchType,
        showInMarkets: createForm.showInMarkets,
        isLiveScoreFeatured: createForm.isLiveScoreFeatured,
      });
      setCreateForm((current) => ({ ...BLANK_CREATE, sportId: current.sportId }));
      setCreateMessage('Fixture created.');
      refreshFixtures();
    } catch (err) {
      setCreateMessage(extractApiError(err).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClub = async () => {
    if (!createClubForm.name.trim() || !createClubForm.sportId) {
      setCreateClubError('Club name and sport are required.');
      return;
    }
    setIsCreatingClub(true);
    setCreateClubError('');
    try {
      // The backend now atomically creates both the Club and its linked
      // TEAM Participant in a single transaction — no separate
      // /participants/ call needed.
      const club = await createRealClub({ name: createClubForm.name.trim(), sportId: createClubForm.sportId });
      if (createClubLogo) {
        try {
          await uploadClubLogo(club.id, createClubLogo);
        } catch {
          // Best-effort — the logo can be added later from the club's own
          // profile page once it has an admin, matching the existing
          // Invite-Admin "New club" flow's convention.
        }
      }

      // Re-fetch participants for the current sport so the new team
      // appears in the fixture home/away dropdowns immediately.
      if (createForm.sportId) {
        try {
          const refreshed = await fetchParticipants(createForm.sportId);
          setParticipants(refreshed);
        } catch {
          // Best-effort — the dropdown refreshes when the sport changes.
        }
      }

      // Always refresh the clubs list so the new entry appears at the top.
      await loadRegisteredClubs();
      setClubsExpanded(true);

      setShowCreateClub(false);
      setCreateClubForm({ name: '', sportId: createClubForm.sportId });
      setCreateClubLogo(null);
      setCreateMessage(`"${club.name}" registered and ready to use as a team in fixtures.`);
    } catch (err) {
      setCreateClubError(extractApiError(err).message);
    } finally {
      setIsCreatingClub(false);
    }
  };

  const openEditClub = (club: RealClubSummary) => {
    setEditClub(club);
    setEditClubForm({ name: club.name, sportId: club.sportId ?? '' });
    setEditClubLogo(null);
    setEditClubDeleteLogo(false);
    setEditClubError('');
  };

  const handleSaveEditClub = async () => {
    if (!editClub) return;
    if (!editClubForm.name.trim()) {
      setEditClubError('Club name is required.');
      return;
    }
    if (!editClubForm.sportId) {
      setEditClubError('Sport is required.');
      return;
    }
    setIsSavingEdit(true);
    setEditClubError('');
    try {
      await updateRealClub(editClub.id, { name: editClubForm.name.trim(), sportId: editClubForm.sportId });

      // Logo changes: delete first if flagged, then upload new file if provided.
      // Best-effort — a logo failure does not roll back the name/sport update.
      if (editClubDeleteLogo && !editClubLogo) {
        try { await deleteClubLogo(editClub.id); } catch { /* best-effort */ }
      }
      if (editClubLogo) {
        try { await uploadClubLogo(editClub.id, editClubLogo); } catch { /* best-effort */ }
      }

      setEditClub(null);
      await loadRegisteredClubs();

      // Re-fetch participants so the fixture dropdown reflects the
      // updated name/sport. The backend syncs the linked Participant
      // atomically with the Club update.
      if (createForm.sportId) {
        try {
          const refreshed = await fetchParticipants(createForm.sportId);
          setParticipants(refreshed);
        } catch {
          // Best-effort — the dropdown refreshes when the sport changes.
        }
      }
    } catch (err) {
      setEditClubError(extractApiError(err).message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteClub = (club: RealClubSummary) => {
    setDeleteClub(club);
    setDeleteClubError('');
  };

  const handleConfirmDeleteClub = async () => {
    if (!deleteClub) return;
    setIsDeletingClub(true);
    setDeleteClubError('');
    try {
      await deleteRealClub(deleteClub.id);
      setDeleteClub(null);
      await loadRegisteredClubs();

      // Re-fetch participants so the deactivated team disappears from
      // the fixture dropdowns. The backend deactivates the linked
      // Participant atomically with the Club soft-delete.
      if (createForm.sportId) {
        try {
          const refreshed = await fetchParticipants(createForm.sportId);
          setParticipants(refreshed);
        } catch {
          // Best-effort — the dropdown refreshes when the sport changes.
        }
      }
    } catch (err) {
      setDeleteClubError(extractApiError(err).message);
    } finally {
      setIsDeletingClub(false);
    }
  };

  const handleToggleClubs = () => {
    const opening = !clubsExpanded;
    setClubsExpanded(opening);
    // Fetch on first open, or whenever re-opened after collapse
    if (opening && registeredClubs.length === 0 && !clubsLoading) {
      void loadRegisteredClubs();
    }
  };

  const handleRefreshClubs = () => {
    void loadRegisteredClubs();
  };

  const handleGoLive = async (fixtureId: string) => {
    setActionError(null);
    setOpenActionMenuFor(null);
    try {
      await setFixtureStatus(fixtureId, 'LIVE');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handlePostpone = async (fixtureId: string) => {
    setActionError(null);
    setOpenActionMenuFor(null);
    try {
      await setFixtureStatus(fixtureId, 'POSTPONED');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleCancel = async (fixtureId: string) => {
    setActionError(null);
    setOpenActionMenuFor(null);
    try {
      await setFixtureStatus(fixtureId, 'CANCELLED');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleRestoreToScheduled = async (fixtureId: string) => {
    setActionError(null);
    setOpenActionMenuFor(null);
    try {
      await setFixtureStatus(fixtureId, 'SCHEDULED');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleComplete = async (fixtureId: string) => {
    setActionError(null);
    setOpenActionMenuFor(null);
    try {
      await completeFixture(fixtureId);
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleSubmitVerification = async (fixtureId: string) => {
    setActionError(null);
    setSubmittingVerificationFor(fixtureId);
    try {
      await submitFixtureVerification(fixtureId);
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setSubmittingVerificationFor(null);
    }
  };

  const openScoreEditor = (fixture: FixtureAdminItem) => {
    setScoreEditor({
      fixtureId: fixture.id,
      homeScore: String(fixture.homeScore ?? 0),
      awayScore: String(fixture.awayScore ?? 0),
      clockDisplay: fixture.clockDisplay,
    });
  };

  const handleSaveScore = async () => {
    if (!scoreEditor) return;
    setIsSavingScore(true);
    setActionError(null);
    try {
      await updateFixtureScore(scoreEditor.fixtureId, {
        homeScore: Number(scoreEditor.homeScore) || 0,
        awayScore: Number(scoreEditor.awayScore) || 0,
        clockDisplay: scoreEditor.clockDisplay,
      });
      setScoreEditor(null);
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsSavingScore(false);
    }
  };

  const openRescheduleEditor = (fixture: FixtureAdminItem) => {
    setOpenActionMenuFor(null);
    setRescheduleEditor({
      fixtureId: fixture.id,
      startsAt: fixture.startsAt ? toLocalDatetimeInputValue(new Date(fixture.startsAt)) : '',
      venue: fixture.venue,
      endsAt: fixture.endsAt ? toLocalDatetimeInputValue(new Date(fixture.endsAt)) : '',
    });
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleEditor) return;
    if (rescheduleEditor.startsAt && new Date(rescheduleEditor.startsAt) < new Date()) {
      setActionError('Kickoff time cannot be in the past.');
      return;
    }
    if (
      rescheduleEditor.endsAt &&
      rescheduleEditor.startsAt &&
      new Date(rescheduleEditor.endsAt) < new Date(rescheduleEditor.startsAt)
    ) {
      setActionError('Anticipated end time cannot be earlier than kickoff.');
      return;
    }
    setIsSavingReschedule(true);
    setActionError(null);
    try {
      await rescheduleFixture(rescheduleEditor.fixtureId, {
        startsAt: rescheduleEditor.startsAt ? new Date(rescheduleEditor.startsAt).toISOString() : undefined,
        venue: rescheduleEditor.venue,
        endsAt: rescheduleEditor.endsAt ? new Date(rescheduleEditor.endsAt).toISOString() : undefined,
      });
      setRescheduleEditor(null);
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const kickoffMin = toLocalDatetimeInputValue(new Date());
  const endsAtMin = createForm.startsAt || kickoffMin;
  const rescheduleEndsAtMin = rescheduleEditor?.startsAt || kickoffMin;

  const selectedSportName = sports.find((sport) => sport.id === sportFilter)?.name;
  const visibleFixtures = fixtures.filter(
    (fixture) =>
      (statusFilter === 'ALL' || fixture.status === statusFilter) &&
      (sportFilter === 'ALL' || fixture.sportName === selectedSportName),
  );

  // ── Registered Clubs derived values ──────────────────────────────────
  // Use the full sports catalog (already loaded for the fixture form) as
  // the source for filter options. Building options only from club.sportId
  // causes sports to vanish when their clubs have a null sportId on the
  // backend. The `sports` array from fetchSports() is always complete.
  const availableSportOptions = sports; // SportOption[] — already sorted by backend

  const clubSearchTerm = clubNameSearch.trim().toLowerCase();
  const visibleClubs = registeredClubs.filter((club) => {
    // Match by sportId (not sportName) so clubs whose sportName is null
    // but whose sportId matches the selected filter are still shown.
    const matchesSport = clubSportFilter === 'ALL' || club.sportId === clubSportFilter;
    const matchesName = clubSearchTerm === '' || club.name.toLowerCase().includes(clubSearchTerm);
    return matchesSport && matchesName;
  });

  const hasActiveClubFilter = clubSportFilter !== 'ALL' || clubNameSearch.trim() !== '';

  const clearClubFilters = () => {
    setClubSportFilter('ALL');
    setClubNameSearch('');
  };

  return (
    <AdminLayout>
      <div className="fxa-content">
        <div className="fxa-header">
          <div>
            <p className="fxa-header__eyebrow">Sports Data &amp; Statistics</p>
            <h1>Registered Clubs</h1>
          </div>
          <div className="fxa-header__actions">
            <button type="button" className="fxa-btn fxa-btn--primary" onClick={openCreateClub}>
              <FiPlus aria-hidden="true" /> Create Club
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="fxa-error-banner">{loadError}</div>
        ) : (
          <>
            {actionError && <div className="fxa-error-banner">{actionError}</div>}

            {/* ── Registered Clubs ── */}
            <section className="fxa-panel fxa-clubs-panel">
              <button
                type="button"
                className="fxa-clubs-toggle"
                aria-expanded={clubsExpanded}
                onClick={handleToggleClubs}
              >
                <span className="fxa-clubs-toggle__label">
                  <FiShield aria-hidden="true" className="fxa-clubs-toggle__icon" />
                  View Registered Clubs
                  {registeredClubs.length > 0 && (
                    <span className="fxa-clubs-badge">{registeredClubs.length}</span>
                  )}
                </span>
                <FiChevronDown
                  aria-hidden="true"
                  className={`fxa-clubs-chevron${clubsExpanded ? ' fxa-clubs-chevron--open' : ''}`}
                />
              </button>

              {clubsExpanded && (
                <div className="fxa-clubs-body">
                  {/* ── Toolbar: count + refresh ── */}
                  <div className="fxa-clubs-body__toolbar">
                    <span className="fxa-panel__count">
                      {clubsLoading
                        ? 'Loading…'
                        : hasActiveClubFilter
                          ? `${visibleClubs.length} of ${registeredClubs.length} club${registeredClubs.length !== 1 ? 's' : ''}`
                          : `${registeredClubs.length} club${registeredClubs.length !== 1 ? 's' : ''}`}
                    </span>
                    <button
                      type="button"
                      className="fxa-icon-btn"
                      title="Refresh clubs list"
                      disabled={clubsLoading}
                      onClick={handleRefreshClubs}
                    >
                      <FiRefreshCw aria-hidden="true" />
                    </button>
                  </div>

                  {/* ── Filter row: search + sport ── */}
                  {!clubsLoading && registeredClubs.length > 0 && (
                    <div className="fxa-clubs-filters">
                      <div className="fxa-clubs-search">
                        <FiSearch aria-hidden="true" className="fxa-clubs-search__icon" />
                        <input
                          type="search"
                          className="fxa-clubs-search__input"
                          placeholder="Search by club name…"
                          value={clubNameSearch}
                          onChange={(e) => setClubNameSearch(e.target.value)}
                          aria-label="Search clubs by name"
                        />
                      </div>
                      <select
                        className="fxa-clubs-sport-select"
                        value={clubSportFilter}
                        onChange={(e) => setClubSportFilter(e.target.value)}
                        aria-label="Filter by sport"
                      >
                        <option value="ALL">All Sports</option>
                        {availableSportOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {clubsError && (
                    <div className="fxa-error-banner" role="alert">{clubsError}</div>
                  )}

                  {clubsLoading ? (
                    <p className="fxa-empty">Loading registered clubs…</p>
                  ) : registeredClubs.length === 0 ? (
                    <p className="fxa-empty">No clubs registered yet. Use the Create Club button to add one.</p>
                  ) : visibleClubs.length === 0 ? (
                    <div className="fxa-clubs-empty-filtered">
                      <p className="fxa-empty">No clubs match the current filters.</p>
                      <button type="button" className="fxa-btn fxa-btn--ghost fxa-clubs-clear-btn" onClick={clearClubFilters}>
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="fxa-clubs-grid">
                      {visibleClubs.map((club) => (
                        <div key={club.id} className="fxa-club-card">
                          <div className="fxa-club-card__logo-wrap">
                            {club.logoUrl ? (
                              <img
                                src={club.logoUrl}
                                alt={`${club.name} logo`}
                                className="fxa-club-card__logo"
                              />
                            ) : (
                              <div className="fxa-club-card__logo-placeholder" aria-hidden="true">
                                {club.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="fxa-club-card__body">
                            <p className="fxa-club-card__name">{club.name}</p>
                            {club.sportName && (
                              <p className="fxa-club-card__meta">{club.sportName}</p>
                            )}
                            {club.createdAt && (
                              <p className="fxa-club-card__date">
                                Registered {formatRegisteredDate(club.createdAt)}
                              </p>
                            )}
                          </div>
                          <div className="fxa-club-card__actions">
                            <button
                              type="button"
                              className="fxa-icon-btn"
                              title={`Edit ${club.name}`}
                              onClick={() => openEditClub(club)}
                            >
                              <FiEdit2 aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="fxa-icon-btn fxa-icon-btn--danger"
                              title={`Delete ${club.name}`}
                              onClick={() => openDeleteClub(club)}
                            >
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Fixtures heading (copy) ── */}
            <div className="fxa-header">
              <div>
                <h1>Fixtures</h1>
                <p>Create fixtures, go live, and keep the score and clock up to date for the public site.</p>
              </div>
            </div>

            {/* ── Create Fixture ── */}
            <section className="fxa-panel">
              <div className="fxa-panel__header">
                <h2>Create Fixture</h2>
              </div>

              <div className="fxa-field-row">
                <label className="fxa-field">
                  Sport
                  <select
                    value={createForm.sportId}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        sportId: event.target.value,
                        homeParticipantId: '',
                        awayParticipantId: '',
                        competitionId: '',
                      }))
                    }
                  >
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fxa-field">
                  Competition (optional)
                  <select
                    value={createForm.competitionId}
                    onChange={(event) => setCreateForm((current) => ({ ...current, competitionId: event.target.value }))}
                  >
                    <option value="">No competition</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="fxa-field-row">
                <label className="fxa-field">
                  Match Type
                  <select
                    value={createForm.matchType}
                    onChange={(event) => setCreateForm((current) => ({ ...current, matchType: event.target.value }))}
                  >
                    <option value="">Select…</option>
                    {MATCH_TYPE_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                  {createForm.matchType === 'Other' && (
                    <input
                      type="text"
                      value={createForm.matchTypeOther}
                      onChange={(event) => setCreateForm((current) => ({ ...current, matchTypeOther: event.target.value }))}
                      placeholder="Describe the match type"
                    />
                  )}
                </label>
                <label className="fxa-field">
                  Venue
                  <input
                    type="text"
                    value={createForm.venue}
                    onChange={(event) => setCreateForm((current) => ({ ...current, venue: event.target.value }))}
                    placeholder="St. Mary's Stadium"
                  />
                </label>
              </div>

              <div className="fxa-field-row">
                <label className="fxa-field">
                  Home team
                  <select
                    value={createForm.homeParticipantId}
                    onChange={(event) => setCreateForm((current) => ({ ...current, homeParticipantId: event.target.value }))}
                  >
                    <option value="">Select…</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fxa-field">
                  Away team
                  <select
                    value={createForm.awayParticipantId}
                    onChange={(event) => setCreateForm((current) => ({ ...current, awayParticipantId: event.target.value }))}
                  >
                    <option value="">Select…</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="fxa-field-row">
                <label className="fxa-field">
                  Kickoff
                  <input
                    type="datetime-local"
                    min={kickoffMin}
                    value={createForm.startsAt}
                    onChange={(event) => setCreateForm((current) => ({ ...current, startsAt: event.target.value }))}
                  />
                </label>
                <label className="fxa-field">
                  Anticipated End Time
                  <input
                    type="datetime-local"
                    min={endsAtMin}
                    value={createForm.endsAt}
                    onChange={(event) => setCreateForm((current) => ({ ...current, endsAt: event.target.value }))}
                  />
                </label>
              </div>

              {createMessage && <p className="fxa-compose-message">{createMessage}</p>}
              <div className="fxa-panel__footer">
                <div className="fxa-footer-checks">
                  <label className="fxa-checkbox">
                    <input
                      type="checkbox"
                      checked={createForm.showInMarkets}
                      onChange={(event) => setCreateForm((current) => ({ ...current, showInMarkets: event.target.checked }))}
                    />
                    Add to Markets
                  </label>
                  <label className="fxa-checkbox">
                    <input
                      type="checkbox"
                      checked={createForm.isLiveScoreFeatured}
                      onChange={(event) => setCreateForm((current) => ({ ...current, isLiveScoreFeatured: event.target.checked }))}
                    />
                    Live Score
                  </label>
                </div>
                <button type="button" className="fxa-btn fxa-btn--primary" disabled={isCreating} onClick={() => void handleCreateFixture()}>
                  {isCreating ? 'Creating…' : 'Create Fixture'}
                </button>
              </div>
            </section>

            {/* ── Fixtures table ── */}
            <section className="fxa-panel">
              <div className="fxa-fixtures-header">
                <div className="fxa-fixtures-header__top">
                  <h2 className="fxa-fixtures-header__title">All Fixtures</h2>
                  <span className="fxa-panel__count">{visibleFixtures.length} shown</span>
                </div>
                <div className="fxa-fixtures-header__filters">
                  <div className="fxa-filter-group">
                    <span className="fxa-filter-group__label">Sport</span>
                    <div className="fxa-sport-filter">
                      <button
                        type="button"
                        className={`fxa-sport-chip${sportFilter === 'ALL' ? ' fxa-sport-chip--active' : ''}`}
                        onClick={() => setSportFilter('ALL')}
                      >
                        All Sports
                      </button>
                      {sports.map((sport) => (
                        <button
                          key={sport.id}
                          type="button"
                          className={`fxa-sport-chip${sportFilter === sport.id ? ' fxa-sport-chip--active' : ''}`}
                          onClick={() => setSportFilter(sport.id)}
                        >
                          {sport.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fxa-filter-group">
                    <span className="fxa-filter-group__label">Status</span>
                    <div className="fxa-status-tabs">
                      {(['ALL', 'LIVE', 'POSTPONED', 'CANCELLED', 'COMPLETED'] as StatusFilter[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          className={`fxa-status-tab${statusFilter === tab ? ' fxa-status-tab--active' : ''}`}
                          onClick={() => setStatusFilter(tab)}
                        >
                          {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <p className="fxa-empty">Loading fixtures…</p>
              ) : visibleFixtures.length === 0 ? (
                <p className="fxa-empty">
                  {fixtures.length === 0 ? 'No fixtures yet — create one above.' : 'No fixtures match this filter.'}
                </p>
              ) : (
                <div className="fxa-table-wrap">
                  <table className="fxa-table">
                    <thead>
                      <tr>
                        <th className="fxa-col-match">Match</th>
                        <th className="fxa-col-kickoff">Kickoff</th>
                        <th className="fxa-col-status">Status</th>
                        <th className="fxa-col-score">Score</th>
                        <th className="fxa-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFixtures.map((fixture) => (
                        <tr key={fixture.id} title="Independently created fixture — not linked to an external data feed">
                          <td>
                            <p className="fxa-match-name">
                              {fixture.homeName} vs {fixture.awayName}
                            </p>
                            <p className="fxa-match-meta">
                              {fixture.sportName} {fixture.competitionName ? `· ${fixture.competitionName}` : ''}
                            </p>
                          </td>
                          <td>{formatKickoff(fixture.startsAt)}</td>
                          <td>
                            <span className={statusPillClass(fixture.status)}>{fixture.status}</span>
                          </td>
                          <td>
                            {fixture.homeScore ?? '—'} - {fixture.awayScore ?? '—'}
                            {fixture.clockDisplay && <span className="fxa-clock"> ({fixture.clockDisplay})</span>}
                          </td>
                          <td>
                            <div className="fxa-row-actions">
                              {fixture.status === 'COMPLETED' && fixture.verificationStatus === 'PENDING' && (
                                <span className="fxa-verification-badge">Pending Verification</span>
                              )}
                              {fixture.status === 'COMPLETED' && fixture.verificationStatus === 'VERIFIED' && (
                                <span className="fxa-verification-badge fxa-verification-badge--verified">Verified</span>
                              )}
                              {fixture.status === 'COMPLETED' &&
                                (fixture.verificationStatus === 'NONE' || fixture.verificationStatus === 'REJECTED') && (
                                  <button
                                    type="button"
                                    className="fxa-icon-btn fxa-icon-btn--primary"
                                    title="Submit for result verification"
                                    disabled={submittingVerificationFor === fixture.id}
                                    onClick={() => void handleSubmitVerification(fixture.id)}
                                  >
                                    <FiShield />{' '}
                                    <span>
                                      {submittingVerificationFor === fixture.id
                                        ? 'Submitting…'
                                        : fixture.verificationStatus === 'REJECTED'
                                          ? 'Resubmit Verification'
                                          : 'Submit Verification'}
                                    </span>
                                  </button>
                                )}
                              {(fixture.status === 'LIVE' || fixture.status === 'SCHEDULED') && (
                                <button
                                  type="button"
                                  className="fxa-icon-btn fxa-icon-btn--primary"
                                  title="Update score"
                                  onClick={() => openScoreEditor(fixture)}
                                >
                                  <FiClock /> <span>Update Score</span>
                                </button>
                              )}

                              {(fixture.status === 'LIVE' || fixture.status === 'COMPLETED') && (
                                <button
                                  type="button"
                                  className="fxa-icon-btn fxa-icon-btn--stats"
                                  title="Enter match statistics"
                                  onClick={() => void openStatsPanel(fixture)}
                                >
                                  <FiList /> <span>Statistics</span>
                                </button>
                              )}

                              {fixture.status !== 'COMPLETED' && (
                                <div className="fxa-action-menu" ref={openActionMenuFor === fixture.id ? actionMenuRef : undefined}>
                                  <button
                                    type="button"
                                    className="fxa-icon-btn"
                                    title="More actions"
                                    onClick={() => setOpenActionMenuFor((current) => (current === fixture.id ? null : fixture.id))}
                                  >
                                    Actions <FiChevronDown />
                                  </button>
                                  {openActionMenuFor === fixture.id && (
                                    <div className="fxa-action-menu__list">
                                      {fixture.status === 'SCHEDULED' && (
                                        <>
                                          <button type="button" onClick={() => void handleGoLive(fixture.id)}>
                                            <FiPlay /> Go live
                                          </button>
                                          <button type="button" onClick={() => void handlePostpone(fixture.id)}>
                                            <FiPause /> Postpone
                                          </button>
                                          <button type="button" className="fxa-action-menu__item--danger" onClick={() => void handleCancel(fixture.id)}>
                                            <FiSlash /> Cancel
                                          </button>
                                        </>
                                      )}
                                      {fixture.status === 'LIVE' && (
                                        <>
                                          <button type="button" onClick={() => void handleComplete(fixture.id)}>
                                            <FiCheckCircle /> Mark completed
                                          </button>
                                          <button type="button" onClick={() => void handlePostpone(fixture.id)}>
                                            <FiPause /> Postpone
                                          </button>
                                          <button type="button" className="fxa-action-menu__item--danger" onClick={() => void handleCancel(fixture.id)}>
                                            <FiSlash /> Cancel
                                          </button>
                                        </>
                                      )}
                                      {fixture.status === 'POSTPONED' && (
                                        <>
                                          <button type="button" onClick={() => void handleRestoreToScheduled(fixture.id)}>
                                            <FiRotateCcw /> Resume (Scheduled)
                                          </button>
                                          <button type="button" onClick={() => void handleGoLive(fixture.id)}>
                                            <FiPlay /> Go live
                                          </button>
                                          <button type="button" onClick={() => openRescheduleEditor(fixture)}>
                                            <FiCalendar /> Edit schedule
                                          </button>
                                          <button type="button" className="fxa-action-menu__item--danger" onClick={() => void handleCancel(fixture.id)}>
                                            <FiSlash /> Cancel
                                          </button>
                                        </>
                                      )}
                                      {(fixture.status === 'CANCELLED' || fixture.status === 'ABANDONED') && (
                                        <button type="button" onClick={() => void handleRestoreToScheduled(fixture.id)}>
                                          <FiRotateCcw /> Restore (Scheduled)
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showCreateClub && (
        <div className="fxa-modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowCreateClub(false)}>
          <div className="fxa-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Create club</h3>
            <label className="fxa-field">
              Club name
              <input
                type="text"
                value={createClubForm.name}
                onChange={(event) => setCreateClubForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Busoga United FC"
              />
            </label>
            <label className="fxa-field">
              Sport
              <select
                value={createClubForm.sportId}
                onChange={(event) => setCreateClubForm((current) => ({ ...current, sportId: event.target.value }))}
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fxa-field">
              Logo (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setCreateClubLogo(event.target.files?.[0] ?? null)}
              />
            </label>
            {createClubError && <p className="fxa-error-banner">{createClubError}</p>}
            <div className="fxa-modal__footer">
              <button type="button" className="fxa-btn fxa-btn--ghost" onClick={() => setShowCreateClub(false)}>
                Cancel
              </button>
              <button type="button" className="fxa-btn fxa-btn--primary" disabled={isCreatingClub} onClick={() => void handleCreateClub()}>
                {isCreatingClub ? 'Creating…' : 'Create club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Club modal ── */}
      {editClub && (
        <div className="fxa-modal-overlay" role="dialog" aria-modal="true" aria-label={`Edit ${editClub.name}`} onClick={() => setEditClub(null)}>
        <div className="fxa-modal fxa-modal--edit-club" onClick={(event) => event.stopPropagation()}>
            <h3>Edit club</h3>
            <label className="fxa-field">
              Club name
              <input
                type="text"
                value={editClubForm.name}
                onChange={(event) => setEditClubForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Busoga United FC"
              />
            </label>
            <label className="fxa-field">
              Sport
              <select
                value={editClubForm.sportId}
                onChange={(event) => setEditClubForm((current) => ({ ...current, sportId: event.target.value }))}
              >
                <option value="">Select a sport…</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Logo section */}
            <div className="fxa-field">
              <span className="fxa-edit-logo__label">Logo</span>
              <div className="fxa-edit-logo">
                {/* Current logo preview (unless flagged for deletion or replaced) */}
                {editClub.logoUrl && !editClubDeleteLogo && !editClubLogo && (
                  <div className="fxa-edit-logo__current">
                    <img
                      src={editClub.logoUrl}
                      alt="Current logo"
                      className="fxa-edit-logo__preview"
                    />
                    <button
                      type="button"
                      className="fxa-edit-logo__remove"
                      onClick={() => setEditClubDeleteLogo(true)}
                      title="Remove logo"
                    >
                      <FiTrash2 aria-hidden="true" /> Remove
                    </button>
                  </div>
                )}
                {/* New file chosen preview */}
                {editClubLogo && (
                  <div className="fxa-edit-logo__current">
                    <img
                      src={URL.createObjectURL(editClubLogo)}
                      alt="New logo preview"
                      className="fxa-edit-logo__preview"
                    />
                    <button
                      type="button"
                      className="fxa-edit-logo__remove"
                      onClick={() => setEditClubLogo(null)}
                      title="Cancel logo change"
                    >
                      <FiX aria-hidden="true" /> Cancel
                    </button>
                  </div>
                )}
                {/* Deletion pending notice */}
                {editClubDeleteLogo && !editClubLogo && (
                  <p className="fxa-edit-logo__pending-delete">
                    Logo will be removed on save.{' '}
                    <button type="button" className="fxa-edit-logo__undo" onClick={() => setEditClubDeleteLogo(false)}>
                      Undo
                    </button>
                  </p>
                )}
                {/* Upload input */}
                <label className="fxa-edit-logo__upload-label">
                  {editClub.logoUrl && !editClubDeleteLogo ? 'Replace logo' : 'Upload logo (optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    className="fxa-edit-logo__file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setEditClubLogo(file);
                      if (file) setEditClubDeleteLogo(false);
                    }}
                  />
                </label>
              </div>
            </div>

            {editClubError && <p className="fxa-error-banner" role="alert">{editClubError}</p>}
            <div className="fxa-modal__footer">
              <button type="button" className="fxa-btn fxa-btn--ghost" onClick={() => setEditClub(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="fxa-btn fxa-btn--primary"
                disabled={isSavingEdit}
                onClick={() => void handleSaveEditClub()}
              >
                {isSavingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Club confirmation modal ── */}
      {deleteClub && (
        <div className="fxa-modal-overlay" role="dialog" aria-modal="true" aria-label={`Delete ${deleteClub.name}`} onClick={() => setDeleteClub(null)}>
          <div className="fxa-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete club</h3>
            <p className="fxa-modal__confirm-text">
              Are you sure you want to delete <strong>{deleteClub.name}</strong>?
            </p>
            <p className="fxa-modal__confirm-subtext">
              The club will be deactivated. Any fan profiles that selected it as a favourite club, and any existing
              Club Admin workspaces, will be preserved.
            </p>
            {deleteClubError && <p className="fxa-error-banner" role="alert">{deleteClubError}</p>}
            <div className="fxa-modal__footer">
              <button type="button" className="fxa-btn fxa-btn--ghost" onClick={() => setDeleteClub(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="fxa-btn fxa-btn--danger"
                disabled={isDeletingClub}
                onClick={() => void handleConfirmDeleteClub()}
              >
                {isDeletingClub ? 'Deleting…' : 'Delete club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scoreEditor && (
        <div className="fxa-modal-overlay" role="dialog" aria-modal="true" onClick={() => setScoreEditor(null)}>
          <div className="fxa-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Update score</h3>
            <div className="fxa-score-row">
              <label className="fxa-field">
                Home score
                <input
                  type="number"
                  min={0}
                  value={scoreEditor.homeScore}
                  onChange={(event) => setScoreEditor({ ...scoreEditor, homeScore: event.target.value })}
                />
              </label>
              <label className="fxa-field">
                Away score
                <input
                  type="number"
                  min={0}
                  value={scoreEditor.awayScore}
                  onChange={(event) => setScoreEditor({ ...scoreEditor, awayScore: event.target.value })}
                />
              </label>
            </div>
            <label className="fxa-field">
              Clock (optional)
              <input
                type="text"
                value={scoreEditor.clockDisplay}
                onChange={(event) => setScoreEditor({ ...scoreEditor, clockDisplay: event.target.value })}
                placeholder="75', HT, Q3 04:15…"
              />
            </label>
            <div className="fxa-modal__footer">
              <button type="button" className="fxa-btn fxa-btn--ghost" onClick={() => setScoreEditor(null)}>
                Cancel
              </button>
              <button type="button" className="fxa-btn fxa-btn--primary" disabled={isSavingScore} onClick={() => void handleSaveScore()}>
                {isSavingScore ? 'Saving…' : 'Save score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleEditor && (
        <div className="fxa-modal-overlay" role="dialog" aria-modal="true" onClick={() => setRescheduleEditor(null)}>
          <div className="fxa-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Edit schedule</h3>
            <label className="fxa-field">
              Venue
              <input
                type="text"
                value={rescheduleEditor.venue}
                onChange={(event) => setRescheduleEditor({ ...rescheduleEditor, venue: event.target.value })}
              />
            </label>
            <label className="fxa-field">
              Kickoff
              <input
                type="datetime-local"
                min={kickoffMin}
                value={rescheduleEditor.startsAt}
                onChange={(event) => setRescheduleEditor({ ...rescheduleEditor, startsAt: event.target.value })}
              />
            </label>
            <label className="fxa-field">
              Anticipated End Time
              <input
                type="datetime-local"
                min={rescheduleEndsAtMin}
                value={rescheduleEditor.endsAt}
                onChange={(event) => setRescheduleEditor({ ...rescheduleEditor, endsAt: event.target.value })}
              />
            </label>
            <div className="fxa-modal__footer">
              <button type="button" className="fxa-btn fxa-btn--ghost" onClick={() => setRescheduleEditor(null)}>
                Cancel
              </button>
              <button type="button" className="fxa-btn fxa-btn--primary" disabled={isSavingReschedule} onClick={() => void handleSaveReschedule()}>
                {isSavingReschedule ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MATCH STATISTICS PANEL (side drawer)
          Shown for LIVE (partial, no scoring) and COMPLETED (final, triggers scoring)
      ══════════════════════════════════════════════════════════ */}
      {statsFixture && (
        <div
          className="fxa-modal-overlay fxa-stats-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Match statistics: ${statsFixture.name}`}
          onClick={() => setStatsFixture(null)}
        >
          <div className="fxa-stats-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Drawer header */}
            <div className="fxa-stats-drawer__header">
              <div>
                <h3 className="fxa-stats-drawer__title">
                  <FiList aria-hidden="true" /> Match Statistics
                </h3>
                <p className="fxa-stats-drawer__subtitle">
                  {statsFixture.homeName} vs {statsFixture.awayName}
                  <span className={`fxa-status ${statusPillClass(statsFixture.status)}`} style={{ marginLeft: 8 }}>
                    {statsFixture.status}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="fxa-icon-btn"
                aria-label="Close statistics panel"
                onClick={() => setStatsFixture(null)}
              >
                <FiX />
              </button>
            </div>

            {/* Live / completed context notice */}
            {statsFixture.status === 'LIVE' ? (
              <div className="fxa-stats-notice fxa-stats-notice--live">
                <strong>Live statistics</strong> — Fantasy scoring is <em>not</em> triggered until
                you click <strong>Final Save &amp; Score</strong>.
              </div>
            ) : (
              <div className="fxa-stats-notice fxa-stats-notice--completed">
                <strong>Final statistics</strong> — saving will trigger Fantasy scoring automatically.
              </div>
            )}

            {/* Error / success banners */}
            {statsError && (
              <div className="fxa-error-banner" role="alert">
                {statsError}
                <button type="button" className="fxa-btn fxa-btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => setStatsError(null)}>✕</button>
              </div>
            )}
            {statsNotice && (
              <div className="fxa-stats-notice fxa-stats-notice--success" role="status">
                ✓ {statsNotice}
                <button type="button" className="fxa-btn fxa-btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => setStatsNotice(null)}>✕</button>
              </div>
            )}

            {/* Body */}
            {statsLoading ? (
              <p className="fxa-empty">Loading statistics…</p>
            ) : !statsData ? null : statsData.players.length === 0 ? (
              <p className="fxa-empty">No players found for this fixture.</p>
            ) : (
              <>
                {/* Statistics table — columns driven by the sport catalogue */}
                <div className="fxa-stats-table-wrap">
                  <table className="fxa-stats-table">
                    <thead>
                      <tr>
                        <th className="fxa-stats-table__player-col">Player</th>
                        {statsData.stat_types.map((code) => (
                          <th key={code} title={statsData.stat_labels[code] ?? code}>
                            {/* Short label: first word of label, e.g. "Goals" */}
                            {(statsData.stat_labels[code] ?? code).split(' ')[0]}
                          </th>
                        ))}
                        <th className="fxa-stats-table__pool-col">Pool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.players.map((player) => {
                        const playerVals = pendingValues[player.participant_id] ?? {};
                        const hasNoStats = player.stats.length === 0 &&
                          statsData.stat_types.every(
                            (code) => (playerVals[code] ?? '').trim() === '',
                          );
                        return (
                          <tr
                            key={player.participant_id}
                            className={[
                              player.in_fantasy_pool ? 'fxa-stats-row--fantasy' : '',
                              hasNoStats ? 'fxa-stats-row--empty' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            <td className="fxa-stats-table__player-col">
                              <span className="fxa-stats-player-name">{player.participant_name}</span>
                            </td>
                            {statsData.stat_types.map((code) => (
                              <td key={code}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className="fxa-stats-input"
                                  value={playerVals[code] ?? ''}
                                  placeholder="—"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPendingValues((prev) => ({
                                      ...prev,
                                      [player.participant_id]: {
                                        ...(prev[player.participant_id] ?? {}),
                                        [code]: val,
                                      },
                                    }));
                                  }}
                                />
                              </td>
                            ))}
                            <td className="fxa-stats-table__pool-col">
                              {player.in_fantasy_pool ? (
                                <span className="fxa-stats-pool-badge" title="In Fantasy pool">F</span>
                              ) : (
                                <span className="fxa-stats-pool-badge fxa-stats-pool-badge--none" title="Not in Fantasy pool">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Action footer */}
                <div className="fxa-stats-drawer__footer">
                  {statsFixture.status === 'LIVE' ? (
                    <>
                      <button
                        type="button"
                        className="fxa-btn fxa-btn--ghost"
                        disabled={statsSaving}
                        onClick={() => void handleSaveStatistics(false)}
                      >
                        {statsSaving ? 'Saving…' : 'Save (no scoring)'}
                      </button>
                      <button
                        type="button"
                        className="fxa-btn fxa-btn--primary"
                        disabled={statsSaving}
                        onClick={() => void handleSaveStatistics(true)}
                      >
                        {statsSaving ? 'Saving…' : 'Final Save & Score'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="fxa-btn fxa-btn--primary"
                      disabled={statsSaving}
                      onClick={() => void handleSaveStatistics(true)}
                    >
                      {statsSaving ? 'Saving…' : 'Save & Trigger Scoring'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="fxa-btn fxa-btn--ghost"
                    onClick={() => setStatsFixture(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default FixturesAdmin;
