export const DASHBOARD_ROUTE = '/dashboard';
export const LOGIN_ROUTE = '/login';
export const VERIFY_EMAIL_ROUTE = '/verify-email';
export const PERSONALIZE_ROUTE = '/personalize';


export type AuthFlowState = {
  email?: string;
  message?: string;
  postLoginRedirect?: string;
};

export function getPostAuthRedirect({
  postLoginRedirect,
  isFirstTimeUser,
}: {
  postLoginRedirect?: string;
  isFirstTimeUser?: boolean;
}) {
  if (postLoginRedirect) {
    return postLoginRedirect;
  }

  if (isFirstTimeUser) {
    return PERSONALIZE_ROUTE;
  }

  return DASHBOARD_ROUTE;
}

export function isSafeAuthRedirect(path?: string) {
  return Boolean(
    path &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      path !== LOGIN_ROUTE &&
      path !== VERIFY_EMAIL_ROUTE &&
      path !== '/register',
  );
}

export function getSafeAuthRedirect(path?: string) {
  return isSafeAuthRedirect(path) ? path : undefined;
}
