import type { MarketEligibility } from '../services/marketEligibilityService.ts';

const REASON_MESSAGES: Record<string, string> = {
  DATE_OF_BIRTH_REQUIRED: 'Add your date of birth to your profile.',
  AGE_RESTRICTED: 'Market trading is only available to eligible adults.',
  COUNTRY_REQUIRED: 'Add your country to your profile.',
  COUNTRY_INVALID: 'Your profile country needs to be checked.',
  JURISDICTION_BLOCKED: 'Market trading is not available in your jurisdiction.',
  KYC_NOT_STARTED: 'Complete identity verification to start trading.',
  KYC_PENDING: 'Your identity verification is under review.',
  KYC_REJECTED: 'Your identity verification was rejected.',
  KYC_EXPIRED: 'Your identity verification has expired.',
  COMPLIANCE_RESTRICTED: 'A compliance restriction is active on your market account.',
  COMPLIANCE_SUSPENDED: 'Your market account is suspended.',
  RISK_CRITICAL: 'Your account requires compliance review before trading.',
  RISK_REVIEW_REQUIRED: 'Your account is queued for compliance review.',
};

const ACTION_LABELS: Record<string, string> = {
  COMPLETE_PROFILE: 'Complete profile',
  COMPLETE_KYC: 'Verify identity',
  WAIT_FOR_KYC_REVIEW: 'Wait for review',
  CONTACT_SUPPORT: 'Contact support',
  REDUCE_ORDER_SIZE: 'Reduce order size',
  REVIEW_LIMITS: 'Review limits',
  WAIT_FOR_COOLING_OFF: 'Wait for cooling-off',
};

export function marketEligibilityTitle(eligibility: MarketEligibility | null, isLoading = false): string {
  if (isLoading) return 'Checking market access';
  if (!eligibility) return 'Market access unavailable';
  if (eligibility.eligible) return 'Market access approved';
  if (eligibility.next_actions.includes('WAIT_FOR_KYC_REVIEW')) return 'Verification is in progress';
  if (eligibility.next_actions.includes('COMPLETE_KYC')) return 'Identity verification required';
  if (eligibility.next_actions.includes('COMPLETE_PROFILE')) return 'Profile details required';
  return 'Market access restricted';
}

export function marketEligibilityMessage(eligibility: MarketEligibility | null, fallback?: string): string {
  if (!eligibility) return fallback ?? 'We could not confirm your market access.';
  if (eligibility.eligible) return 'You can place orders, manage positions, and use market wallet features.';

  const message = eligibility.reason_codes.map((code) => REASON_MESSAGES[code] ?? code.replaceAll('_', ' ').toLowerCase()).find(Boolean);
  return message ?? fallback ?? 'Market trading is not available for this account right now.';
}

export function marketEligibilityActions(eligibility: MarketEligibility | null): string[] {
  return (eligibility?.next_actions ?? []).map((action) => ACTION_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase());
}

