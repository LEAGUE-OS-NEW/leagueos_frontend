const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

function getBrowserOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:8000';
}

export function getApiAssetBaseUrl() {
  const configuredBaseUrl = String(
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  ).trim();

  const apiUrl = new URL(configuredBaseUrl || DEFAULT_API_BASE_URL, getBrowserOrigin());
  apiUrl.pathname = apiUrl.pathname.replace(/\/api(?:\/v\d+)?\/?$/i, '') || '/';
  apiUrl.search = '';
  apiUrl.hash = '';

  return apiUrl.toString().replace(/\/$/, '');
}

export function resolveApiAssetUrl(url: string | null | undefined) {
  const trimmedUrl = typeof url === 'string' ? url.trim() : '';

  if (!trimmedUrl) return null;

  if (/^[a-z][a-z\d+\-.]*:/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('//')) {
    return new URL(trimmedUrl, getBrowserOrigin()).toString();
  }

  const baseUrl = getApiAssetBaseUrl();

  return trimmedUrl.startsWith('/')
    ? `${baseUrl}${trimmedUrl}`
    : `${baseUrl}/${trimmedUrl}`;
}

export function versionedApiAssetUrl(
  url: string | null | undefined,
  version?: string | null,
) {
  const resolvedUrl = resolveApiAssetUrl(url);

  if (!resolvedUrl || !version) return resolvedUrl;

  const separator = resolvedUrl.includes('?') ? '&' : '?';
  return `${resolvedUrl}${separator}v=${encodeURIComponent(version)}`;
}
