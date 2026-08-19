import apiClient from './apiClient';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils';
import type { ApiEnvelope, PaginatedResponse } from '../types/api';

export type BillingPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type SubscriberStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

interface BackendPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  currency: string;
  billing_period: BillingPeriod;
  benefits: string[];
  status: PlanStatus;
  subscriber_count?: number;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
}

interface BackendSubscription {
  id: string;
  fan_name: string;
  fan_email: string;
  plan: string;
  plan_name: string;
  plan_description?: string;
  plan_benefits?: string[];
  billing_period: BillingPeriod;
  status: SubscriberStatus;
  subscribed_at: string;
  renews_at: string;
  amount_paid: string | number;
  currency: string;
}

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
  subscriberCount?: number;
}

export interface PlatformSubscriber {
  id: string;
  fanName: string;
  fanEmail: string;
  planId: string;
  planName: string;
  planDescription?: string;
  planBenefits: string[];
  billingPeriod: BillingPeriod;
  status: SubscriberStatus;
  subscribedAt: string;
  renewsAt: string;
  amountPaid: number;
  currency: string;
}

export interface CreatePlanInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  benefits: string[];
}

function numberValue(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPlan(plan: BackendPlan): PlatformMembershipPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: numberValue(plan.price),
    currency: plan.currency,
    billingPeriod: plan.billing_period,
    benefits: plan.benefits ?? [],
    status: plan.status,
    createdAt: plan.created_at,
    subscriberCount: plan.subscriber_count,
  };
}

function mapSubscriber(subscription: BackendSubscription): PlatformSubscriber {
  return {
    id: subscription.id,
    fanName: subscription.fan_name,
    fanEmail: subscription.fan_email,
    planId: subscription.plan,
    planName: subscription.plan_name,
    planDescription: subscription.plan_description,
    planBenefits: subscription.plan_benefits ?? [],
    billingPeriod: subscription.billing_period,
    status: subscription.status,
    subscribedAt: subscription.subscribed_at,
    renewsAt: subscription.renews_at,
    amountPaid: numberValue(subscription.amount_paid),
    currency: subscription.currency,
  };
}

function planPayload(input: CreatePlanInput) {
  return {
    name: input.name,
    description: input.description,
    price: input.price,
    currency: input.currency,
    billing_period: input.billingPeriod,
    benefits: input.benefits,
  };
}

function throwApiError(error: unknown): never {
  throw new Error(extractApiError(error).message);
}

export async function fetchMembershipPlans(): Promise<PlatformMembershipPlan[]> {
  try {
    const response = await apiClient.get<
      ApiEnvelope<BackendPlan[] | PaginatedResponse<BackendPlan>> | BackendPlan[] | PaginatedResponse<BackendPlan>
    >('/admin/membership/plans/');
    return normalizeApiList(response.data).map(mapPlan);
  } catch (error) {
    throwApiError(error);
  }
}

export async function fetchActiveMembershipPlans(): Promise<PlatformMembershipPlan[]> {
  try {
    const response = await apiClient.get<
      ApiEnvelope<BackendPlan[] | PaginatedResponse<BackendPlan>> | BackendPlan[] | PaginatedResponse<BackendPlan>
    >('/membership/plans/');
    return normalizeApiList(response.data).map(mapPlan);
  } catch (error) {
    throwApiError(error);
  }
}

export async function createMembershipPlan(input: CreatePlanInput): Promise<PlatformMembershipPlan> {
  try {
    const response = await apiClient.post<ApiEnvelope<BackendPlan> | BackendPlan>(
      '/admin/membership/plans/',
      planPayload(input),
    );
    return mapPlan(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}

export async function updateMembershipPlan(id: string, input: CreatePlanInput): Promise<PlatformMembershipPlan> {
  try {
    const response = await apiClient.patch<ApiEnvelope<BackendPlan> | BackendPlan>(
      `/admin/membership/plans/${encodeURIComponent(id)}/`,
      planPayload(input),
    );
    return mapPlan(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}

export async function setPlanStatus(id: string, status: PlanStatus): Promise<PlatformMembershipPlan> {
  try {
    const response = await apiClient.patch<ApiEnvelope<BackendPlan> | BackendPlan>(
      `/admin/membership/plans/${encodeURIComponent(id)}/status/`,
      { status },
    );
    return mapPlan(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}

export async function fetchSubscribers(): Promise<PlatformSubscriber[]> {
  try {
    const response = await apiClient.get<
      | ApiEnvelope<BackendSubscription[] | PaginatedResponse<BackendSubscription>>
      | BackendSubscription[]
      | PaginatedResponse<BackendSubscription>
    >('/admin/membership/subscribers/');
    return normalizeApiList(response.data).map(mapSubscriber);
  } catch (error) {
    throwApiError(error);
  }
}

export async function fetchMyMemberships(): Promise<PlatformSubscriber[]> {
  try {
    const response = await apiClient.get<
      | ApiEnvelope<BackendSubscription[] | PaginatedResponse<BackendSubscription>>
      | BackendSubscription[]
      | PaginatedResponse<BackendSubscription>
    >('/membership/me/');
    return normalizeApiList(response.data).map(mapSubscriber);
  } catch (error) {
    throwApiError(error);
  }
}

export async function subscribeToMembershipPlan(planId: string): Promise<PlatformSubscriber> {
  try {
    const response = await apiClient.post<ApiEnvelope<BackendSubscription> | BackendSubscription>(
      '/membership/subscribe/',
      { plan_id: planId },
    );
    return mapSubscriber(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}

export async function cancelSubscriberPlan(id: string): Promise<PlatformSubscriber> {
  try {
    const response = await apiClient.post<ApiEnvelope<BackendSubscription> | BackendSubscription>(
      `/admin/membership/subscribers/${encodeURIComponent(id)}/cancel/`,
    );
    return mapSubscriber(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}

export async function cancelMyMembership(id: string): Promise<PlatformSubscriber> {
  try {
    const response = await apiClient.post<ApiEnvelope<BackendSubscription> | BackendSubscription>(
      `/membership/subscriptions/${encodeURIComponent(id)}/cancel/`,
    );
    return mapSubscriber(unwrapApiData(response.data));
  } catch (error) {
    throwApiError(error);
  }
}
