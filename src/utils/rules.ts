export function formatUgx(value: number): string {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

export function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function normalizeName(value: string | undefined | null): string {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
    : '';
}

export function isMatchingName(
  providedValue: string,
  firstName?: string,
  lastName?: string,
  fullName?: string,
): boolean {
  const provided = normalizeName(providedValue);
  const expectedFullName = normalizeName(fullName || `${firstName ?? ''} ${lastName ?? ''}`.trim());

  if (!provided || !expectedFullName) return false;
  if (provided === expectedFullName) return true;

  const providedParts = provided.split(' ');
  const expectedParts = expectedFullName.split(' ');

  // Accept minor ordering differences and name subsets.
  const allIncluded = providedParts.every((part) => expectedParts.includes(part));
  const requiredParts = [firstName, lastName].filter(Boolean).map(normalizeName).filter(Boolean);
  const includesRequired = requiredParts.every((part) => providedParts.includes(part));

  return allIncluded && includesRequired;
}

function normalizeDate(value: string | undefined | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function isMatchingDob(providedDob: string, profileDob?: string): boolean {
  const expected = normalizeDate(profileDob);
  const provided = normalizeDate(providedDob);
  if (!provided || !expected) return false;

  return provided === expected;
}

function normalizeIdNumber(value: string | undefined | null): string {
  return typeof value === 'string'
    ? value.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase()
    : '';
}

export function isMatchingIdNumber(nin: string, idNumber: string): boolean {
  const normalizedNin = normalizeIdNumber(nin);
  const normalizedIdNumber = normalizeIdNumber(idNumber);
  return normalizedNin !== '' && normalizedNin === normalizedIdNumber;
}

export function isVerificationPending(isVerified: boolean, profile?: { is_verified?: boolean } | null): boolean {
  return !isVerified && profile?.is_verified === false;
}

export function buildSparklinePath(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1 || 1);

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
