import { useEffect, useRef, useState } from 'react';
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiPause,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiShield,
  FiSlash,
  FiClock,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractApiError } from '../../../services/apiUtils';
import { createRealClub, uploadClubLogo } from '../../../services/adminUsersService';
import {
  completeFixture,
  createFixture,
  createParticipant,
  fetchAdminFixtures,
  fetchCompetitions,
  fetchParticipants,
  fetchSports,
  rescheduleFixture,
  setFixtureStatus,
  submitFixtureVerification,
  updateFixtureScore,
  type CompetitionOption,
  type FixtureAdminItem,
  type ParticipantOption,
  type SportOption,
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

  const [scoreEditor, setScoreEditor] = useState<ScoreEditorState>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const [rescheduleEditor, setRescheduleEditor] = useState<RescheduleEditorState>(null);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [submittingVerificationFor, setSubmittingVerificationFor] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const refreshFixtures = () => fetchAdminFixtures().then(setFixtures);

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
      const participant = await createParticipant({ name: club.name, sportId: createClubForm.sportId });
      setParticipants((current) => [...current, participant]);
      setShowCreateClub(false);
      setCreateClubForm({ name: '', sportId: createClubForm.sportId });
      setCreateClubLogo(null);
      setCreateMessage(`"${club.name}" created and ready to use as a team below.`);
    } catch (err) {
      setCreateClubError(extractApiError(err).message);
    } finally {
      setIsCreatingClub(false);
    }
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

  return (
    <AdminLayout>
      <div className="fxa-content">
        <div className="fxa-header">
          <div>
            <p className="fxa-header__eyebrow">Sports Data &amp; Statistics</p>
            <h1>Fixtures</h1>
            <p>Create fixtures, go live, and keep the score and clock up to date for the public site.</p>
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
              <div className="fxa-panel__header fxa-panel__header--fixtures">
                <h2>All Fixtures</h2>
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
                <div className="fxa-panel__header-right">
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
                  <span className="fxa-panel__count">{visibleFixtures.length} shown</span>
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
                        <th>Match</th>
                        <th>Kickoff</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th></th>
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
    </AdminLayout>
  );
}

export default FixturesAdmin;
