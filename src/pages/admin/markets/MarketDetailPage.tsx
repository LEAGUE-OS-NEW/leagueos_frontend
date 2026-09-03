import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiActivity, FiArrowLeft, FiShield } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  cancelMarket,
  fetchMarket,
  fetchOrderBook,
  publishMarket,
  reopenMarket,
  suspendMarket,
  updateOutcomes,
  type Market,
  type MarketStatus,
  type OrderBook,
} from '../../../services/marketAdminService';
import { payoutPill } from '../../../utils/payoutStatus.ts';
import './MarketDetailPage.css';

type Tab = 'Overview' | 'Outcomes' | 'Contracts' | 'Trading' | 'Audit Log';
const TABS: Tab[] = ['Overview', 'Outcomes', 'Contracts', 'Trading', 'Audit Log'];

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

function statusPillClass(status: MarketStatus): string {
  switch (status) {
    case 'Live':
      return 'mdp-status-pill mdp-status-pill--live';
    case 'Upcoming':
      return 'mdp-status-pill mdp-status-pill--upcoming';
    case 'Draft':
      return 'mdp-status-pill mdp-status-pill--draft';
    case 'Resolved':
      return 'mdp-status-pill mdp-status-pill--resolved';
    case 'Suspended':
      return 'mdp-status-pill mdp-status-pill--suspended';
    default:
      return 'mdp-status-pill mdp-status-pill--cancelled';
  }
}

function CancelModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="mdp-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="mdp-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Cancel this market?</h3>
        <p>Trading stops immediately and no payouts are made. This can't be undone.</p>
        <label className="mdp-field-label" htmlFor="mdp-cancel-reason">
          Reason
        </label>
        <textarea id="mdp-cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="mdp-modal__footer">
          <button type="button" className="mdp-btn mdp-btn--ghost" onClick={onCancel}>
            Keep Market
          </button>
          <button type="button" className="mdp-btn mdp-btn--danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Cancel Market
          </button>
        </div>
      </div>
    </div>
  );
}

function SuspendModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="mdp-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="mdp-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Suspend this market?</h3>
        <p>Trading pauses immediately. The market can be reopened later — nothing is finalized.</p>
        <label className="mdp-field-label" htmlFor="mdp-suspend-reason">
          Reason
        </label>
        <textarea id="mdp-suspend-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="mdp-modal__footer">
          <button type="button" className="mdp-btn mdp-btn--ghost" onClick={onCancel}>
            Keep Trading Open
          </button>
          <button type="button" className="mdp-btn mdp-btn--danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Suspend Market
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();

  const [market, setMarket] = useState<Market | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<{ kind: 'published' } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [yesProbability, setYesProbability] = useState(50);
  const [yesLabel, setYesLabel] = useState('Yes');
  const [yesDescription, setYesDescription] = useState('');
  const [noLabel, setNoLabel] = useState('No');
  const [noDescription, setNoDescription] = useState('');

  const applyMarket = (result: Market) => {
    setMarket(result);
    const yes = result.outcomes.find((outcome) => outcome.id === 'YES');
    const no = result.outcomes.find((outcome) => outcome.id === 'NO');
    setYesProbability(yes?.probabilityPct ?? 50);
    setYesLabel(yes?.label ?? 'Yes');
    setYesDescription(yes?.description ?? '');
    setNoLabel(no?.label ?? 'No');
    setNoDescription(no?.description ?? '');
  };

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    fetchMarket(marketId)
      .then((marketResult) => {
        if (!cancelled) applyMarket(marketResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this market. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    // A draft market has no outcomes/order book yet — that 404 is expected,
    // not fatal, so it's fetched independently and just leaves orderBook
    // null on failure instead of taking down the whole page.
    fetchOrderBook(marketId)
      .then((orderBookResult) => {
        if (!cancelled) setOrderBook(orderBookResult);
      })
      .catch(() => {
        /* no order book yet — leave it null */
      });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  const handlePublish = async () => {
    if (!market) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await publishMarket(market.id);
      applyMarket(updated);
      setPublishNotice({ kind: 'published' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not publish this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMarket = async (reason: string) => {
    if (!market) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await cancelMarket(market.id, reason);
      applyMarket(updated);
      setShowCancelModal(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not cancel this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspendMarket = async (reason: string) => {
    if (!market) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await suspendMarket(market.id, reason);
      applyMarket(updated);
      setShowSuspendModal(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not suspend this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopenMarket = async () => {
    if (!market) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await reopenMarket(market.id);
      applyMarket(updated);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not reopen this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOutcomes = async () => {
    if (!market) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await updateOutcomes(market.id, [
        { id: 'YES', label: yesLabel, description: yesDescription, probabilityPct: yesProbability },
        { id: 'NO', label: noLabel, description: noDescription, probabilityPct: 100 - yesProbability },
      ]);
      applyMarket(updated);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save these outcomes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mdp-loading">
          <FiActivity aria-hidden="true" className="mdp-loading__icon" />
          Loading market…
        </div>
      </AdminLayout>
    );
  }

  if (loadError || !market) {
    return (
      <AdminLayout>
        <div className="mdp-error-banner">
          <FiAlertTriangle aria-hidden="true" />
          <span>{loadError ?? 'Market not found.'}</span>
          <button type="button" className="mdp-btn mdp-btn--outline mdp-btn--sm" onClick={() => navigate('/dashboard/admin/markets')}>
            Back to Markets
          </button>
        </div>
      </AdminLayout>
    );
  }

  const canPublish = market.status === 'Draft';
  const canCancel = !['Closed', 'Resolved', 'Cancelled', 'Voided'].includes(market.status);
  const canSuspend = market.status === 'Live' || market.status === 'Upcoming';
  const canReopen = market.status === 'Suspended';
  const yesOutcome = market.outcomes.find((outcome) => outcome.id === 'YES')!;
  const noOutcome = market.outcomes.find((outcome) => outcome.id === 'NO')!;
  const payout = payoutPill(market.status, market.isSettled, market.isRefunded);

  return (
    <AdminLayout>
      <div className="mdp-root">
        <button type="button" className="mdp-back" onClick={() => navigate('/dashboard/admin/markets')}>
          <FiArrowLeft /> Back to Markets
        </button>

        <div className="mdp-head">
          <div>
            <span className={statusPillClass(market.status)}>{market.status}</span>
            {payout && (
              <span className={`mdp-status-pill mdp-status-pill--${payout.variant}`}>
                {payout.label}
              </span>
            )}
            <h1>{market.eventLabel}</h1>
            <p>{market.question}</p>
          </div>
          <div className="mdp-head__actions">
            {canPublish && (
              <button type="button" className="mdp-btn mdp-btn--gradient" disabled={isSaving} onClick={handlePublish}>
                Publish Market
              </button>
            )}
            {canReopen && (
              <button type="button" className="mdp-btn mdp-btn--gradient" disabled={isSaving} onClick={handleReopenMarket}>
                Reopen Market
              </button>
            )}
            {canSuspend && (
              <button type="button" className="mdp-btn mdp-btn--outline" disabled={isSaving} onClick={() => setShowSuspendModal(true)}>
                Suspend Market
              </button>
            )}
            {canCancel && (
              <button type="button" className="mdp-btn mdp-btn--danger" disabled={isSaving} onClick={() => setShowCancelModal(true)}>
                Cancel Market
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mdp-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {publishNotice && (
          <div className="mdp-notice mdp-notice--published">
            <FiShield aria-hidden="true" />
            <span>Published — this market is now visible to fans.</span>
          </div>
        )}

        <div className="mdp-tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={`mdp-tab${activeTab === tab ? ' is-active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <div className="mdp-panel">
            <div className="mdp-kv-grid">
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Category</span>
                <span className="mdp-kv-item__value">{market.category}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Competition</span>
                <span className="mdp-kv-item__value">{market.competition}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Venue</span>
                <span className="mdp-kv-item__value">{market.venue}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Kickoff</span>
                <span className="mdp-kv-item__value">{formatDateTime(market.kickoff)}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Opens</span>
                <span className="mdp-kv-item__value">{formatDateTime(market.parameters.opensAt)}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Closes</span>
                <span className="mdp-kv-item__value">{formatDateTime(market.parameters.closesAt)}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Created by</span>
                <span className="mdp-kv-item__value">{market.createdBy}</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Fee</span>
                <span className="mdp-kv-item__value">{market.parameters.feePct}%</span>
              </div>
              <div className="mdp-kv-item">
                <span className="mdp-kv-item__key">Full winning share value</span>
                <span className="mdp-kv-item__value">{formatUgx(market.faceValueUgx)}</span>
              </div>
            </div>
            {market.description && <p className="mdp-description">{market.description}</p>}
            {market.liquidity && <section className="mdp-outcome-card" aria-label="Liquidity summary">
              <h3>Opening Liquidity</h3>
              <p>Liquidity status: {market.liquidity.status}</p>
              <p>Liquidity source: {market.liquidity.providerDisplayName ?? market.liquidity.source ?? 'Not configured'}</p>
              <p>Configured opening liquidity: {formatUgx(market.liquidity.configuredOpeningLiquidityUgx)}</p>
              <p>Locked collateral: {formatUgx(market.liquidity.lockedCollateralUgx)}</p>
              <p>Issued quantity/share equivalent: {market.liquidity.issuedCompleteSets.toLocaleString()} complete sets</p>
              <p>Opening spread: {(market.liquidity.openingSpreadBps / 100).toFixed(2)}%</p>
              <p>Opening YES ask: {market.liquidity.openingYesAsk === null ? 'Not configured' : formatUgx(market.liquidity.openingYesAsk)}</p>
              <p>Opening NO ask: {market.liquidity.openingNoAsk === null ? 'Not configured' : formatUgx(market.liquidity.openingNoAsk)}</p>
            </section>}
            {market.tags.length > 0 && (
              <div className="mdp-tag-row">
                {market.tags.map((tag) => (
                  <span className="mdp-tag" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Outcomes' && (
          <div className="mdp-panel">
            <div className="mdp-outcomes-grid">
              <div className="mdp-outcome-card mdp-outcome-card--yes">
                <span className="mdp-outcome-card__badge">YES</span>
                {canPublish ? (
                  <>
                    <label className="mdp-field">
                      <span>Label</span>
                      <input type="text" value={yesLabel} onChange={(event) => setYesLabel(event.target.value)} />
                    </label>
                    <label className="mdp-field">
                      <span>Description</span>
                      <textarea rows={2} value={yesDescription} onChange={(event) => setYesDescription(event.target.value)} />
                    </label>
                    <p>Opening probability: {yesOutcome.openingProbabilityPct ?? 'Not configured'}%</p>
                  </>
                ) : (
                  <>
                    <p className="mdp-outcome-card__label">{yesOutcome.label}</p>
                    {yesOutcome.description && <p className="mdp-outcome-card__desc">{yesOutcome.description}</p>}
                  </>
                )}
                <p>Opening price: {yesOutcome.openingPrice === null ? 'Not configured' : formatUgx(yesOutcome.openingPrice)}</p>
                <p className="mdp-outcome-card__price">Current market price: {yesOutcome.price === null ? 'Price unavailable' : formatUgx(yesOutcome.price)}</p>
                <p>Best bid: {yesOutcome.bestBid === null ? 'None' : formatUgx(yesOutcome.bestBid)} · Best ask: {yesOutcome.bestAsk === null ? 'None' : formatUgx(yesOutcome.bestAsk)} · Last trade: {yesOutcome.lastTrade === null ? 'None' : formatUgx(yesOutcome.lastTrade)}</p>
              </div>

              <div className="mdp-outcome-card mdp-outcome-card--no">
                <span className="mdp-outcome-card__badge">NO</span>
                {canPublish ? (
                  <>
                    <label className="mdp-field">
                      <span>Label</span>
                      <input type="text" value={noLabel} onChange={(event) => setNoLabel(event.target.value)} />
                    </label>
                    <label className="mdp-field">
                      <span>Description</span>
                      <textarea rows={2} value={noDescription} onChange={(event) => setNoDescription(event.target.value)} />
                    </label>
                    <p>Opening probability: {noOutcome.openingProbabilityPct ?? 'Not configured'}%</p>
                  </>
                ) : (
                  <>
                    <p className="mdp-outcome-card__label">{noOutcome.label}</p>
                    {noOutcome.description && <p className="mdp-outcome-card__desc">{noOutcome.description}</p>}
                  </>
                )}
                <p>Opening price: {noOutcome.openingPrice === null ? 'Not configured' : formatUgx(noOutcome.openingPrice)}</p>
                <p className="mdp-outcome-card__price">Current market price: {noOutcome.price === null ? 'Price unavailable' : formatUgx(noOutcome.price)}</p>
                <p>Best bid: {noOutcome.bestBid === null ? 'None' : formatUgx(noOutcome.bestBid)} · Best ask: {noOutcome.bestAsk === null ? 'None' : formatUgx(noOutcome.bestAsk)} · Last trade: {noOutcome.lastTrade === null ? 'None' : formatUgx(noOutcome.lastTrade)}</p>
              </div>
            </div>
            {canPublish && (
              <button type="button" className="mdp-btn mdp-btn--gradient" disabled={isSaving} onClick={handleSaveOutcomes}>
                {isSaving ? 'Saving…' : 'Save Outcomes'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'Contracts' && (
          <div className="mdp-panel">
            <p className="mdp-table__empty">Admin-wide contracts are unavailable because the backend does not expose a whole-market contracts endpoint.</p>
          </div>
        )}

        {activeTab === 'Trading' && (
          <div className="mdp-panel">
            {orderBook && (
              <>
                <div className="mdp-orderbook-summary">
                  <div>
                    <span className="mdp-kv-item__key">Last Price</span>
                    <p className="mdp-orderbook-summary__value">{orderBook.lastPrice === null ? 'Not traded yet' : formatUgx(orderBook.lastPrice)}</p>
                  </div>
                  <div>
                    <span className="mdp-kv-item__key">Spread</span>
                    <p className="mdp-orderbook-summary__value">{orderBook.spread === null ? '—' : formatUgx(orderBook.spread)}</p>
                  </div>
                </div>
                <div className="mdp-orderbook-grid">
                  <div>
                    <h4 className="mdp-orderbook-col__title mdp-orderbook-col__title--bid">Bids</h4>
                    {orderBook.bids.map((level, index) => (
                      <div className="mdp-orderbook-row mdp-orderbook-row--bid" key={`bid-${index}`}>
                        <span>{formatUgx(level.price)}</span>
                        <span>{level.shares.toLocaleString()} shares</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="mdp-orderbook-col__title mdp-orderbook-col__title--ask">Asks</h4>
                    {orderBook.asks.map((level, index) => (
                      <div className="mdp-orderbook-row mdp-orderbook-row--ask" key={`ask-${index}`}>
                        <span>{formatUgx(level.price)}</span>
                        <span>{level.shares.toLocaleString()} shares</span>
                      </div>
                    ))}
                  </div>
                </div>
                {orderBook.bids.length === 0 && orderBook.asks.length === 0 && (
                  <p>No order-book data is available.</p>
                )}
              </>
            )}

            <h4 className="mdp-panel__subheading">Recent Trades</h4>
            <div className="mdp-table-scroll">
              <table className="mdp-table">
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {orderBook?.recentTrades.slice(0, 8).map((trade) => (
                    <tr key={trade.id}>
                      <td>{orderBook.outcomeId}</td>
                      <td>{formatUgx(trade.price)}</td>
                      <td>{trade.shares.toLocaleString()} shares</td>
                      <td>{formatDateTime(trade.executedAt)}</td>
                    </tr>
                  ))}
                  {!orderBook?.recentTrades.length && (
                    <tr>
                      <td colSpan={4} className="mdp-table__empty">
                        No trades yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Audit Log' && (
          <div className="mdp-panel">
            <ul className="mdp-timeline">
              {market.auditHistory.map((event) => (
                <li className="mdp-timeline__item" key={event.id}>
                  <span className="mdp-timeline__dot" />
                  <div className="mdp-timeline__content">
                    <div className="mdp-timeline__row">
                      <span className="mdp-timeline__action">{event.action}</span>
                      <span className="mdp-timeline__time">{formatDateTime(event.timestamp)}</span>
                    </div>
                    <div className="mdp-timeline__meta">{event.adminUser}</div>
                    {event.note && <div className="mdp-timeline__note">{event.note}</div>}
                  </div>
                </li>
              ))}
              {market.auditHistory.length === 0 && <li className="mdp-table__empty">No activity recorded yet.</li>}
            </ul>
          </div>
        )}
      </div>

      {showCancelModal && <CancelModal onCancel={() => setShowCancelModal(false)} onConfirm={handleCancelMarket} />}
      {showSuspendModal && <SuspendModal onCancel={() => setShowSuspendModal(false)} onConfirm={handleSuspendMarket} />}
    </AdminLayout>
  );
}

export default MarketDetailPage;
