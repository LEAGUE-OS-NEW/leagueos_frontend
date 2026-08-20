import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiCalendar, FiCheck, FiCreditCard, FiStar, FiZap } from 'react-icons/fi';
import { GiShield } from 'react-icons/gi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import {
  cancelMyMembership,
  fetchActiveMembershipPlans,
  fetchMyMemberships,
  subscribeToMembershipPlan,
  type PlatformMembershipPlan,
  type PlatformSubscriber,
} from '../../../services/platformMembershipService';
import { useFanWallet } from '../../../hooks/useFanWallet';
import '../sections/FanDashboard.css';
import './FanMembershipsPage.css';

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function periodLabel(period: PlatformMembershipPlan['billingPeriod']): string {
  switch (period) {
    case 'ANNUAL':
      return 'per year';
    case 'QUARTERLY':
      return 'per quarter';
    case 'MONTHLY':
    default:
      return 'per month';
  }
}

function billingLabel(period: PlatformMembershipPlan['billingPeriod']): string {
  switch (period) {
    case 'ANNUAL':
      return 'Annual';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'MONTHLY':
    default:
      return 'Monthly';
  }
}

function statusLabel(status: PlatformSubscriber['status']): string {
  return status.replace('_', ' ');
}

function CurrentMembershipCard({
  subscription,
  onCancel,
  isBusy,
}: {
  subscription: PlatformSubscriber;
  onCancel: (id: string) => Promise<void>;
  isBusy: boolean;
}) {
  const isActive = subscription.status === 'ACTIVE';
  const renewalLabel = isActive ? `Renews ${formatDate(subscription.renewsAt)}` : `Ends ${formatDate(subscription.renewsAt)}`;

  return (
    <article className="fmp-current-card">
      <div className="fmp-current-icon">
        <GiShield />
      </div>
      <div className="fmp-current-main">
        <div className="fmp-current-heading">
          <div>
            <p className="fmp-current-kicker">LeagueOS Membership</p>
            <h3>{subscription.planName}</h3>
          </div>
          <span className={`fmp-status fmp-status--${subscription.status.toLowerCase()}`}>
            {statusLabel(subscription.status)}
          </span>
        </div>
        <p className="fmp-current-copy">{subscription.planDescription || 'Your platform membership is active across LeagueOS.'}</p>
        <div className="fmp-current-meta">
          <span><FiCalendar /> {renewalLabel}</span>
          <span><FiCreditCard /> {formatMoney(subscription.amountPaid, subscription.currency)} / {subscription.billingPeriod.toLowerCase()}</span>
        </div>
        {subscription.planBenefits.length > 0 && (
          <ul className="fmp-tier-features">
            {subscription.planBenefits.slice(0, 6).map((benefit) => (
              <li key={benefit}>
                <FiCheck className="fmp-feature-check" />
                {benefit}
              </li>
            ))}
          </ul>
        )}
        {isActive && (
          <button type="button" className="fmp-secondary-btn" disabled={isBusy} onClick={() => onCancel(subscription.id)}>
            {isBusy ? 'Cancelling...' : 'Cancel Membership'}
          </button>
        )}
      </div>
    </article>
  );
}

function PlanCard({
  plan,
  currentPlanId,
  isBusy,
  canAfford,
  onSubscribe,
}: {
  plan: PlatformMembershipPlan;
  currentPlanId: string | null;
  isBusy: boolean;
  canAfford: boolean;
  onSubscribe: (planId: string) => Promise<void>;
}) {
  const isCurrent = currentPlanId === plan.id;
  const isDisabled = isCurrent || isBusy || !canAfford;

  return (
    <article className={`fmp-tier-card${isCurrent ? ' fmp-tier-card--current' : ''}`}>
      {isCurrent && <span className="fmp-popular-badge"><FiStar /> Current Plan</span>}
      <div className="fmp-tier-topline">
        <div className="fmp-tier-icon">
          <GiShield />
        </div>
        <span className="fmp-period-pill">{billingLabel(plan.billingPeriod)}</span>
      </div>
      <h3 className="fmp-tier-name">{plan.name}</h3>
      <div className="fmp-tier-price-row">
        <p className="fmp-tier-price">{formatMoney(plan.price, plan.currency)}</p>
        <p className="fmp-tier-price-note">{periodLabel(plan.billingPeriod)}</p>
      </div>
      <p className="fmp-plan-description">{plan.description}</p>
      <ul className="fmp-tier-features">
        {plan.benefits.slice(0, 6).map((benefit) => (
          <li key={benefit}>
            <FiCheck className="fmp-feature-check" />
            {benefit}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`fmp-join-btn${isCurrent ? ' fmp-join-btn--joined' : ''}`}
        onClick={() => onSubscribe(plan.id)}
        disabled={isDisabled}
      >
        {isCurrent ? 'Current plan' : isBusy ? 'Joining...' : !canAfford ? 'Top up wallet' : 'Choose plan'}
      </button>
    </article>
  );
}

function FanMembershipsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<PlatformMembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const membershipPaymentKeys = useRef<Record<string, string>>({});
  const { wallet, isLoading: walletLoading, refresh: refreshWallet } = useFanWallet('UGX');

  const activeSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.status === 'ACTIVE') ?? null,
    [subscriptions],
  );
  const featuredPlans = useMemo(
    () => [...plans].sort((first, second) => first.price - second.price),
    [plans],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchActiveMembershipPlans(), fetchMyMemberships()])
      .then(([planResult, subscriptionResult]) => {
        if (cancelled) return;
        setPlans(planResult);
        setSubscriptions(subscriptionResult);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load memberships.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;

    if (!walletLoading && wallet === null) {
      setError('No wallet found. Please top up your wallet to continue.');
      return;
    }

    if (!walletLoading && wallet !== null && wallet.availableBalance < plan.price) {
      setError('Insufficient wallet balance. Please top up your wallet to continue.');
      return;
    }

    setBusyId(planId);
    setError(null);
    try {
      membershipPaymentKeys.current[planId] ??= crypto.randomUUID();
      const subscription = await subscribeToMembershipPlan(planId, membershipPaymentKeys.current[planId]);
      setSubscriptions((current) => [
        subscription,
        ...current.map((item) => (item.status === 'ACTIVE' ? { ...item, status: 'CANCELLED' as const } : item)),
      ]);
      delete membershipPaymentKeys.current[planId];
      await refreshWallet();
    } catch (subscribeError) {
      setError(subscribeError instanceof Error ? subscribeError.message : 'Could not join this membership.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    setBusyId(subscriptionId);
    setError(null);
    try {
      const updated = await cancelMyMembership(subscriptionId);
      setSubscriptions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Could not cancel this membership.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content fmp-content">
          <section className="fmp-hero">
            <div className="fmp-hero-copy">
              <p className="fmp-eyebrow">Fan Membership</p>
              <h1 className="fmp-title">Unlock the best of LeagueOS.</h1>
              <p className="fmp-sub">Manage your active membership, compare available plans, and keep your fan benefits in one place.</p>
            </div>
            <div className="fmp-hero-stats" aria-label="Membership summary">
              <div>
                <span>{activeSubscription ? activeSubscription.planName : 'No active plan'}</span>
                <b>Current</b>
              </div>
              <div>
                <span>{plans.length}</span>
                <b>Plans</b>
              </div>
              <div>
                <span>{activeSubscription ? formatDate(activeSubscription.renewsAt) : 'Pending'}</span>
                <b>Renewal</b>
              </div>
            </div>
          </section>

          {error && (
            <div className="fmp-error">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
          )}

          <section className="fmp-section fmp-section--active">
            <div className="fmp-section-header">
              <div>
                <p className="fmp-section-kicker">Account status</p>
                <h2 className="fmp-section-heading">Your Active Membership</h2>
              </div>
              {activeSubscription && (
                <span className="fmp-renewal-chip">
                  <FiZap /> {billingLabel(activeSubscription.billingPeriod)}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="fmp-loading">Loading memberships...</div>
            ) : activeSubscription ? (
              <CurrentMembershipCard
                subscription={activeSubscription}
                onCancel={handleCancel}
                isBusy={busyId === activeSubscription.id}
              />
            ) : (
              <div className="fmp-empty">No active membership yet.</div>
            )}
          </section>

          <section className="fmp-section">
            <div className="fmp-section-header">
              <div>
                <p className="fmp-section-kicker">Available plans</p>
                <h2 className="fmp-section-heading">Explore Membership Plans</h2>
                <p className="fmp-section-sub">Plans are created by the LeagueOS Super Admin and update here automatically.</p>
              </div>
              <span className="fmp-wallet-chip">
                <FiCreditCard />
                {walletLoading
                  ? 'Wallet loading'
                  : wallet
                  ? `Wallet: ${formatMoney(wallet.availableBalance, wallet.currency)}`
                  : 'No wallet'}
              </span>
            </div>
            {isLoading ? (
              <div className="fmp-loading">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="fmp-empty">No active membership plans are available right now.</div>
            ) : (
              <div className="fmp-tiers-grid">
                {featuredPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currentPlanId={activeSubscription?.planId ?? null}
                    isBusy={busyId === plan.id}
                    canAfford={!walletLoading && wallet !== null && wallet.availableBalance >= plan.price}
                    onSubscribe={handleSubscribe}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanMembershipsPage;
