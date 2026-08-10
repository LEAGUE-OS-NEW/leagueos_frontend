import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getPublicFixtures, type PublicFixtureApi } from '../../../services/publicDashboardService';
import {
  convertProposalToDraft,
  createMarketDraft,
  MARKET_CATEGORIES,

  publishMarket,
  setParameters as saveParameters,
  updateOutcomes,
  type Market,
  type MarketCategory,
  type MarketParameters,
} from '../../../services/marketAdminService';
import './CreateMarketWizard.css';

const STEP_LABELS = ['Market Details', 'Outcomes', 'Parameters', 'Review'];

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return value ? new Date(value).toISOString() : '';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUgx(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

interface DetailsForm {
  sportingEventId?: string;
  eventLabel: string;
  competition: string;
  venue: string;
  kickoff: string;
  category: MarketCategory;
  question: string;
  description: string;
  tags: string;
}

interface OutcomesForm {
  yesLabel: string;
  yesDescription: string;
  yesProbability: number;
  noLabel: string;
  noDescription: string;
}

interface WizardSeed {
  seedEventLabel?: string;
  seedQuestion?: string;
  sourceProposalId?: string;
}

function CreateMarketWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const seed = (location.state ?? {}) as WizardSeed;

  const [step, setStep] = useState(0);
  const [market, setMarket] = useState<Market | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishOutcome, setPublishOutcome] = useState<'published' | null>(null);

  const [fixtures, setFixtures] = useState<PublicFixtureApi[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPublicFixtures()
      .then((result) => {
        if (!cancelled) setFixtures(result.slice(0, 12));
      })
      .catch(() => {
        // Fixtures are a convenience picker only — manual entry still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [details, setDetails] = useState<DetailsForm>({
    eventLabel: seed.seedEventLabel ?? '',
    competition: '',
    venue: '',
    kickoff: '',
    category: 'Football',
    question: seed.seedQuestion ?? '',
    description: '',
    tags: '',
  });

  const [outcomes, setOutcomes] = useState<OutcomesForm>({
    yesLabel: 'Yes',
    yesDescription: '',
    yesProbability: 50,
    noLabel: 'No',
    noDescription: '',
  });

  const [parameters, setParameters] = useState<MarketParameters | null>(null);

  const detailsValid =
    details.eventLabel.trim().length > 0 &&
    details.question.trim().length > 6 &&
    details.question.trim().endsWith('?');

  const handleSelectFixture = (fixture: PublicFixtureApi) => {
    setDetails((current) => ({
      ...current,
      sportingEventId: String(fixture.id),
      eventLabel: `${fixture.home_club_name} vs ${fixture.away_club_name}`,
      competition: fixture.competition_name,
      venue: fixture.venue,
      kickoff: fixture.match_date,
    }));
  };

  const handleNextFromDetails = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await createMarketDraft({
        sportingEventId: details.sportingEventId,
        eventLabel: details.eventLabel,
        competition: details.competition,
        venue: details.venue,
        kickoff: details.kickoff || new Date().toISOString(),
        category: details.category,
        question: details.question,
        description: details.description,
        tags: details.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setMarket(created);
      setParameters(created.parameters);
      if (seed.sourceProposalId) {
        await convertProposalToDraft(seed.sourceProposalId);
      }
      setStep(1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromOutcomes = async () => {
    if (!market) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateOutcomes(market.id, [
        {
          id: 'YES',
          label: outcomes.yesLabel,
          description: outcomes.yesDescription,
          probabilityPct: outcomes.yesProbability,
        },
        {
          id: 'NO',
          label: outcomes.noLabel,
          description: outcomes.noDescription,
          probabilityPct: 100 - outcomes.yesProbability,
        },
      ]);
      setMarket(updated);
      setStep(2);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save these outcomes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromParameters = async () => {
    if (!market || !parameters) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await saveParameters(market.id, parameters);
      setMarket(updated);
      setStep(3);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save these parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!market) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await publishMarket(market.id);
      setMarket(updated);
      setPublishOutcome('published');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not publish this market.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="wiz-root">
        <div className="wiz-head">
          <div>
            <p className="wiz-eyebrow">Create Market</p>
            <h1>{details.eventLabel || 'New Market'}</h1>
          </div>
          {publishOutcome === null && (
            <button type="button" className="wiz-btn wiz-btn--ghost" onClick={() => navigate('/dashboard/admin/markets')}>
              Cancel
            </button>
          )}
        </div>

        <div className="wiz-stepper">
          {STEP_LABELS.map((label, index) => (
            <div key={label} className={`wiz-step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}>
              <span className="wiz-step__circle">{index < step ? <FiCheckCircle aria-hidden="true" /> : index + 1}</span>
              <span className="wiz-step__label">{label}</span>
            </div>
          ))}
        </div>

        {saveError && (
          <div className="wiz-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}

        {publishOutcome && (
          <div className="wiz-outcome wiz-outcome--published">
            <span className="wiz-outcome__icon">
              <FiCheckCircle aria-hidden="true" />
            </span>
            <div>
              <h3>Market published</h3>
              <p>
                <b>{market?.eventLabel}</b> is now {market?.status.toLowerCase()} and visible to fans on the landing
                page and Markets page.
              </p>
            </div>
            <button type="button" className="wiz-btn wiz-btn--gradient" onClick={() => navigate('/dashboard/admin/markets')}>
              Back to Markets
            </button>
          </div>
        )}

        {!publishOutcome && (
          <div className="wiz-body">
            {step === 0 && (
              <div className="wiz-panel">
                <h3>Market Details</h3>
                <p className="wiz-hint">Pick a fixture (optional) then define the YES/NO question fans will settle.</p>

                {fixtures.length > 0 && (
                  <div className="wiz-fixture-list">
                    {fixtures.map((fixture) => (
                      <button
                        type="button"
                        key={fixture.id}
                        className={`wiz-fixture-card${details.sportingEventId === String(fixture.id) ? ' is-selected' : ''}`}
                        onClick={() => handleSelectFixture(fixture)}
                      >
                        <span className="wiz-fixture-card__teams">
                          {fixture.home_club_name} vs {fixture.away_club_name}
                        </span>
                        <span className="wiz-fixture-card__meta">
                          {fixture.competition_name} &middot; {formatDateTime(fixture.match_date)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="wiz-field-grid">
                  <label className="wiz-field">
                    <span>Event label</span>
                    <input
                      type="text"
                      value={details.eventLabel}
                      onChange={(event) => setDetails((current) => ({ ...current, eventLabel: event.target.value }))}
                      placeholder="Vipers SC vs Express FC"
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Category</span>
                    <select
                      value={details.category}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, category: event.target.value as MarketCategory }))
                      }
                    >
                      {MARKET_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                 
                  <label className="wiz-field">
                    <span>Competition</span>
                    <input
                      type="text"
                      value={details.competition}
                      onChange={(event) => setDetails((current) => ({ ...current, competition: event.target.value }))}
                      placeholder="Uganda Premier League"
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Venue</span>
                    <input
                      type="text"
                      value={details.venue}
                      onChange={(event) => setDetails((current) => ({ ...current, venue: event.target.value }))}
                      placeholder="Mandela National Stadium"
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Kickoff</span>
                    <input
                      type="datetime-local"
                      value={details.kickoff ? toLocalInputValue(details.kickoff) : ''}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, kickoff: fromLocalInputValue(event.target.value) }))
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Tags (comma separated)</span>
                    <input
                      type="text"
                      value={details.tags}
                      onChange={(event) => setDetails((current) => ({ ...current, tags: event.target.value }))}
                      placeholder="derby, featured"
                    />
                  </label>
                </div>

                <label className="wiz-field">
                  <span>Question</span>
                  <input
                    type="text"
                    value={details.question}
                    onChange={(event) => setDetails((current) => ({ ...current, question: event.target.value }))}
                    placeholder="Will Vipers SC beat Express FC?"
                  />
                  {details.question.trim().length > 0 && !details.question.trim().endsWith('?') && (
                    <span className="wiz-field-error">The question must end with a question mark.</span>
                  )}
                </label>

                <label className="wiz-field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={details.description}
                    onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Resolves YES if Vipers SC win in regulation time."
                  />
                </label>

              </div>
            )}

            {step === 1 && (
              <div className="wiz-panel">
                <h3>Outcomes</h3>
                <p className="wiz-hint">
                  Every League OS market resolves to exactly one of two fixed outcomes. Set the starting implied
                  probability — this becomes the opening price fans see (UGX 10,000 x probability).
                </p>
                <div className="wiz-outcomes-grid">
                  <div className="wiz-outcome-card wiz-outcome-card--yes">
                    <span className="wiz-outcome-card__badge">YES</span>
                    <label className="wiz-field">
                      <span>Label</span>
                      <input
                        type="text"
                        value={outcomes.yesLabel}
                        onChange={(event) => setOutcomes((current) => ({ ...current, yesLabel: event.target.value }))}
                      />
                    </label>
                    <label className="wiz-field">
                      <span>Description</span>
                      <textarea
                        rows={2}
                        value={outcomes.yesDescription}
                        onChange={(event) => setOutcomes((current) => ({ ...current, yesDescription: event.target.value }))}
                      />
                    </label>
                    <label className="wiz-field">
                      <span>Probability: {outcomes.yesProbability}%</span>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={outcomes.yesProbability}
                        onChange={(event) =>
                          setOutcomes((current) => ({ ...current, yesProbability: Number(event.target.value) }))
                        }
                      />
                    </label>
                    <p className="wiz-outcome-card__price">{formatUgx(outcomes.yesProbability * 100)}</p>
                  </div>

                  <div className="wiz-outcome-card wiz-outcome-card--no">
                    <span className="wiz-outcome-card__badge">NO</span>
                    <label className="wiz-field">
                      <span>Label</span>
                      <input
                        type="text"
                        value={outcomes.noLabel}
                        onChange={(event) => setOutcomes((current) => ({ ...current, noLabel: event.target.value }))}
                      />
                    </label>
                    <label className="wiz-field">
                      <span>Description</span>
                      <textarea
                        rows={2}
                        value={outcomes.noDescription}
                        onChange={(event) => setOutcomes((current) => ({ ...current, noDescription: event.target.value }))}
                      />
                    </label>
                    <label className="wiz-field">
                      <span>Probability: {100 - outcomes.yesProbability}%</span>
                      <input type="range" min={1} max={99} value={100 - outcomes.yesProbability} disabled />
                    </label>
                    <p className="wiz-outcome-card__price">{formatUgx((100 - outcomes.yesProbability) * 100)}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && parameters && (
              <div className="wiz-panel">
                <h3>Parameters</h3>
                <p className="wiz-hint">Trading windows, liquidity, limits, and how this market is surfaced to fans.</p>
                <div className="wiz-field-grid">
                  <label className="wiz-field">
                    <span>Opens at</span>
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(parameters.opensAt)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, opensAt: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Closes at</span>
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(parameters.closesAt)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, closesAt: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Settles by</span>
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(parameters.settlesBy)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, settlesBy: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Initial liquidity (UGX)</span>
                    <input
                      type="number"
                      min={0}
                      value={parameters.initialLiquidityUgx}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, initialLiquidityUgx: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Min trade (UGX)</span>
                    <input
                      type="number"
                      min={0}
                      value={parameters.minTradeUgx}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, minTradeUgx: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Max trade (UGX)</span>
                    <input
                      type="number"
                      min={0}
                      value={parameters.maxTradeUgx}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, maxTradeUgx: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Position limit (UGX, optional)</span>
                    <input
                      type="number"
                      min={0}
                      value={parameters.positionLimitUgx ?? ''}
                      onChange={(event) =>
                        setParameters(
                          (current) =>
                            current && {
                              ...current,
                              positionLimitUgx: event.target.value ? Number(event.target.value) : undefined,
                            },
                        )
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Daily limit (UGX, optional)</span>
                    <input
                      type="number"
                      min={0}
                      value={parameters.dailyLimitUgx ?? ''}
                      onChange={(event) =>
                        setParameters(
                          (current) =>
                            current && {
                              ...current,
                              dailyLimitUgx: event.target.value ? Number(event.target.value) : undefined,
                            },
                        )
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Fee (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={parameters.feePct}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, feePct: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>

                <div className="wiz-toggle-row">
                  <label className="wiz-toggle">
                    <input
                      type="checkbox"
                      checked={parameters.featured}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, featured: event.target.checked })
                      }
                    />
                    Featured on landing page
                  </label>
                  <label className="wiz-toggle">
                    <input
                      type="checkbox"
                      checked={parameters.trending}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, trending: event.target.checked })
                      }
                    />
                    Trending
                  </label>
                  <label className="wiz-toggle">
                    <input
                      type="checkbox"
                      checked={parameters.recommended}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, recommended: event.target.checked })
                      }
                    />
                    Recommended
                  </label>
                  <label className="wiz-toggle">
                    <input
                      type="checkbox"
                      checked={parameters.inPlayTrading}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, inPlayTrading: event.target.checked })
                      }
                    />
                    Allow in-play trading
                  </label>
                </div>
              </div>
            )}

            {step === 3 && market && parameters && (
              <div className="wiz-panel">
                <h3>Review</h3>
                <div className="wiz-kv-grid">
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Event</span>
                    <span className="wiz-kv-item__value">{details.eventLabel}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Question</span>
                    <span className="wiz-kv-item__value">{details.question}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Category</span>
                    <span className="wiz-kv-item__value">{details.category}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Outcomes</span>
                    <span className="wiz-kv-item__value">
                      {outcomes.yesLabel} {outcomes.yesProbability}% / {outcomes.noLabel} {100 - outcomes.yesProbability}%
                    </span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Opens</span>
                    <span className="wiz-kv-item__value">{formatDateTime(parameters.opensAt)}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Closes</span>
                    <span className="wiz-kv-item__value">{formatDateTime(parameters.closesAt)}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Fee</span>
                    <span className="wiz-kv-item__value">{parameters.feePct}%</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Created by</span>
                    <span className="wiz-kv-item__value">{market.createdBy}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!publishOutcome && (
          <div className="wiz-footer">
            <button
              type="button"
              className="wiz-btn wiz-btn--outline"
              disabled={step === 0 || isSaving}
              onClick={() => setStep((current) => current - 1)}
            >
              <FiChevronLeft /> Back
            </button>
            {step === 0 && (
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={!detailsValid || isSaving} onClick={handleNextFromDetails}>
                {isSaving ? 'Saving…' : 'Next'} <FiChevronRight />
              </button>
            )}
            {step === 1 && (
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={isSaving} onClick={handleNextFromOutcomes}>
                {isSaving ? 'Saving…' : 'Next'} <FiChevronRight />
              </button>
            )}
            {step === 2 && (
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={isSaving} onClick={handleNextFromParameters}>
                {isSaving ? 'Saving…' : 'Next'} <FiChevronRight />
              </button>
            )}
            {step === 3 && (
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={isSaving} onClick={handlePublish}>
                {isSaving ? 'Publishing…' : 'Publish Market'}
              </button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default CreateMarketWizard;
