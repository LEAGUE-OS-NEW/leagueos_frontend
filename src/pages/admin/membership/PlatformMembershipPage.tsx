import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiPlus } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  cancelSubscriberPlan,
  createMembershipPlan,
  fetchMembershipPlans,
  fetchSubscribers,
  setPlanStatus,
  updateMembershipPlan,
  type BillingPeriod,
  type CreatePlanInput,
  type PlanStatus,
  type PlatformMembershipPlan,
  type PlatformSubscriber,
} from '../../../services/platformMembershipService';
import './PlatformMembershipPage.css';

type Section = 'Plans' | 'Subscribers';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'QUARTERLY', 'ANNUAL'];

function PlanModal({
  initial,
  onCancel,
  onSave,
}: {
  initial?: PlatformMembershipPlan;
  onCancel: () => void;
  onSave: (input: CreatePlanInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'UGX');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initial?.billingPeriod ?? 'MONTHLY');
  const [benefitsText, setBenefitsText] = useState(initial?.benefits.join('\n') ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name,
        description,
        price: Number(price),
        currency,
        billingPeriod,
        benefits: benefitsText.split('\n'),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pm-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="pm-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{initial ? 'Edit Plan' : 'Create Membership Plan'}</h3>
        {error && (
          <div className="pm-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <label className="pm-field">
          <span>Plan name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="LeagueOS Plus" />
        </label>
        <label className="pm-field">
          <span>Description</span>
          <textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="pm-field-row">
          <label className="pm-field">
            <span>Fee</span>
            <input type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="15000" />
          </label>
          <label className="pm-field">
            <span>Currency</span>
            <input type="text" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
          </label>
          <label className="pm-field">
            <span>Billing period</span>
            <select value={billingPeriod} onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}>
              {BILLING_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="pm-field">
          <span>Benefits (one per line)</span>
          <textarea
            rows={4}
            value={benefitsText}
            onChange={(event) => setBenefitsText(event.target.value)}
            placeholder={'Follow unlimited clubs\nCreate and join fantasy leagues'}
          />
        </label>
        <div className="pm-modal__footer">
          <button type="button" className="pm-btn pm-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="pm-btn pm-btn--gradient" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformMembershipPage() {
  const [section, setSection] = useState<Section>('Plans');
  const [plans, setPlans] = useState<PlatformMembershipPlan[]>([]);
  const [subscribers, setSubscribers] = useState<PlatformSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformMembershipPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMembershipPlans(), fetchSubscribers()])
      .then(([planResult, subscriberResult]) => {
        if (cancelled) return;
        setPlans(planResult);
        setSubscribers(subscriberResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load membership data. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreatePlan = async (input: CreatePlanInput) => {
    const created = await createMembershipPlan(input);
    setPlans((current) => [created, ...current]);
    setShowPlanModal(false);
  };

  const handleUpdatePlan = async (input: CreatePlanInput) => {
    if (!editingPlan) return;
    const updated = await updateMembershipPlan(editingPlan.id, input);
    setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
    setEditingPlan(null);
  };

  const handleSetStatus = async (planId: string, status: PlanStatus) => {
    setActionError(null);
    try {
      const updated = await setPlanStatus(planId, status);
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this plan.');
    }
  };

  const handleCancelSubscriber = async (id: string) => {
    setActionError(null);
    try {
      const updated = await cancelSubscriberPlan(id);
      setSubscribers((current) => current.map((sub) => (sub.id === updated.id ? updated : sub)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not cancel this subscription.');
    }
  };

  return (
    <AdminLayout>
      <div className="pm-root">
        <div className="pm-head">
          <div>
            <p className="pm-eyebrow">Welcome back</p>
            <h1>Membership</h1>
            <p>
              LeagueOS's own platform subscription — separate from any club's membership. Fans who subscribe unlock
              following clubs, fantasy leagues, and more; revenue goes to LeagueOS.
            </p>
          </div>
          {section === 'Plans' && (
            <button type="button" className="pm-btn pm-btn--gradient" onClick={() => setShowPlanModal(true)}>
              <FiPlus /> Create Plan
            </button>
          )}
        </div>

        <div className="pm-tabs" role="tablist">
          {(['Plans', 'Subscribers'] as Section[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pm-tab${section === tab ? ' is-active' : ''}`}
              onClick={() => setSection(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {(loadError || actionError) && (
          <div className="pm-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="pm-loading">
            <FiActivity aria-hidden="true" className="pm-loading__icon" />
            Loading membership data…
          </div>
        ) : section === 'Plans' ? (
          <div className="pm-panel">
            <div className="pm-table-scroll">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Fee</th>
                    <th>Billing</th>
                    <th>Benefits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="pm-plan-name">{plan.name}</div>
                        <div className="pm-plan-desc">{plan.description}</div>
                      </td>
                      <td>{formatMoney(plan.price, plan.currency)}</td>
                      <td>{plan.billingPeriod}</td>
                      <td>{plan.benefits.length} benefit{plan.benefits.length === 1 ? '' : 's'}</td>
                      <td>
                        <span className={`pm-status-pill pm-status-pill--${plan.status.toLowerCase()}`}>{plan.status}</span>
                      </td>
                      <td>
                        <div className="pm-row-actions">
                          <button type="button" className="pm-btn pm-btn--outline pm-btn--sm" onClick={() => setEditingPlan(plan)}>
                            Edit
                          </button>
                          {plan.status !== 'ACTIVE' && (
                            <button
                              type="button"
                              className="pm-btn pm-btn--outline pm-btn--sm"
                              onClick={() => handleSetStatus(plan.id, 'ACTIVE')}
                            >
                              Activate
                            </button>
                          )}
                          {plan.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="pm-btn pm-btn--outline pm-btn--sm"
                              onClick={() => handleSetStatus(plan.id, 'PAUSED')}
                            >
                              Pause
                            </button>
                          )}
                          {plan.status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              className="pm-btn pm-btn--outline pm-btn--sm"
                              onClick={() => handleSetStatus(plan.id, 'ARCHIVED')}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="pm-table__empty">
                        No membership plans yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="pm-panel">
            <div className="pm-table-scroll">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Fan</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Subscribed</th>
                    <th>Renews</th>
                    <th>Amount Paid</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>
                        <div className="pm-plan-name">{subscriber.fanName}</div>
                        <div className="pm-plan-desc">{subscriber.fanEmail}</div>
                      </td>
                      <td>{subscriber.planName}</td>
                      <td>
                        <span className={`pm-status-pill pm-status-pill--${subscriber.status.toLowerCase()}`}>
                          {subscriber.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatDate(subscriber.subscribedAt)}</td>
                      <td>{formatDate(subscriber.renewsAt)}</td>
                      <td>{formatMoney(subscriber.amountPaid, subscriber.currency)}</td>
                      <td>
                        {subscriber.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            className="pm-btn pm-btn--outline pm-btn--sm"
                            onClick={() => handleCancelSubscriber(subscriber.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {subscribers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="pm-table__empty">
                        No subscribers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPlanModal && <PlanModal onCancel={() => setShowPlanModal(false)} onSave={handleCreatePlan} />}
      {editingPlan && <PlanModal initial={editingPlan} onCancel={() => setEditingPlan(null)} onSave={handleUpdatePlan} />}
    </AdminLayout>
  );
}

export default PlatformMembershipPage;
