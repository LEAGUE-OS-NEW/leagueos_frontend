import { useEffect, useState } from 'react';
import { FiCheckCircle, FiPlay, FiPlus, FiSlash, FiClock } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractApiError } from '../../../services/apiUtils';
import {
  completeFixture,
  createFixture,
  createParticipant,
  fetchAdminFixtures,
  fetchCompetitions,
  fetchParticipants,
  fetchSports,
  setFixtureStatus,
  updateFixtureScore,
  type CompetitionOption,
  type FixtureAdminItem,
  type ParticipantOption,
  type SportOption,
} from '../../../services/fixtureAdminService';
import './FixturesAdmin.css';

const BLANK_CREATE = {
  sportId: '',
  competitionId: '',
  homeParticipantId: '',
  awayParticipantId: '',
  startsAt: '',
  venue: '',
};

type ScoreEditorState = { fixtureId: string; homeScore: string; awayScore: string; clockDisplay: string } | null;

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

  const [newParticipantName, setNewParticipantName] = useState('');
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  const [scoreEditor, setScoreEditor] = useState<ScoreEditorState>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

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

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim() || !createForm.sportId) return;
    setIsAddingParticipant(true);
    setActionError(null);
    try {
      const created = await createParticipant({ name: newParticipantName.trim(), sportId: createForm.sportId });
      setParticipants((current) => [...current, created]);
      setNewParticipantName('');
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleCreateFixture = async () => {
    if (!createForm.sportId || !createForm.homeParticipantId || !createForm.awayParticipantId || !createForm.startsAt) {
      setCreateMessage('Sport, both teams, and kickoff time are required.');
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
        venue: createForm.venue,
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

  const handleGoLive = async (fixtureId: string) => {
    setActionError(null);
    try {
      await setFixtureStatus(fixtureId, 'LIVE');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handlePostpone = async (fixtureId: string) => {
    setActionError(null);
    try {
      await setFixtureStatus(fixtureId, 'POSTPONED');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleCancel = async (fixtureId: string) => {
    setActionError(null);
    try {
      await setFixtureStatus(fixtureId, 'CANCELLED');
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleComplete = async (fixtureId: string) => {
    setActionError(null);
    try {
      await completeFixture(fixtureId);
      refreshFixtures();
    } catch (err) {
      setActionError(extractApiError(err).message);
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

  return (
    <AdminLayout>
      <div className="fxa-content">
        <div className="fxa-header">
          <div>
            <p className="fxa-header__eyebrow">Sports Data &amp; Statistics</p>
            <h1>Fixtures</h1>
            <p>Create fixtures, go live, and keep the score and clock up to date for the public site.</p>
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
              <div className="fxa-form-grid">
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
                <label className="fxa-field">
                  Kickoff
                  <input
                    type="datetime-local"
                    value={createForm.startsAt}
                    onChange={(event) => setCreateForm((current) => ({ ...current, startsAt: event.target.value }))}
                  />
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

              <div className="fxa-add-participant">
                <input
                  type="text"
                  value={newParticipantName}
                  onChange={(event) => setNewParticipantName(event.target.value)}
                  placeholder="Team not listed? Add it here…"
                  disabled={!createForm.sportId}
                />
                <button
                  type="button"
                  className="fxa-btn fxa-btn--ghost"
                  disabled={isAddingParticipant || !newParticipantName.trim() || !createForm.sportId}
                  onClick={() => void handleAddParticipant()}
                >
                  <FiPlus aria-hidden="true" /> Add Team
                </button>
              </div>

              {createMessage && <p className="fxa-compose-message">{createMessage}</p>}
              <div className="fxa-panel__footer">
                <button type="button" className="fxa-btn fxa-btn--primary" disabled={isCreating} onClick={() => void handleCreateFixture()}>
                  {isCreating ? 'Creating…' : 'Create Fixture'}
                </button>
              </div>
            </section>

            {/* ── Fixtures table ── */}
            <section className="fxa-panel">
              <div className="fxa-panel__header">
                <h2>All Fixtures</h2>
                <span className="fxa-panel__count">{fixtures.length} total</span>
              </div>

              {isLoading ? (
                <p className="fxa-empty">Loading fixtures…</p>
              ) : fixtures.length === 0 ? (
                <p className="fxa-empty">No fixtures yet — create one above.</p>
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
                      {fixtures.map((fixture) => (
                        <tr key={fixture.id}>
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
                              {fixture.status === 'SCHEDULED' && (
                                <button type="button" className="fxa-icon-btn" title="Go live" onClick={() => void handleGoLive(fixture.id)}>
                                  <FiPlay />
                                </button>
                              )}
                              {(fixture.status === 'LIVE' || fixture.status === 'SCHEDULED') && (
                                <button type="button" className="fxa-icon-btn" title="Update score" onClick={() => openScoreEditor(fixture)}>
                                  <FiClock />
                                </button>
                              )}
                              {fixture.status === 'LIVE' && (
                                <button
                                  type="button"
                                  className="fxa-icon-btn"
                                  title="Mark completed"
                                  onClick={() => void handleComplete(fixture.id)}
                                >
                                  <FiCheckCircle />
                                </button>
                              )}
                              {(fixture.status === 'SCHEDULED' || fixture.status === 'LIVE') && (
                                <>
                                  <button
                                    type="button"
                                    className="fxa-icon-btn"
                                    title="Postpone"
                                    onClick={() => void handlePostpone(fixture.id)}
                                  >
                                    <FiClock style={{ opacity: 0.6 }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="fxa-icon-btn fxa-icon-btn--danger"
                                    title="Cancel"
                                    onClick={() => void handleCancel(fixture.id)}
                                  >
                                    <FiSlash />
                                  </button>
                                </>
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
    </AdminLayout>
  );
}

export default FixturesAdmin;
