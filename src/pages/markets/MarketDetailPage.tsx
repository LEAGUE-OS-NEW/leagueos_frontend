import {
  useEffect,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
} from 'react-icons/fi';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';

import {
  fetchMarket as fetchPublicMarket,
  fetchFanPositions,
  fetchMarketOrderBook,
  placeOrder,
  type Market,
  type MarketOrderBook,
  type OutcomeId,
  type Position,
} from '../../services/fanMarketsServices';

import {
  backendQuantityToShares,
  normalizedPriceToUgxSharePrice,
} from '../../utils/marketPricing.ts';

import {
  getToken,
} from '../../utils/tokenManager.ts';

import {
  useMarketEligibility,
} from '../../hooks/useMarketEligibility';

import {
  useFanWallet,
} from '../../hooks/useFanWallet';

import './MarketDetailPage.css';


const QUICK_TRADE_AMOUNTS = [
  10_000,
  25_000,
  50_000,
  100_000,
];


function formatDateTime(
  iso: string,
): string {
  return new Date(
    iso,
  ).toLocaleString(
    undefined,
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}


function formatUgx(
  amount: number,
): string {
  return `UGX ${Math.round(
    amount,
  ).toLocaleString('en-US')}`;
}


function getInitialOutcome(
  searchParams: URLSearchParams,
): OutcomeId {
  return searchParams.get(
    'outcome',
  ) === 'NO'
    ? 'NO'
    : 'YES';
}


function outcomeDisplayPrice(
  outcome: Market['outcomes'][number],
): string {
  const price =
    outcome.bestAsk ??
    outcome.price ??
    outcome.openingReference ??
    null;

  if (price === null) {
    return 'Awaiting liquidity';
  }

  return `${formatUgx(
    price,
  )}/share`;
}


function MarketDetailPage() {
  const {
    marketId,
  } = useParams<{
    marketId: string;
  }>();

  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const isAuthenticated =
    Boolean(
      getToken(),
    );

  const {
    isEligible:
      isIdentityVerified,
    isLoading:
      isEligibilityLoading,
    error:
      eligibilityError,
    refresh:
      refreshEligibility,
  } = useMarketEligibility();

  const {
    wallet,
    isLoading:
      isWalletLoading,
    refresh:
      refreshWallet,
  } = useFanWallet(
    'UGX',
    isIdentityVerified,
  );

  const [
    market,
    setMarket,
  ] = useState<Market | null>(
    null,
  );

  const [
    orderBook,
    setOrderBook,
  ] =
    useState<MarketOrderBook | null>(
      null,
    );

  const [
    myPositions,
    setMyPositions,
  ] = useState<Position[]>(
    [],
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedOutcome,
    setSelectedOutcome,
  ] =
    useState<OutcomeId>(
      () =>
        getInitialOutcome(
          searchParams,
        ),
    );

  const [
    amount,
    setAmount,
  ] = useState(
    '',
  );

  const [
    orderError,
    setOrderError,
  ] = useState<string | null>(
    null,
  );

  const [
    orderSuccess,
    setOrderSuccess,
  ] = useState<string | null>(
    null,
  );


  useEffect(() => {
    if (!marketId) {
      return;
    }

    let cancelled =
      false;

    fetchPublicMarket(
      marketId,
    )
      .then(
        (
          marketResult,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setMarket(
            marketResult,
          );

          setLoadError(
            null,
          );
        },
      )
      .catch(() => {
        if (
          cancelled
        ) {
          return;
        }

        setLoadError(
          'Could not load this market. Please try again.',
        );
      })
      .finally(() => {
        if (
          !cancelled
        ) {
          setIsLoading(
            false,
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, [
    marketId,
  ]);


  useEffect(() => {
    if (
      !marketId ||
      !isIdentityVerified
    ) {
      return;
    }

    let cancelled =
      false;

    fetchFanPositions()
      .then(
        (
          positions,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setMyPositions(
            positions.filter(
              (
                position,
              ) =>
                position
                  .market
                  .id ===
                marketId,
            ),
          );
        },
      )
      .catch(() => {
        if (
          !cancelled
        ) {
          setMyPositions(
            [],
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, [
    marketId,
    isIdentityVerified,
  ]);


  useEffect(() => {
    if (
      !market
    ) {
      return;
    }

    const outcome =
      market.outcomes.find(
        (
          item,
        ) =>
          item.id ===
          selectedOutcome,
      );

    if (
      !outcome
        ?.backendOutcomeId
    ) {
      return;
    }

    let cancelled =
      false;

    fetchMarketOrderBook(
      market.id,
      outcome
        .backendOutcomeId,
    )
      .then(
        (
          book,
        ) => {
          if (
            !cancelled
          ) {
            setOrderBook(
              book,
            );
          }
        },
      )
      .catch(() => {
        if (
          !cancelled
        ) {
          setOrderBook(
            null,
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, [
    market,
    selectedOutcome,
  ]);


  if (
    isLoading
  ) {
    return (
      <div className="pmd-page">
        <Navbar />

        <main className="pmd-main">
          <p className="pmd-loading">
            Loading market…
          </p>
        </main>

        <Footer />
      </div>
    );
  }


  if (
    loadError ||
    !market ||
    market.status ===
      'Draft'
  ) {
    return (
      <div className="pmd-page">
        <Navbar />

        <main className="pmd-main">
          <div className="pmd-error-banner">
            <FiAlertTriangle
              aria-hidden="true"
            />

            <span>
              {loadError ??
                'This market is not available.'}
            </span>
          </div>

          <Link
            to="/markets"
            className="pmd-back"
          >
            <FiArrowLeft />

            Back to Markets
          </Link>
        </main>

        <Footer />
      </div>
    );
  }


  const yesOutcome =
    market.outcomes.find(
      (
        outcome,
      ) =>
        outcome.id ===
        'YES',
    );

  const noOutcome =
    market.outcomes.find(
      (
        outcome,
      ) =>
        outcome.id ===
        'NO',
    );


  if (
    !yesOutcome ||
    !noOutcome
  ) {
    return (
      <div className="pmd-page">
        <Navbar />

        <main className="pmd-main">
          <div className="pmd-error-banner">
            <FiAlertTriangle
              aria-hidden="true"
            />

            <span>
              This market does not have
              a complete YES/NO outcome
              configuration.
            </span>
          </div>
        </main>

        <Footer />
      </div>
    );
  }


  const selected =
    selectedOutcome ===
    'YES'
      ? yesOutcome
      : noOutcome;

  const selectedBook =
    orderBook
      ?.outcome
      .id ===
    selected
      .backendOutcomeId
      ? orderBook
      : null;

  const bestAsk =
    selectedBook
      ?.best_ask ===
    null ||
    selectedBook
      ?.best_ask ===
    undefined
      ? null
      : Number(
          selectedBook
            .best_ask,
        );

  const selectedPrice =
    bestAsk === null
      ? null
      : normalizedPriceToUgxSharePrice(
          bestAsk,
          market
            .faceValueUgx,
        );

  const stake =
    Number(
      amount,
    );

  const estimatedShares =
    selectedPrice &&
    stake > 0
      ? stake /
        selectedPrice
      : 0;

  const potentialPayout =
    estimatedShares *
    market.faceValueUgx;

  const potentialProfit =
    potentialPayout -
    stake;

  const isTradingOpen =
    market.status ===
    'Live';

  const isResolved =
    market.status ===
    'Resolved';

  const isClosed =
    market.status ===
    'Closed';

  const isSuspended =
    market.status ===
    'Suspended';

  const isUpcoming =
    market.status ===
    'Upcoming';

  const isCancelled =
    market.status ===
      'Cancelled' ||
    market.status ===
      'Voided';

  let walletLabel =
    'UGX wallet unavailable';

  if (
    isWalletLoading
  ) {
    walletLabel =
      'Loading wallet…';
  } else if (
    wallet
  ) {
    walletLabel =
      `${formatUgx(
        wallet
          .availableBalance,
      )} available`;
  }


  const handlePlaceOrder =
    async () => {
      setOrderError(
        null,
      );

      setOrderSuccess(
        null,
      );

      if (
        !isIdentityVerified
      ) {
        setOrderError(
          'Your account is not currently eligible to trade.',
        );

        return;
      }

      if (
        !stake ||
        stake <= 0
      ) {
        setOrderError(
          'Enter an amount to trade.',
        );

        return;
      }

      if (
        stake <
        market
          .parameters
          .minTradeUgx
      ) {
        setOrderError(
          `Minimum trade is ${formatUgx(
            market
              .parameters
              .minTradeUgx,
          )}.`,
        );

        return;
      }

      if (
        stake >
        market
          .parameters
          .maxTradeUgx
      ) {
        setOrderError(
          `Maximum trade is ${formatUgx(
            market
              .parameters
              .maxTradeUgx,
          )}.`,
        );

        return;
      }

      if (
        wallet &&
        stake >
          wallet
            .availableBalance
      ) {
        setOrderError(
          'Your available UGX wallet balance is too low for this trade.',
        );

        return;
      }

      if (
        bestAsk ===
        null
      ) {
        setOrderError(
          'No sell liquidity is currently available for this outcome.',
        );

        return;
      }

      try {
        const result =
          await placeOrder({
            marketId:
              market.id,
            outcomeId:
              selectedOutcome,
            quantityUgx:
              stake,
            limitPrice:
              bestAsk,
          });

        setOrderSuccess(
          result.status ===
            'FILLED'
            ? 'Order matched successfully. Your position and wallet have been updated.'
            : 'Order submitted successfully. Track it in your Markets activity.',
        );

        setAmount(
          '',
        );

        void refreshWallet();

        void fetchFanPositions()
          .then(
            (
              positions,
            ) => {
              setMyPositions(
                positions.filter(
                  (
                    position,
                  ) =>
                    position
                      .market
                      .id ===
                    market.id,
                ),
              );
            },
          );

        void fetchMarketOrderBook(
          market.id,
          selected
            .backendOutcomeId,
        )
          .then(
            (
              nextBook,
            ) => {
              setOrderBook(
                nextBook,
              );
            },
          );
      } catch (
        error
      ) {
        setOrderError(
          error instanceof
          Error
            ? error.message
            : 'Could not place this order.',
        );
      }
    };


  return (
    <div className="pmd-page">
      <Navbar />

      <main className="pmd-main">
        <button
          type="button"
          className="pmd-back"
          onClick={() =>
            navigate(
              '/markets',
            )
          }
        >
          <FiArrowLeft />

          Back to Markets
        </button>


        <section className="pmd-head">
          <span
            className={
              `pmd-status-pill ` +
              `pmd-status-pill--${market.status.toLowerCase()}`
            }
          >
            {market.status}
          </span>

          <h1>
            {market.eventLabel}
          </h1>

          <p className="pmd-question">
            {market.question}
          </p>

          <p className="pmd-meta">
            {market.category}
            {' · '}
            {market.competition}
            {' · '}
            {market.venue}
            {' · '}
            Kickoff{' '}
            {formatDateTime(
              market.kickoff,
            )}
          </p>
        </section>


        <section className="pmd-outcomes">
          <button
            type="button"
            className={
              `pmd-outcome-card pmd-outcome-card--yes${
                selectedOutcome ===
                'YES'
                  ? ' is-selected'
                  : ''
              }`
            }
            onClick={() =>
              setSelectedOutcome(
                'YES',
              )
            }
          >
            <span className="pmd-outcome-card__eyebrow">
              YES
            </span>

            <span className="pmd-outcome-card__label">
              {yesOutcome.label}
            </span>

            <span className="pmd-outcome-card__price">
              {outcomeDisplayPrice(
                yesOutcome,
              )}
            </span>

            <span className="pmd-outcome-card__pct">
              Select to trade YES
            </span>
          </button>


          <button
            type="button"
            className={
              `pmd-outcome-card pmd-outcome-card--no${
                selectedOutcome ===
                'NO'
                  ? ' is-selected'
                  : ''
              }`
            }
            onClick={() =>
              setSelectedOutcome(
                'NO',
              )
            }
          >
            <span className="pmd-outcome-card__eyebrow">
              NO
            </span>

            <span className="pmd-outcome-card__label">
              {noOutcome.label}
            </span>

            <span className="pmd-outcome-card__price">
              {outcomeDisplayPrice(
                noOutcome,
              )}
            </span>

            <span className="pmd-outcome-card__pct">
              Select to trade NO
            </span>
          </button>
        </section>


        <div className="pmd-content-grid">
          <div className="pmd-market-column">
            {market.description && (
              <p className="pmd-description">
                {market.description}
              </p>
            )}


            {isResolved && (
              <div className="pmd-notice pmd-notice--resolved">
                <FiCheckCircle
                  aria-hidden="true"
                />

                <span>
                  Resolved —{' '}
                  {market.outcomes.find(
                    (
                      outcome,
                    ) =>
                      outcome.id ===
                      market
                        .winningOutcomeId,
                  )?.label ??
                    'Outcome recorded'}{' '}
                  won.
                </span>
              </div>
            )}


            {isClosed && (
              <div className="pmd-notice pmd-notice--upcoming">
                <span>
                  Trading is closed.
                  This market is
                  awaiting result
                  verification.
                </span>
              </div>
            )}


            {isSuspended && (
              <div className="pmd-notice pmd-notice--upcoming">
                <span>
                  Trading is temporarily
                  suspended on this
                  market.
                </span>
              </div>
            )}


            {isUpcoming && (
              <div className="pmd-notice pmd-notice--upcoming">
                <span>
                  Trading opens{' '}
                  {formatDateTime(
                    market
                      .parameters
                      .opensAt,
                  )}
                  .
                </span>
              </div>
            )}


            {isCancelled && (
              <div className="pmd-notice pmd-notice--cancelled">
                <FiAlertTriangle
                  aria-hidden="true"
                />

                <span>
                  This market was voided
                  or cancelled. Trading
                  is disabled.
                </span>
              </div>
            )}


            {isIdentityVerified &&
              myPositions.length >
                0 && (
                <section className="pmd-panel">
                  <div className="pmd-panel-heading">
                    <div>
                      <h2>
                        Your position
                      </h2>

                      <p>
                        Current holdings
                        in this market.
                      </p>
                    </div>
                  </div>

                  {myPositions.map(
                    (
                      position,
                    ) => (
                      <div
                        className="pmd-position-row"
                        key={
                          position
                            .contract
                            .id
                        }
                      >
                        <span>
                          {
                            position
                              .contract
                              .outcomeId
                          }
                          {' · '}
                          {position
                            .portfolio
                            .quantity
                            .toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits:
                                  2,
                              },
                            )}{' '}
                          shares
                        </span>

                        <span>
                          Avg{' '}
                          {formatUgx(
                            position
                              .portfolio
                              .averageEntryPrice,
                          )}
                          /share
                        </span>
                      </div>
                    ),
                  )}

                  <Link
                    to="/positions"
                    className="pmd-positions-link"
                  >
                    Track all positions
                  </Link>
                </section>
              )}


            {isTradingOpen && (
              <section className="pmd-panel">
                <div className="pmd-panel-heading">
                  <div>
                    <h2>
                      {selected.label}{' '}
                      order book
                    </h2>

                    <p>
                      Live executable
                      liquidity for the
                      selected outcome.
                    </p>
                  </div>
                </div>

                {!selectedBook && (
                  <p className="pmd-muted">
                    Loading available
                    liquidity…
                  </p>
                )}

                {selectedBook &&
                  selectedBook
                    .bids
                    .length ===
                    0 &&
                  selectedBook
                    .asks
                    .length ===
                    0 && (
                    <p className="pmd-muted">
                      No orders are
                      currently available.
                    </p>
                  )}

                {selectedBook && (
                  <div className="pmd-orderbook-grid">
                    <div>
                      <h4 className="pmd-orderbook-col__title pmd-orderbook-col__title--bid">
                        Bids
                      </h4>

                      {selectedBook
                        .bids
                        .map(
                          (
                            level,
                            index,
                          ) => (
                            <div
                              className="pmd-orderbook-row pmd-orderbook-row--bid"
                              key={`bid-${index}`}
                            >
                              <span>
                                {formatUgx(
                                  normalizedPriceToUgxSharePrice(
                                    Number(
                                      level.price,
                                    ),
                                    market
                                      .faceValueUgx,
                                  ),
                                )}
                              </span>

                              <span>
                                {backendQuantityToShares(
                                  Number(
                                    level.quantity,
                                  ),
                                  market
                                    .faceValueUgx,
                                ).toLocaleString(
                                  undefined,
                                  {
                                    maximumFractionDigits:
                                      2,
                                  },
                                )}{' '}
                                shares
                              </span>
                            </div>
                          ),
                        )}
                    </div>

                    <div>
                      <h4 className="pmd-orderbook-col__title pmd-orderbook-col__title--ask">
                        Asks
                      </h4>

                      {selectedBook
                        .asks
                        .map(
                          (
                            level,
                            index,
                          ) => (
                            <div
                              className="pmd-orderbook-row pmd-orderbook-row--ask"
                              key={`ask-${index}`}
                            >
                              <span>
                                {formatUgx(
                                  normalizedPriceToUgxSharePrice(
                                    Number(
                                      level.price,
                                    ),
                                    market
                                      .faceValueUgx,
                                  ),
                                )}
                              </span>

                              <span>
                                {backendQuantityToShares(
                                  Number(
                                    level.quantity,
                                  ),
                                  market
                                    .faceValueUgx,
                                ).toLocaleString(
                                  undefined,
                                  {
                                    maximumFractionDigits:
                                      2,
                                  },
                                )}{' '}
                                shares
                              </span>
                            </div>
                          ),
                        )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>


          <aside className="pmd-trade-column">
            {isTradingOpen &&
              isEligibilityLoading && (
                <section className="pmd-panel pmd-eligibility-panel">
                  <h2>
                    Trading access
                  </h2>

                  <p className="pmd-muted">
                    Checking your Markets
                    eligibility…
                  </p>
                </section>
              )}


            {isTradingOpen &&
              !isEligibilityLoading &&
              isAuthenticated &&
              eligibilityError && (
                <section className="pmd-panel pmd-eligibility-panel">
                  <h2>
                    Trading access
                  </h2>

                  <div className="pmd-error-banner">
                    <FiAlertTriangle
                      aria-hidden="true"
                    />

                    <span>
                      We could not confirm
                      your trading
                      eligibility. Your
                      verification has not
                      been reset.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="pmd-btn pmd-btn--secondary"
                    onClick={() => {
                      void refreshEligibility();
                    }}
                  >
                    Check eligibility again
                  </button>
                </section>
              )}


            {isTradingOpen &&
              !isEligibilityLoading &&
              !isAuthenticated && (
                <section className="pmd-panel pmd-eligibility-panel">
                  <h2>
                    Trade this market
                  </h2>

                  <p className="pmd-muted">
                    Sign in to check your
                    eligibility and place
                    an order.
                  </p>

                  <Link
                    to="/login"
                    className="pmd-action-link"
                  >
                    Sign in to trade
                  </Link>
                </section>
              )}


            {isTradingOpen &&
              !isEligibilityLoading &&
              isAuthenticated &&
              !eligibilityError &&
              !isIdentityVerified && (
                <section className="pmd-panel pmd-eligibility-panel">
                  <h2>
                    Trading access
                  </h2>

                  <div className="pmd-notice pmd-notice--upcoming">
                    <span>
                      Complete identity
                      verification before
                      trading this market.
                    </span>
                  </div>

                  <Link
                    to="/fan/verify"
                    className="pmd-action-link"
                  >
                    Continue verification
                  </Link>
                </section>
              )}


            {isTradingOpen &&
              !isEligibilityLoading &&
              !eligibilityError &&
              isIdentityVerified && (
                <section className="pmd-panel pmd-trade-panel">
                  <div className="pmd-panel-heading">
                    <div>
                      <h2>
                        Trade this market
                      </h2>

                      <p>
                        Choose an outcome
                        and enter your
                        stake.
                      </p>
                    </div>

                    <div className="pmd-trader-state">
                      <span className="pmd-verified-badge">
                        <FiCheckCircle
                          aria-hidden="true"
                        />

                        Verified to trade
                      </span>

                      <span className="pmd-wallet-balance">
                        {walletLabel}
                      </span>
                    </div>
                  </div>


                  {orderError && (
                    <div className="pmd-error-banner">
                      <FiAlertTriangle
                        aria-hidden="true"
                      />

                      <span>
                        {orderError}
                      </span>
                    </div>
                  )}


                  {orderSuccess && (
                    <div className="pmd-notice pmd-notice--resolved">
                      <FiCheckCircle
                        aria-hidden="true"
                      />

                      <span>
                        {orderSuccess}
                      </span>
                    </div>
                  )}


                  <div className="pmd-outcome-picker">
                    <button
                      type="button"
                      className={
                        `pmd-outcome-choice pmd-outcome-choice--yes${
                          selectedOutcome ===
                          'YES'
                            ? ' is-selected'
                            : ''
                        }`
                      }
                      onClick={() =>
                        setSelectedOutcome(
                          'YES',
                        )
                      }
                    >
                      YES
                    </button>

                    <button
                      type="button"
                      className={
                        `pmd-outcome-choice pmd-outcome-choice--no${
                          selectedOutcome ===
                          'NO'
                            ? ' is-selected'
                            : ''
                        }`
                      }
                      onClick={() =>
                        setSelectedOutcome(
                          'NO',
                        )
                      }
                    >
                      NO
                    </button>
                  </div>


                  <div className="pmd-quote-row">
                    <span className="pmd-quote-label">
                      Best available ask
                    </span>

                    <strong className="pmd-quote-value">
                      {selectedPrice ===
                      null
                        ? 'No executable ask'
                        : `${formatUgx(
                            selectedPrice,
                          )}/share`}
                    </strong>
                  </div>


                  <div className="pmd-quick-amounts">
                    {QUICK_TRADE_AMOUNTS
                      .filter(
                        (
                          value,
                        ) =>
                          value <=
                          market
                            .parameters
                            .maxTradeUgx,
                      )
                      .map(
                        (
                          value,
                        ) => (
                          <button
                            key={
                              value
                            }
                            type="button"
                            className={
                              `pmd-quick-amount${
                                Number(
                                  amount,
                                ) ===
                                value
                                  ? ' is-active'
                                  : ''
                              }`
                            }
                            onClick={() =>
                              setAmount(
                                String(
                                  value,
                                ),
                              )
                            }
                          >
                            {formatUgx(
                              value,
                            )}
                          </button>
                        ),
                      )}
                  </div>


                  <label className="pmd-field">
                    <span>
                      Your stake (UGX)
                    </span>

                    <input
                      type="number"
                      min={
                        market
                          .parameters
                          .minTradeUgx
                      }
                      max={
                        market
                          .parameters
                          .maxTradeUgx
                      }
                      value={
                        amount
                      }
                      onChange={(
                        event,
                      ) =>
                        setAmount(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder={
                        `${market.parameters.minTradeUgx.toLocaleString()}` +
                        ` - ` +
                        `${market.parameters.maxTradeUgx.toLocaleString()}`
                      }
                    />
                  </label>


                  {estimatedShares >
                    0 && (
                    <div className="pmd-estimate">
                      <div>
                        <span>
                          Estimated shares
                        </span>

                        <strong>
                          {estimatedShares.toFixed(
                            2,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Payout if correct
                        </span>

                        <strong>
                          {formatUgx(
                            potentialPayout,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Potential profit
                        </span>

                        <strong>
                          {formatUgx(
                            potentialProfit,
                          )}
                        </strong>
                      </div>
                    </div>
                  )}


                  <button
                    type="button"
                    className="pmd-btn pmd-btn--gradient"
                    disabled={
                      bestAsk ===
                      null
                    }
                    onClick={
                      handlePlaceOrder
                    }
                  >
                    {bestAsk ===
                    null
                      ? 'No sell liquidity'
                      : `Buy ${selectedOutcome} for ${formatUgx(
                          stake ||
                            0,
                        )}`}
                  </button>


                  <p className="pmd-market-note">
                    Orders use your real
                    UGX wallet balance.
                    Markets involve risk;
                    only trade amounts you
                    intend to use.
                  </p>
                </section>
              )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}


export default MarketDetailPage;
