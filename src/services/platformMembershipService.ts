// LeagueOS platform membership — service layer.
//
// No real backend endpoint exists for this yet (no Subscription/
// PlatformMembership model, no payment routing, no gating logic — confirmed
// against leagueos_backend), so this is mock-backed, following the same
// convention as FinanceService.ts / sportsDataService.ts: typed interfaces,
// in-memory data, delay()-wrapped async functions, shaped so a real backend
// swap later only touches this file.
//
// Distinct from clubs.MembershipPlan (per-club, real, unrelated) — this is
// a platform-wide subscription created and priced by the Super Admin, paid
// by fans, with revenue routed to LeagueOS rather than any club.

export type BillingPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type SubscriberStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

export interface PlatformMembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  benefits: string[];
  status: PlanStatus;
  createdAt: string;
}

export interface PlatformSubscriber {
  id: string;
  fanName: string;
  fanEmail: string;
  planId: string;
  planName: string;
  status: SubscriberStatus;
  subscribedAt: string;
  renewsAt: string;
  amountPaid: number;
  currency: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

const plans: PlatformMembershipPlan[] = [
  {
    id: genId('plan'),
    name: 'LeagueOS Plus',
    description: 'Follow unlimited clubs, join fantasy leagues, and unlock priority ticket access — all in one platform subscription.',
    price: 15_000,
    currency: 'UGX',
    billingPeriod: 'MONTHLY',
    benefits: ['Follow unlimited clubs', 'Create and join fantasy leagues', 'Priority ticket access', 'Ad-free browsing'],
    status: 'ACTIVE',
    createdAt: daysAgo(60),
  },
  {
    id: genId('plan'),
    name: 'LeagueOS Plus — Annual',
    description: 'Same benefits as LeagueOS Plus, billed once a year at a discount.',
    price: 150_000,
    currency: 'UGX',
    billingPeriod: 'ANNUAL',
    benefits: ['Follow unlimited clubs', 'Create and join fantasy leagues', 'Priority ticket access', 'Ad-free browsing', '2 months free vs. monthly'],
    status: 'ACTIVE',
    createdAt: daysAgo(45),
  },
];

const subscribers: PlatformSubscriber[] = [
  {
    id: genId('sub'),
    fanName: 'Grace Nabirye',
    fanEmail: 'grace.nabirye@example.com',
    planId: plans[0].id,
    planName: plans[0].name,
    status: 'ACTIVE',
    subscribedAt: daysAgo(20),
    renewsAt: daysFromNow(10),
    amountPaid: plans[0].price,
    currency: plans[0].currency,
  },
  {
    id: genId('sub'),
    fanName: 'Dennis Kato',
    fanEmail: 'dennis.kato@example.com',
    planId: plans[1].id,
    planName: plans[1].name,
    status: 'ACTIVE',
    subscribedAt: daysAgo(40),
    renewsAt: daysFromNow(325),
    amountPaid: plans[1].price,
    currency: plans[1].currency,
  },
  {
    id: genId('sub'),
    fanName: 'Dawa Nakato',
    fanEmail: 'dawa.nakato@example.com',
    planId: plans[0].id,
    planName: plans[0].name,
    status: 'PAST_DUE',
    subscribedAt: daysAgo(65),
    renewsAt: daysAgo(5),
    amountPaid: plans[0].price,
    currency: plans[0].currency,
  },
  {
    id: genId('sub'),
    fanName: 'Merab Aceng',
    fanEmail: 'merab.aceng@example.com',
    planId: plans[0].id,
    planName: plans[0].name,
    status: 'CANCELLED',
    subscribedAt: daysAgo(90),
    renewsAt: daysAgo(30),
    amountPaid: plans[0].price,
    currency: plans[0].currency,
  },
];

export interface CreatePlanInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  benefits: string[];
}

export async function fetchMembershipPlans(): Promise<PlatformMembershipPlan[]> {
  return delay([...plans]);
}

export async function createMembershipPlan(input: CreatePlanInput): Promise<PlatformMembershipPlan> {
  if (!input.name.trim()) fail('Enter a plan name.');
  if (!(input.price > 0)) fail('Enter a fee greater than zero.');
  const plan: PlatformMembershipPlan = {
    id: genId('plan'),
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    currency: input.currency,
    billingPeriod: input.billingPeriod,
    benefits: input.benefits.filter((benefit) => benefit.trim().length > 0),
    status: 'DRAFT',
    createdAt: nowIso(),
  };
  plans.unshift(plan);
  return delay(plan);
}

export async function updateMembershipPlan(id: string, input: CreatePlanInput): Promise<PlatformMembershipPlan> {
  const plan = plans.find((item) => item.id === id);
  if (!plan) fail('Plan not found.');
  if (!input.name.trim()) fail('Enter a plan name.');
  if (!(input.price > 0)) fail('Enter a fee greater than zero.');
  // Changing price only affects future subscribers, matching real billing
  // convention (clubs.MembershipPlan) — existing subscribers keep what they
  // already agreed to pay; amountPaid on existing rows is left untouched.
  plan.name = input.name.trim();
  plan.description = input.description.trim();
  plan.price = input.price;
  plan.currency = input.currency;
  plan.billingPeriod = input.billingPeriod;
  plan.benefits = input.benefits.filter((benefit) => benefit.trim().length > 0);
  return delay({ ...plan });
}

export async function setPlanStatus(id: string, status: PlanStatus): Promise<PlatformMembershipPlan> {
  const plan = plans.find((item) => item.id === id);
  if (!plan) fail('Plan not found.');
  plan.status = status;
  return delay({ ...plan });
}

export async function fetchSubscribers(): Promise<PlatformSubscriber[]> {
  return delay([...subscribers]);
}

export async function cancelSubscriberPlan(id: string): Promise<PlatformSubscriber> {
  const subscriber = subscribers.find((item) => item.id === id);
  if (!subscriber) fail('Subscriber not found.');
  subscriber.status = 'CANCELLED';
  return delay({ ...subscriber });
}
