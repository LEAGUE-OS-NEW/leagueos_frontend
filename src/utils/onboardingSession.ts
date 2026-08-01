const PENDING_ONBOARDING_KEY = 'league_os_pending_onboarding';

export interface PendingOnboardingSession {
  email: string;
  password: string;
}

export function savePendingOnboardingSession(session: PendingOnboardingSession): void {
  sessionStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(session));
}

export function getPendingOnboardingSession(): PendingOnboardingSession | null {
  const raw = sessionStorage.getItem(PENDING_ONBOARDING_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<PendingOnboardingSession>;
    if (!session.email || !session.password) return null;
    return { email: session.email, password: session.password };
  } catch {
    return null;
  }
}

export function clearPendingOnboardingSession(): void {
  sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
}