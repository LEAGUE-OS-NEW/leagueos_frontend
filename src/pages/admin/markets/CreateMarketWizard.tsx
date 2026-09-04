import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  convertProposalToDraft,
  configureOpeningPricing,
  createMarketDraft,
  fetchCanonicalCompetitions,
  fetchCanonicalSportingEvents,
  fetchMarketCatalogueOptions,

  publishMarket,
  revertMarketToDraft,
  setParameters as saveParameters,
  updateOutcomes,
  updateMarketResolution,
  type Market,
  type MarketCategory,
  type MarketParameters,
} from '../../../services/marketAdminService';
import type { MarketCategory as ApiMarketCategory, NamedResource, SportResource, SportingEvent } from '../../../types/api';
import './CreateMarketWizard.css';
import { formatMarketUgx, probabilityPctToUgxSharePrice } from '../../../utils/marketPricing';

const STEP_LABELS = ['Event & Market', 'Outcomes & Resolution', 'Trading Setup', 'Review & Publish'];

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

function fixtureTimingDefaults(fixture: SportingEvent, opensAt = new Date().toISOString()) {
  const settlementBase = fixture.ends_at
    ? new Date(fixture.ends_at).getTime() + 48 * 60 * 60_000
    : new Date(fixture.starts_at).getTime() + 52 * 60 * 60_000;
  return { opensAt, closesAt: fixture.starts_at, settlesBy: new Date(settlementBase).toISOString() };
}

interface DetailsForm {
  scopeType: 'EVENT' | 'COMPETITION' | 'CUSTOM';
  sportId: string;
  categoryId: string;
  competitionId: string;
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
  const detailsSaveInFlight = useRef(false);

  const [sports, setSports] = useState<SportResource[]>([]);
  const [categories, setCategories] = useState<ApiMarketCategory[]>([]);
  const [competitions, setCompetitions] = useState<Array<NamedResource & { sport: SportResource }>>([]);
  const [fixtures, setFixtures] = useState<SportingEvent[]>([]);
  const [fixtureSportFilter, setFixtureSportFilter] = useState('');
  const [fixtureCompetitionFilter, setFixtureCompetitionFilter] = useState('');
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMarketCatalogueOptions(), fetchCanonicalCompetitions(), fetchCanonicalSportingEvents()])
      .then(([catalogue, competitionRows, eventRows]) => {
        if (!cancelled) {
          const now = Date.now();
          setSports(catalogue.sports);
          setCategories(catalogue.categories);
          setCompetitions(competitionRows);
          setFixtures(eventRows
            .filter((fixture) => fixture.status === 'SCHEDULED' && new Date(fixture.starts_at).getTime() > now)
            .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()));
        }
      })
      .catch(() => {
        // Fixtures are a convenience picker only — manual entry still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [details, setDetails] = useState<DetailsForm>({
    scopeType: 'EVENT',
    sportId: '',
    categoryId: '',
    competitionId: '',
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
  const [resolution, setResolution] = useState({ resolutionSource: '', resolutionCriteria: '', rules: '' });
  const [faceValueUgx, setFaceValueUgx] = useState(10_000);

  const [parameters, setParameters] = useState<MarketParameters | null>(null);
  const completeSetEstimate = parameters && faceValueUgx > 0 ? Math.floor(parameters.initialLiquidityUgx / faceValueUgx) : 0;
  const halfSpread = parameters ? parameters.openingSpreadBps / 20_000 : 0;
  const yesReference = outcomes.yesProbability / 100;
  const noReference = 1 - yesReference;
  const estimatedYesAsk = Math.min(0.99999, yesReference + halfSpread) * faceValueUgx;
  const estimatedNoAsk = Math.min(0.99999, noReference + halfSpread) * faceValueUgx;
  const visibleFixtures = fixtures.filter((fixture) =>
    (!fixtureSportFilter || fixture.sport.id === fixtureSportFilter) &&
    (!fixtureCompetitionFilter || fixture.competition?.id === fixtureCompetitionFilter));
  const timingError = parameters && [parameters.opensAt, parameters.closesAt, parameters.settlesBy]
    .some((value) => !value || !Number.isFinite(new Date(value).getTime()))
    ? 'Trading opens, trading closes, and settlement target are required.'
    : parameters && new Date(parameters.closesAt).getTime() <= new Date(parameters.opensAt).getTime()
      ? 'Trading must close after it opens.'
      : parameters && new Date(parameters.settlesBy).getTime() < new Date(parameters.closesAt).getTime()
        ? 'Settlement target must be at or after the trading close time.'
        : null;

  const detailsValid =
    details.sportId.length > 0 &&
    details.categoryId.length > 0 &&
    (details.scopeType !== 'EVENT' || Boolean(details.sportingEventId)) &&
    (details.scopeType !== 'COMPETITION' || Boolean(details.competitionId)) &&
    details.eventLabel.trim().length > 0 &&
    details.question.trim().length > 6 &&
    details.question.trim().endsWith('?');

  const handleSelectFixture = (fixture: SportingEvent) => {
    setDetails((current) => ({
      ...current,
      scopeType: 'EVENT',
      sportingEventId: String(fixture.id),
      sportId: fixture.sport.id,
      competitionId: fixture.competition?.id ?? '',
      eventLabel: fixture.name,
      competition: fixture.competition?.name ?? '',
      venue: fixture.venue ?? '',
      kickoff: fixture.starts_at,
    }));
    setParameters((current) => current && { ...current, ...fixtureTimingDefaults(fixture, current.opensAt) });
  };

  const handleNextFromDetails = async () => {
    if (detailsSaveInFlight.current) return;
    detailsSaveInFlight.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await createMarketDraft({
        scopeType: details.scopeType,
        sportId: details.sportId,
        categoryId: details.categoryId,
        competitionId: details.competitionId,
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
      const selectedFixture = fixtures.find((fixture) => String(fixture.id) === details.sportingEventId);
      setParameters(selectedFixture
        ? { ...created.parameters, ...fixtureTimingDefaults(selectedFixture, created.parameters.opensAt) }
        : created.parameters);
      if (seed.sourceProposalId) {
        await convertProposalToDraft(seed.sourceProposalId);
      }
      setStep(1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this market.');
    } finally {
      detailsSaveInFlight.current = false;
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
      const withResolution = await updateMarketResolution(updated.id, resolution);
      const withPricing = await configureOpeningPricing(withResolution.id, faceValueUgx, outcomes.yesProbability);
      setMarket(withPricing);
      setStep(2);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save these outcomes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromParameters = async () => {
    if (!market || !parameters) return;
    if (timingError) {
      setSaveError(timingError);
      return;
    }
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

  const handleRevertToDraft = async () => {
    if (!market) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await revertMarketToDraft(market.id, `Publish failed: ${saveError ?? 'reverted for editing'}`);
      setMarket(updated);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not revert this market to draft.');
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
            {market?.status === 'Upcoming' && (
              <button type="button" className="wiz-btn wiz-btn--outline" disabled={isSaving} onClick={() => void handleRevertToDraft()}>
                Revert to Draft
              </button>
            )}
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
                <p className="wiz-hint">Choose what the proposition is about. Scope is contractual and is not inferred from its wording.</p>

                <fieldset className="wiz-scope-picker">
                  <legend>Market scope</legend>
                  {([
                    ['EVENT', 'Event', 'Will City Oilers beat Namuwongo Blazers?'],
                    ['COMPETITION', 'Competition', 'Will City Oilers win the National Basketball League?'],
                    ['CUSTOM', 'Custom proposition', 'A legitimate standalone YES/NO proposition'],
                  ] as const).map(([value, label, example]) => (
                    <label key={value} className={`wiz-scope-option${details.scopeType === value ? ' is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="market-scope"
                        value={value}
                        checked={details.scopeType === value}
                        onChange={() => setDetails((current) => ({
                          ...current,
                          scopeType: value,
                          sportingEventId: value === 'EVENT' ? current.sportingEventId : undefined,
                          eventLabel: value === 'CUSTOM' ? '' : current.eventLabel,
                          venue: value === 'EVENT' ? current.venue : '',
                          kickoff: value === 'EVENT' ? current.kickoff : '',
                        }))}
                      />
                      <b>{label}</b>
                      <small>{example}</small>
                    </label>
                  ))}
                </fieldset>

                {details.scopeType === 'EVENT' && (
                  <div className="wiz-field-grid">
                    <label className="wiz-field">
                      <span>Sport filter</span>
                      <select aria-label="Sport filter" value={fixtureSportFilter} onChange={(event) => {
                        setFixtureSportFilter(event.target.value);
                        setFixtureCompetitionFilter('');
                      }}>
                        <option value="">All sports</option>
                        {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
                      </select>
                    </label>
                    <label className="wiz-field">
                      <span>Competition filter</span>
                      <select aria-label="Competition filter" value={fixtureCompetitionFilter} onChange={(event) => setFixtureCompetitionFilter(event.target.value)}>
                        <option value="">All competitions</option>
                        {competitions.filter((item) => !fixtureSportFilter || item.sport.id === fixtureSportFilter).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label className="wiz-field">
                      <span>Event / Fixture</span>
                      <select
                        aria-label="Event / Fixture"
                        value={details.sportingEventId ?? ''}
                        onChange={(event) => {
                          const fixture = fixtures.find((item) => String(item.id) === event.target.value);
                          if (fixture) handleSelectFixture(fixture);
                        }}
                      >
                        <option value="">Select an upcoming fixture</option>
                        {visibleFixtures.map((fixture) => (
                          <option key={fixture.id} value={fixture.id}>
                            {fixture.name} — {fixture.competition?.name ?? fixture.sport.name} — {formatDateTime(fixture.starts_at)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {details.scopeType === 'EVENT' && fixtures.length === 0 && (
                  <p className="wiz-hint">No upcoming verified fixtures are currently available. Add or verify future fixtures in Sports Data before creating an event market.</p>
                )}

                {details.scopeType === 'EVENT' && details.sportingEventId && (
                  <section className="wiz-canonical-card" aria-label="Selected fixture details">
                    <div className="wiz-canonical-card__head">
                      <div><small>Selected canonical fixture</small><h4>{details.eventLabel}</h4></div>
                      <button type="button" className="wiz-btn wiz-btn--outline" onClick={() => setDetails((current) => ({
                        ...current, sportingEventId: undefined, sportId: '', competitionId: '', competition: '',
                        eventLabel: '', venue: '', kickoff: '',
                      }))}>Change fixture</button>
                    </div>
                    <dl className="wiz-canonical-grid">
                      <div><dt>Sport</dt><dd>{sports.find((sport) => sport.id === details.sportId)?.name ?? 'From selected fixture'}</dd></div>
                      <div><dt>Competition</dt><dd>{details.competition || 'No competition recorded'}</dd></div>
                      <div><dt>Venue</dt><dd>{details.venue || 'No venue recorded'}</dd></div>
                      <div><dt>Kickoff</dt><dd>{details.kickoff ? formatDateTime(details.kickoff) : 'No kickoff recorded'}</dd></div>
                    </dl>
                    <p className="wiz-hint">Sport, competition, venue and kickoff come from Sports Data and cannot be edited here.</p>
                  </section>
                )}

                <div className="wiz-field-grid">
                  {details.scopeType !== 'EVENT' && <label className="wiz-field">
                    <span>{details.scopeType === 'CUSTOM' ? 'Custom subject' : 'Competition proposition subject'}</span>
                    <input value={details.eventLabel} onChange={(event) => setDetails((current) => ({ ...current, eventLabel: event.target.value }))} placeholder={details.scopeType === 'CUSTOM' ? 'Season awards proposition' : 'City Oilers'} />
                  </label>}
                  {details.scopeType !== 'EVENT' && <label className="wiz-field">
                    <span>Sport</span>
                    <small>The sport this market belongs to.</small>
                    <select
                      value={details.sportId}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, sportId: event.target.value, competitionId: '', competition: '' }))
                      }
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  </label>}
                  <label className="wiz-field">
                    <span>Market Type</span>
                    <small>The proposition category, independent of sport.</small>
                    <select value={details.categoryId} onChange={(event) => setDetails((current) => ({ ...current, categoryId: event.target.value }))}>
                      <option value="">Select market type</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  {details.scopeType === 'COMPETITION' && <label className="wiz-field">
                    <span>Competition</span>
                    <small>Select the canonical competition; this wizard does not edit Sports Data.</small>
                    <select value={details.competitionId} onChange={(event) => { const selected = competitions.find((item) => item.id === event.target.value); setDetails((current) => ({ ...current, competitionId: event.target.value, competition: selected?.name ?? '' })); }}>
                      <option value="">Select competition</option>
                      {competitions.filter((item) => !details.sportId || item.sport.id === details.sportId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>}
                  <label className="wiz-field">
                    <span>Match Type</span>
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
                  Every League OS market resolves to exactly one of two fixed outcomes.
                </p>
                <h3>Opening Price</h3>
                <div className="wiz-field-grid">
                  <label className="wiz-field"><span>Full winning share value (UGX)</span><input aria-label="Full winning share value (UGX)" type="number" min={1} step={1} value={faceValueUgx} onChange={(event) => setFaceValueUgx(Number(event.target.value))} /></label>
                  <label className="wiz-field"><span>Opening YES probability (%)</span><input aria-label="Opening YES probability (%)" type="number" min={0.01} max={99.99} step={0.01} value={outcomes.yesProbability} onChange={(event) => setOutcomes((current) => ({ ...current, yesProbability: Number(event.target.value) }))} /><small>NO probability: {100 - outcomes.yesProbability}%</small></label>
                </div>
                <p className="wiz-hint">Opening prices are reference prices. Actual executable prices update from the live order book as participants place orders.</p>
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
                    <p className="wiz-hint">Short display label for the YES side.</p>
                    <p>{outcomes.yesProbability}%</p>
                    <p className="wiz-outcome-card__price">{formatMarketUgx(probabilityPctToUgxSharePrice(outcomes.yesProbability, faceValueUgx))}/share</p>
                    <p>Pays {formatMarketUgx(faceValueUgx)} if YES wins</p>
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
                    <p className="wiz-hint">Short display label for the NO side.</p>
                    <p>{100 - outcomes.yesProbability}%</p>
                    <p className="wiz-outcome-card__price">{formatMarketUgx(probabilityPctToUgxSharePrice(100 - outcomes.yesProbability, faceValueUgx))}/share</p>
                    <p>Pays {formatMarketUgx(faceValueUgx)} if NO wins</p>
                  </div>
                </div>
                <div className="wiz-field-grid">
                  <label className="wiz-field"><span>Resolution Source</span><small>The authoritative publication used to decide the result.</small><input value={resolution.resolutionSource} onChange={(event) => setResolution((current) => ({ ...current, resolutionSource: event.target.value }))} /></label>
                  <label className="wiz-field"><span>Resolution Criteria</span><small>The exact condition that makes YES win.</small><textarea value={resolution.resolutionCriteria} onChange={(event) => setResolution((current) => ({ ...current, resolutionCriteria: event.target.value }))} /></label>
                  <label className="wiz-field"><span>Rules / Void Conditions</span><small>Timing, postponement, correction, and void handling.</small><textarea value={resolution.rules} onChange={(event) => setResolution((current) => ({ ...current, rules: event.target.value }))} /></label>
                </div>
              </div>
            )}

            {step === 2 && parameters && (
              <div className="wiz-panel">
                <h3>Trading Setup</h3>
                <p className="wiz-hint">Only settings enforced by the market backend are shown.</p>
                <div className="wiz-field-grid">
                  <label className="wiz-field">
                    <span>Trading Opens</span>
                    <small>When orders can first be placed.</small>
                    <input
                      type="datetime-local"
                      required
                      value={toLocalInputValue(parameters.opensAt)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, opensAt: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Trading Closes</span>
                    <small>When new orders stop being accepted.</small>
                    <input
                      type="datetime-local"
                      required
                      value={toLocalInputValue(parameters.closesAt)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, closesAt: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                  <label className="wiz-field">
                    <span>Settlement Target</span>
                    <small>Target time for financial settlement after the result and dispute process. Settlement is not automatic.</small>
                    <input
                      aria-label="Settlement Target"
                      type="datetime-local"
                      required
                      value={toLocalInputValue(parameters.settlesBy)}
                      onChange={(event) =>
                        setParameters((current) => current && { ...current, settlesBy: fromLocalInputValue(event.target.value) })
                      }
                    />
                  </label>
                </div>
                {timingError && <p className="wiz-field-error" role="alert">{timingError}</p>}

                <section className="wiz-outcome-card" aria-label="Opening Liquidity">
                  <h3>Opening Liquidity</h3>
                  <div className="wiz-field-grid">
                    <label className="wiz-field"><span>Liquidity Source</span><select aria-label="Liquidity Source" value={parameters.liquiditySource} disabled><option value="PLATFORM_TREASURY">Platform Treasury</option></select></label>
                    <label className="wiz-field"><span>Initial Liquidity (UGX)</span><input aria-label="Initial Liquidity (UGX)" type="number" min="0" step="1" value={parameters.initialLiquidityUgx} onChange={(event) => setParameters((current) => current && ({ ...current, initialLiquidityUgx: Number(event.target.value) }))} /></label>
                    <label className="wiz-field"><span>Opening Spread</span><input aria-label="Opening Spread" type="number" min="0" max="50" step="0.01" value={parameters.openingSpreadBps / 100} onChange={(event) => setParameters((current) => current && ({ ...current, openingSpreadBps: Number(event.target.value) * 100 }))} /><small>%</small></label>
                  </div>
                  <p>Opening liquidity is funded by the platform treasury and creates real, fully collateralized YES/NO inventory when the market opens.</p>
                  {parameters.initialLiquidityUgx === 0 && <p>Fan limit orders can still bootstrap liquidity through complementary matching.</p>}
                  <p>Winning share value: {formatMarketUgx(faceValueUgx)}<br />Initial liquidity: {formatMarketUgx(parameters.initialLiquidityUgx)}<br />Approx. complete sets: {completeSetEstimate}<br />Approx. YES shares: {completeSetEstimate}<br />Approx. NO shares: {completeSetEstimate}</p>
                  <p>Opening reference:<br />YES {outcomes.yesProbability.toFixed(0)}%<br />NO {(100 - outcomes.yesProbability).toFixed(0)}%</p>
                  <p>Estimated opening asks after spread:<br />YES {formatMarketUgx(estimatedYesAsk)}<br />NO {formatMarketUgx(estimatedNoAsk)}</p>
                  <small>These are estimates only. Orders exist only after the backend reports liquidity ACTIVE.</small>
                </section>

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
                    <small>Promotes the market in public discovery.</small>
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
                    <span className="wiz-kv-item__key">Sport / Market Type</span>
                    <span className="wiz-kv-item__value">{sports.find((item) => item.id === details.sportId)?.name} / {categories.find((item) => item.id === details.categoryId)?.name}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Outcomes</span>
                    <span className="wiz-kv-item__value">
                      YES — {outcomes.yesLabel} / NO — {outcomes.noLabel}
                    </span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Opens</span>
                    <span className="wiz-kv-item__value">{formatDateTime(parameters.opensAt)}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Trading closes</span>
                    <span className="wiz-kv-item__value">{formatDateTime(parameters.closesAt)}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Settlement target</span>
                    <span className="wiz-kv-item__value">{formatDateTime(parameters.settlesBy)}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Fixture kickoff</span>
                    <span className="wiz-kv-item__value">{details.kickoff ? formatDateTime(details.kickoff) : 'No kickoff recorded'}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Resolution</span>
                    <span className="wiz-kv-item__value">{resolution.resolutionSource}: {resolution.resolutionCriteria}</span>
                  </div>
                  <div className="wiz-kv-item">
                    <span className="wiz-kv-item__key">Created by</span>
                    <span className="wiz-kv-item__value">{market.createdBy}</span>
                  </div>
                </div>
                <div className="wiz-outcome-card">
                  <span className="wiz-kv-item__key">Fan-facing preview</span>
                  <h3>{details.question}</h3>
                  <p>{details.description}</p>
                  <p><b>YES</b> {outcomes.yesLabel} &nbsp; <b>NO</b> {outcomes.noLabel}</p>
                  <small>{resolution.rules}</small>
                </div>
                <section className="wiz-outcome-card" aria-label="Opening Liquidity review">
                  <h3>Opening Liquidity</h3>
                  <p>Source: Platform Treasury<br />Initial collateral: {formatMarketUgx(parameters.initialLiquidityUgx)}<br />Complete-set estimate: {completeSetEstimate}<br />Opening spread: {(parameters.openingSpreadBps / 100).toFixed(2)}%<br />YES opening reference: {outcomes.yesProbability.toFixed(0)}%<br />NO opening reference: {(100 - outcomes.yesProbability).toFixed(0)}%<br />Estimated opening asks: YES {formatMarketUgx(estimatedYesAsk)} / NO {formatMarketUgx(estimatedNoAsk)}</p>
                  <strong>Liquidity activates when the market is opened, not when this draft is saved.</strong>
                </section>
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
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={isSaving || faceValueUgx <= 0 || outcomes.yesProbability <= 0 || outcomes.yesProbability >= 100 || !outcomes.yesLabel.trim() || !outcomes.noLabel.trim() || !resolution.resolutionSource.trim() || !resolution.resolutionCriteria.trim() || !resolution.rules.trim()} onClick={handleNextFromOutcomes}>
                {isSaving ? 'Saving…' : 'Next'} <FiChevronRight />
              </button>
            )}
            {step === 2 && (
              <button type="button" className="wiz-btn wiz-btn--gradient" disabled={isSaving || Boolean(timingError)} onClick={handleNextFromParameters}>
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
