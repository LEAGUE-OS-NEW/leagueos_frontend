import type { AuthenticatedUser } from '../types/dashboardAccess.ts';

export function isSyntheticReviewUser(user: AuthenticatedUser | null | undefined): boolean {
  return typeof user?.email === 'string' && user.email.trim().toLowerCase().endsWith('@leagueos.test');
}

export function reviewWorkflowToolsEnabled(): boolean {
  return import.meta.env.VITE_REVIEW_WORKFLOW_TOOLS_ENABLED === 'true';
}

export function canUseReviewWorkflowTools(user: AuthenticatedUser | null | undefined): boolean {
  return reviewWorkflowToolsEnabled() && isSyntheticReviewUser(user);
}

export function safeAuthenticatedReturnTo(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname === '/fan/verify') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
