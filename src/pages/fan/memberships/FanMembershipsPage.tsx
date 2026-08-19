import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiClock, FiStar } from 'react-icons/fi';
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

  return (
    <div className="fmp-current-card">
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
          <span><FiClock /> Renews {formatDate(subscription.renewsAt)}</span>
          <span>{formatMoney(subscription.amountPaid, subscription.currency)} / {subscription.billingPeriod.toLowerCase()}</span>
        </div>
        {subscription.planBenefits.length > 0 && (
          <ul className="fmp-tier-features">
            {subscription.planBenefits.map((benefit) => (
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
    </div>
  );
}

function PlanCard({
  plan,
  currentPlanId,
  isBusy,
  onSubscribe,
}: {
  plan: PlatformMembershipPlan;
  currentPlanId: string | null;
  isBusy: boolean;
  onSubscribe: (planId: string) => Promise<void>;
}) {
  const isCurrent = currentPlanId === plan.id;

  return (
    <div className={`fmp-tier-card${isCurrent ? ' fmp-tier-card--popular' : ''}`}>
      {isCurrent && <span className="fmp-popular-badge"><FiStar /> Current Plan</span>}
      <div className="fmp-tier-icon">
        <GiShield />
      </div>
      <h3 className="fmp-tier-name">{plan.name}</h3>
      <p className="fmp-tier-price">{formatMoney(plan.price, plan.currency)}</p>
      <p className="fmp-tier-price-note">{periodLabel(plan.billingPeriod)}</p>
      <p className="fmp-plan-description">{plan.description}</p>
      <ul className="fmp-tier-features">
        {plan.benefits.map((benefit) => (
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
        disabled={isCurrent || isBusy}
      >
        {isCurrent ? 'Active' : isBusy ? 'Joining...' : 'Join Now'}
      </button>
    </div>
  );
}

function FanMembershipsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<PlatformMembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.status === 'ACTIVE') ?? null,
    [subscriptions],
  );

  const loadMembershipData = async () => {
    setError(null);
    const [planResult, subscriptionResult] = await Promise.all([
      fetchActiveMembershipPlans(),
      fetchMyMemberships(),
    ]);
    setPlans(planResult);
    setSubscriptions(subscriptionResult);
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadMembershipData()
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
    setBusyId(planId);
    setError(null);
    try {
      const subscription = await subscribeToMembershipPlan(planId);
      setSubscriptions((current) => [
        subscription,
        ...current.map((item) => (item.status === 'ACTIVE' ? { ...item, status: 'CANCELLED' as const } : item)),
      ]);
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
          <div className="fmp-header">
            <h1 className="fmp-title">Memberships</h1>
            <p className="fmp-sub">Manage your LeagueOS membership and unlock platform-wide fan benefits.</p>
          </div>

          {error && (
            <div className="fmp-error">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
          )}

          <section className="fmp-section">
            <h2 className="fmp-section-heading">Your Active Membership</h2>
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
            <h2 className="fmp-section-heading">Explore Membership Plans</h2>
            <p className="fmp-section-sub">Plans are created by the LeagueOS Super Admin and update here automatically.</p>
            {isLoading ? (
              <div className="fmp-loading">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="fmp-empty">No active membership plans are available right now.</div>
            ) : (
              <div className="fmp-tiers-grid">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currentPlanId={activeSubscription?.planId ?? null}
                    isBusy={busyId === plan.id}
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
