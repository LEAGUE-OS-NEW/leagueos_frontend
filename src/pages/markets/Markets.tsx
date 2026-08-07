import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiClock,
  FiAlertCircle,
  FiHelpCircle,
  FiRepeat,
  FiSearch,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import {
  GiBasketballBall,
  GiRugbyConversion,
  GiSoccerBall,
  GiTrophyCup,
} from "react-icons/gi";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import InfoTooltip from "../../components/InfoTooltip/InfoTooltip.tsx";
import { extractApiError } from "../../services/apiUtils.ts";
import { fetchPublicMarkets } from "../../services/markets/publicMarketsService.ts";
import { fetchContracts, fetchMarkets } from "../../services/marketAdminService.ts";
import type { SportingEvent } from "../../types/api.ts";
import "./Markets.css";

type Sport = "Football" | "Rugby" | "Basketball";
type SportFilter = "All" | Sport;

type FeaturedMarket = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  question: string;
  closesIn: string;
  status: string;
  probabilityPct: number;
  yesPrice: string;
  noPrice: string;
  volume: string;
  traders: string;
};

type OpenMarketRow = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  volume: string;
  closesIn: string;
};

type StartingSoonItem = {
  sport: Sport;
  teamA: string;
  teamB: string;
  league: string;
  startsIn: string;
};

type TrendingMarket = {
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  fireCount: string;
};

type ClosedMarketRow = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  result: string;
  volume: string;
  closedAgo: string;
};

const SPORT_META: Record<
  Sport,
  { icon: IconType; markets: string; live: string; className: string }
> = {
  Football: {
    icon: GiSoccerBall,
    markets: "1,284 markets",
    live: "87",
    className: "football",
  },
  Rugby: {
    icon: GiRugbyConversion,
    markets: "342 markets",
    live: "18",
    className: "rugby",
  },
  Basketball: {
    icon: GiBasketballBall,
    markets: "512 markets",
    live: "34",
    className: "basketball",
  },
};

const FEATURED_MARKETS: FeaturedMarket[] = [];

const OPEN_MARKETS: OpenMarketRow[] = [];

const STARTING_SOON: StartingSoonItem[] = [];

const CLOSED_MARKETS: ClosedMarketRow[] = [];

const HOW_IT_WORKS_STEPS: {
  icon: IconType;
  title: string;
  description: string;
  accent: "purple" | "orange" | "blue";
}[] = [
  {
    icon: FiSearch,
    title: "Explore markets",
    description: "Browse live and upcoming questions.",
    accent: "purple",
  },
  {
    icon: FiRepeat,
    title: "Pick your side",
    description: "Choose YES or NO and see the price.",
    accent: "orange",
  },
  {
    icon: FiBarChart2,
    title: "Trade & track",
    description: "Prices move as opinions change.",
    accent: "blue",
  },
  {
    icon: GiTrophyCup,
    title: "Cash out & win",
    description: "Cash out anytime or hold to settlement.",
    accent: "purple",
  },
];

const SPORT_FILTERS: SportFilter[] = ["All", "Football", "Rugby", "Basketball"];

const MARKET_STATUS_META: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "open" },
  RESOLVED: { label: "Resolved", className: "resolved" },
  VOIDED: { label: "Voided", className: "voided" },
};

function marketStatusMeta(status: string) {
  return MARKET_STATUS_META[status] ?? { label: status, className: "open" };
}

function formatStartsIn(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString("en-US", { weekday: "short" })}, ${time}`;
}

function isSupportedSport(sport: string): sport is Sport {
  return sport === "Football" || sport === "Rugby" || sport === "Basketball";
}

function mapEventToStartingSoon(event: SportingEvent): StartingSoonItem | null {
  const sport = event.sport?.name;
  if (!sport || !isSupportedSport(sport)) return null;

  const [teamA, teamB] = [...event.participants]
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.participant.name);
  if (!teamA || !teamB) return null;

  return {
    sport,
    teamA,
    teamB,
    league: event.competition?.name ?? sport,
    startsIn: formatStartsIn(event.starts_at),
  };
}

function teamsFromEventLabel(eventLabel: string): { teamA: string; teamB: string } {
  const [teamA, teamB] = eventLabel.split(" vs ");
  return { teamA: teamA ?? eventLabel, teamB: teamB ?? "Event market" };
}

function formatUgxVolume(amount: number): string {
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  return `UGX ${Math.round(amount / 1000)}K`;
}

function CrestPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function TeamCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="market-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="market-crest market-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function SportIcon({ sport }: { sport: Sport }) {
  const Icon = SPORT_META[sport].icon;
  return <Icon aria-hidden="true" />;
}

function OutcomeButton({
  label,
  value,
  choice,
  selected,
  onSelect,
}: {
  label: "Yes" | "No";
  value: string;
  choice: "yes" | "no";
  selected?: "yes" | "no";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`outcome-button outcome-button--${choice}${selected === choice ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected === choice}
    >
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );
}

function Markets() {
  const [openMarketFilter, setOpenMarketFilter] = useState<SportFilter>("All");
  const [featuredMarkets, setFeaturedMarkets] =
    useState<FeaturedMarket[]>(FEATURED_MARKETS);
  const [openMarkets, setOpenMarkets] = useState<OpenMarketRow[]>(OPEN_MARKETS);
  const [closedMarkets, setClosedMarkets] =
    useState<ClosedMarketRow[]>(CLOSED_MARKETS);
  const [startingSoon, setStartingSoon] = useState<StartingSoonItem[]>(STARTING_SOON);
  const [trendingMarkets, setTrendingMarkets] = useState<TrendingMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    // Starting Soon reads the real fixtures/events feed — it's about
    // upcoming fixtures whether or not a market exists for them yet, so it
    // stays on the real backend rather than the admin-published market list.
    fetchPublicMarkets(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setStartingSoon(
          data.events
            .filter((event) => new Date(event.starts_at).getTime() > Date.now())
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
            .map(mapEventToStartingSoon)
            .filter((item): item is StartingSoonItem => item !== null)
            .slice(0, 4),
        );
      })
      .catch(() => {
        // Starting Soon is a secondary widget — a failure here shouldn't
        // block the markets that actually drive this page.
      });

    // Featured / Open / Closed / Trending come from markets an admin has
    // actually published — this is what makes "admin publishes -> fan sees
    // it" real rather than a hardcoded landing-page mock.
    fetchMarkets()
      .then(async (allMarkets) => {
        if (controller.signal.aborted) return;
        const visible = allMarkets.filter(
          (market) => market.status !== "Draft" && isSupportedSport(market.category),
        );

        const contractEntries = await Promise.all(
          visible.map((market) => fetchContracts(market.id).then((contracts) => [market.id, contracts] as const)),
        );
        if (controller.signal.aborted) return;
        const contractsByMarket = new Map(contractEntries);
        const statsFor = (marketId: string) => {
          const contracts = contractsByMarket.get(marketId) ?? [];
          const totalUgx = contracts.reduce((sum, contract) => sum + contract.quantityUgx, 0);
          const traders = new Set(contracts.flatMap((contract) => [contract.buyer, contract.seller])).size;
          return { volume: formatUgxVolume(totalUgx), traders: traders.toLocaleString("en-US") };
        };

        const openStatus = visible.filter((market) => market.status === "Live" || market.status === "Upcoming");
        const closedStatus = visible.filter(
          (market) => market.status === "Resolved" || market.status === "Cancelled" || market.status === "Voided",
        );

        setFeaturedMarkets(
          openStatus.slice(0, 5).map((market) => {
            const yes = market.outcomes.find((outcome) => outcome.id === "YES")!;
            return {
              id: market.id,
              sport: market.category as Sport,
              ...teamsFromEventLabel(market.eventLabel),
              question: market.question,
              closesIn: new Date(market.parameters.closesAt).toLocaleString(),
              status: "OPEN",
              probabilityPct: yes.probabilityPct,
              yesPrice: `${yes.probabilityPct}¢`,
              noPrice: `${100 - yes.probabilityPct}¢`,
              ...statsFor(market.id),
            };
          }),
        );

        setOpenMarkets(
          openStatus.map((market) => {
            const yes = market.outcomes.find((outcome) => outcome.id === "YES")!;
            return {
              id: market.id,
              sport: market.category as Sport,
              ...teamsFromEventLabel(market.eventLabel),
              question: market.question,
              yesPrice: `${yes.probabilityPct}¢`,
              noPrice: `${100 - yes.probabilityPct}¢`,
              volume: statsFor(market.id).volume,
              closesIn: new Date(market.parameters.closesAt).toLocaleString(),
            };
          }),
        );

        setClosedMarkets(
          closedStatus.map((market) => ({
            id: market.id,
            sport: market.category as Sport,
            ...teamsFromEventLabel(market.eventLabel),
            question: market.question,
            result: market.winningOutcomeId ?? "VOIDED",
            volume: statsFor(market.id).volume,
            closedAgo: new Date(market.resolvedAt ?? market.parameters.closesAt).toLocaleString(),
          })),
        );

        setTrendingMarkets(
          openStatus
            .filter((market) => market.parameters.trending)
            .map((market) => ({
              sport: market.category as Sport,
              ...teamsFromEventLabel(market.eventLabel),
              question: market.question,
              fireCount: `${(contractsByMarket.get(market.id) ?? []).length} trades`,
            })),
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          const apiError = extractApiError(error);
          setMarketsError(
            apiError.status === 403
              ? "You do not have permission to view these markets."
              : apiError.message,
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setMarketsLoading(false);
      });
    return () => controller.abort();
  }, [loadAttempt]);
  const [selections, setSelections] = useState<Record<string, "yes" | "no">>(
    {},
  );
  const [savedFixtures, setSavedFixtures] = useState<string[]>([]);

  const visibleOpenMarkets = useMemo(() => {
    if (openMarketFilter === "All") return openMarkets;
    return openMarkets.filter((market) => market.sport === openMarketFilter);
  }, [openMarketFilter, openMarkets]);

  const selectOutcome = (id: string, outcome: "yes" | "no") => {
    setSelections((current) => ({ ...current, [id]: outcome }));
  };

  const toggleSaved = (match: string) => {
    setSavedFixtures((current) =>
      current.includes(match)
        ? current.filter((item) => item !== match)
        : [...current, match],
    );
  };

  const retryMarkets = () => {
    setMarketsLoading(true);
    setMarketsError("");
    setLoadAttempt((value) => value + 1);
  };

  return (
    <div className="markets-page">
      <Navbar />

      <main className="markets-main">
        {marketsLoading && (
          <div className="market-panel" aria-busy="true">
            Loading live markets…
          </div>
        )}
        {marketsError && (
          <div className="market-panel" role="alert">
            <FiAlertCircle /> {marketsError}{" "}
            <button type="button" onClick={retryMarkets}>
              Retry
            </button>
          </div>
        )}
        <div className="markets-main-inner">
          <section className="markets-hero">
            <img
              className="markets-hero-image"
              src="/images/fantasy1.png"
              alt=""
              aria-hidden="true"
            />
            <div className="markets-hero-overlay" aria-hidden="true" />
            <div className="markets-hero-inner">
              <p className="markets-eyebrow">Live Sports Markets</p>
              <h1 className="markets-heading">
                Predict. Trade.
                <br />
                <span className="markets-heading-gradient">
                  Follow the Game.
                </span>
              </h1>
              <p className="markets-subtext">
                Explore open sports markets across football, rugby and
                basketball in Uganda.
              </p>
              <div className="markets-hero-actions">
                <Link to="/signup" className="markets-cta markets-cta--primary">
                  Sign Up Now
                </Link>
                <a
                  href="#how-markets-work"
                  className="markets-cta markets-cta--accent"
                >
                  How It Works
                </a>
              </div>
            </div>
          </section>

          <section className="sports-summary" aria-label="Market categories">
            {(Object.keys(SPORT_META) as Sport[]).map((sport) => {
              const meta = SPORT_META[sport];
              return (
                <a
                  href={`#${meta.className}-markets`}
                  className={`sport-summary-card ${meta.className}`}
                  key={sport}
                >
                  <span className="sport-summary-icon">
                    <SportIcon sport={sport} />
                  </span>
                  <span className="sport-summary-copy">
                    <b>{sport}</b>
                    <small>{meta.markets}</small>
                    <em>
                      <i /> Live <strong>{meta.live}</strong>
                    </em>
                  </span>
                  <FiArrowRight className="sport-summary-arrow" />
                </a>
              );
            })}
          </section>

          <section
            className="market-panel featured-markets-panel"
            aria-labelledby="featured-markets-heading"
          >
            <div className="market-panel-heading">
              <div>
                <h2 id="featured-markets-heading">
                  <FiZap /> Featured Open Markets
                </h2>
                <p className="market-panel-subnote">
                  Explore trending questions. Trade your view.
                  <InfoTooltip
                    label="How prices work"
                    text="A YES price of 67¢ means the market currently sees a 67% chance of YES. Prices move as more people trade."
                  />
                  <InfoTooltip
                    label="What volume means"
                    text="Volume is the total value traded on a market so far — higher volume usually means a more reliable price."
                  />
                </p>
              </div>
              <Link to="/markets" className="market-view-link">
                View all markets
              </Link>
            </div>

            <div className="featured-markets-grid">
              {featuredMarkets.map((market) => (
                <article className="featured-market-card" key={market.id}>
                  <div className="featured-market-header">
                    <span
                      className={`sport-tag ${SPORT_META[market.sport].className}`}
                    >
                      {market.sport}
                    </span>
                    <span className={`open-badge open-badge--${marketStatusMeta(market.status).className}`}>
                      {marketStatusMeta(market.status).label}
                    </span>
                  </div>

                  <div className="featured-market-teams">
                    <div className="featured-market-team">
                      <TeamCrest src={market.crestA} name={market.teamA} />
                      <span>{market.teamA}</span>
                    </div>
                    <span className="featured-market-vs">vs</span>
                    <div className="featured-market-team">
                      <TeamCrest src={market.crestB} name={market.teamB} />
                      <span>{market.teamB}</span>
                    </div>
                  </div>

                  <Link to={`/markets/${market.id}`} className="featured-market-question">
                    {market.question}
                  </Link>
                  <p className="featured-market-closes">{market.closesIn}</p>

                  <div className="market-probability">
                    <div className="market-probability-track">
                      <div
                        className="market-probability-fill"
                        style={{ width: `${market.probabilityPct}%` }}
                      />
                    </div>
                    <span className="market-probability-label">{market.probabilityPct}% likely YES</span>
                  </div>

                  <div className="featured-market-stats">
                    <span>
                      <FiUsers /> {market.traders} traders
                    </span>
                    <span>Vol: {market.volume}</span>
                  </div>

                  <div className="market-outcomes">
                    <OutcomeButton
                      label="Yes"
                      value={market.yesPrice}
                      choice="yes"
                      selected={selections[market.id]}
                      onSelect={() => selectOutcome(market.id, "yes")}
                    />
                    <OutcomeButton
                      label="No"
                      value={market.noPrice}
                      choice="no"
                      selected={selections[market.id]}
                      onSelect={() => selectOutcome(market.id, "no")}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="markets-layout">
            <div className="markets-primary-column">
              <section
                className="market-panel open-markets-panel"
                aria-labelledby="open-markets-heading"
              >
                <div className="market-panel-heading">
                  <h2 id="open-markets-heading">Open Markets</h2>
                  <Link to="/markets" className="market-view-link">
                    View all markets
                  </Link>
                </div>

                <div
                  className="open-markets-filters"
                  role="group"
                  aria-label="Filter open markets by sport"
                >
                  {SPORT_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={openMarketFilter === filter ? "active" : ""}
                      onClick={() => setOpenMarketFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div
                  className="open-markets-table"
                  role="table"
                  aria-label="Open market list"
                >
                  <div
                    className="open-market-row open-market-labels"
                    role="row"
                  >
                    <span>Event</span>
                    <span>Market Question</span>
                    <span>
                      Yes
                      <InfoTooltip
                        label="What the YES price means"
                        text="What it costs to buy a YES share — reflects the market's current probability."
                      />
                    </span>
                    <span>
                      No
                      <InfoTooltip
                        label="What the NO price means"
                        text="What it costs to buy a NO share — always 100¢ minus the YES price."
                      />
                    </span>
                    <span>
                      Volume
                      <InfoTooltip label="What volume means" text="Total value traded on this market so far." />
                    </span>
                    <span>Closes In</span>
                  </div>

                  {visibleOpenMarkets.map((market) => (
                    <article
                      className="open-market-row"
                      role="row"
                      key={market.id}
                    >
                      <div className="open-market-event" role="cell">
                        <span
                          className={`sport-tag ${SPORT_META[market.sport].className}`}
                        >
                          {market.sport}
                        </span>
                        <span className="open-market-teams">
                          {market.teamA} vs {market.teamB}
                        </span>
                      </div>
                      <Link to={`/markets/${market.id}`} role="cell" className="open-market-question">
                        {market.question}
                      </Link>
                      <div
                        role="cell"
                        className="open-market-outcome open-market-outcome--yes"
                      >
                        {market.yesPrice}
                      </div>
                      <div
                        role="cell"
                        className="open-market-outcome open-market-outcome--no"
                      >
                        {market.noPrice}
                      </div>
                      <div role="cell" className="open-market-volume">
                        {market.volume}
                      </div>
                      <div role="cell" className="open-market-closes">
                        {market.closesIn}
                      </div>
                    </article>
                  ))}

                  {visibleOpenMarkets.length === 0 && (
                    <p className="open-markets-empty">
                      No open markets for this sport right now.
                    </p>
                  )}
                </div>

                <Link to="/markets" className="open-markets-explore-link">
                  Explore all open markets
                  <FiArrowRight />
                </Link>
              </section>

              <section
                className="market-panel closed-markets-panel"
                aria-labelledby="closed-markets-heading"
              >
                <div className="market-panel-heading">
                  <h2 id="closed-markets-heading">Closed Markets</h2>
                  <Link to="/markets" className="market-view-link">
                    View all markets
                  </Link>
                </div>

                <div
                  className="open-markets-table"
                  role="table"
                  aria-label="Closed market list"
                >
                  <div
                    className="open-market-row closed-market-labels open-market-labels"
                    role="row"
                  >
                    <span>Event</span>
                    <span>Market Question</span>
                    <span>Result</span>
                    <span>Volume</span>
                    <span>Closed</span>
                  </div>

                  {closedMarkets.map((market) => (
                    <article
                      className="open-market-row closed-market-row"
                      role="row"
                      key={market.id}
                    >
                      <div className="open-market-event" role="cell">
                        <span
                          className={`sport-tag ${SPORT_META[market.sport].className}`}
                        >
                          {market.sport}
                        </span>
                        <span className="open-market-teams">
                          {market.teamA} vs {market.teamB}
                        </span>
                      </div>
                      <Link to={`/markets/${market.id}`} role="cell" className="open-market-question">
                        {market.question}
                      </Link>
                      <div
                        role="cell"
                        className={`closed-market-result closed-market-result--${market.result.toLowerCase()}`}
                      >
                        {market.result}
                      </div>
                      <div role="cell" className="open-market-volume">
                        {market.volume}
                      </div>
                      <div role="cell" className="open-market-closes">
                        {market.closedAgo}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="markets-aside">
              <section
                className="market-panel trending-panel"
                aria-labelledby="trending-heading"
              >
                <div className="market-panel-heading">
                  <h2 id="trending-heading">
                    <FiZap /> Trending Markets
                  </h2>
                  <Link to="/markets" className="market-view-link">
                    View all
                  </Link>
                </div>

                <div className="trending-list">
                  {trendingMarkets.length === 0 && (
                    <p className="starting-soon-empty">No trending markets right now.</p>
                  )}
                  {trendingMarkets.map((market) => (
                    <div
                      className="trending-item"
                      key={`${market.teamA}-${market.teamB}`}
                    >
                      <span
                        className={`trending-icon ${SPORT_META[market.sport].className}`}
                      >
                        <SportIcon sport={market.sport} />
                      </span>
                      <div className="trending-copy">
                        <b>
                          {market.teamA} vs {market.teamB}
                        </b>
                        <span>{market.question}</span>
                      </div>
                      <span className="trending-count">
                        <FiZap /> {market.fireCount}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="market-panel starting-soon-panel"
                aria-labelledby="starting-soon-heading"
              >
                <div className="market-panel-heading">
                  <h2 id="starting-soon-heading">
                    <FiClock /> Starting Soon
                  </h2>
                  <Link to="/markets" className="market-view-link">
                    View all
                  </Link>
                </div>

                <div className="starting-soon-list">
                  {startingSoon.length === 0 && (
                    <p className="starting-soon-empty">No fixtures starting soon.</p>
                  )}
                  {startingSoon.map((fixture) => {
                    const match = `${fixture.teamA} vs ${fixture.teamB}`;
                    return (
                      <article className="starting-soon-item" key={match}>
                        <span
                          className={`starting-soon-icon ${SPORT_META[fixture.sport].className}`}
                        >
                          <SportIcon sport={fixture.sport} />
                        </span>
                        <div className="starting-soon-copy">
                          <span className="starting-soon-sport">
                            {fixture.sport}
                          </span>
                          <h3>{match}</h3>
                          <p>{fixture.league}</p>
                        </div>
                        <div className="starting-soon-meta">
                          <span className="starting-soon-time">
                            Starts in {fixture.startsIn}
                          </span>
                          <button
                            type="button"
                            aria-label={`Notify me about ${match}`}
                            aria-pressed={savedFixtures.includes(match)}
                            className={
                              savedFixtures.includes(match) ? "saved" : ""
                            }
                            onClick={() => toggleSaved(match)}
                          >
                            <FiBell />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <Link to="/markets" className="starting-soon-view-full">
                  View full calendar
                  <FiArrowRight />
                </Link>
              </section>
            </aside>
          </section>

          <section
            className="how-markets"
            id="how-markets-work"
            aria-labelledby="how-markets-heading"
          >
            <div className="how-markets-intro">
              <p>How Markets Work</p>
              <h2 id="how-markets-heading">
                Simple steps. Real markets. Real rewards.
              </h2>
            </div>

            <div className="how-market-steps">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <article key={step.title}>
                  <span className={`how-market-step-icon ${step.accent}`}>
                    <step.icon />
                  </span>
                  <b>{index + 1}</b>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>

            <div className="market-chart-promo">
              <p>Markets move with the game.</p>
              <span>The more you follow, the smarter you trade.</span>
              <FiBarChart2 aria-hidden="true" />
            </div>
          </section>

          <section
            className="responsible-section"
            aria-labelledby="responsible-heading"
          >
            <div className="responsible-main">
              <div className="responsible-heading">
                <FiShield aria-hidden="true" />
                <div>
                  <h2 id="responsible-heading">Responsible Play</h2>
                  <p>
                    We promote safe, responsible and informed participation.
                  </p>
                </div>
              </div>

              <div className="responsible-list">
                <article>
                  <FiUsers />
                  <p>
                    Play for fun,
                    <br />
                    not for money.
                  </p>
                </article>
                <article>
                  <FiShield />
                  <p>
                    Set limits and
                    <br />
                    stick to them.
                  </p>
                </article>
                <article>
                  <b>18+</b>
                  <p>
                    18+ only.
                    <br />
                    Play responsibly.
                  </p>
                </article>
                <article>
                  <FiAlertCircle />
                  <p>
                    Trading involves risk.
                    <br />
                    Prices can go up or down. 18+ only.
                  </p>
                </article>
              </div>
            </div>

            <Link to="/help" className="support-card">
              <FiHelpCircle aria-hidden="true" />
              <div>
                <h3>Need support?</h3>
                <p>Visit our Help Centre for tools and resources.</p>
                <span className="support-card-link">Learn more</span>
              </div>
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Markets;
