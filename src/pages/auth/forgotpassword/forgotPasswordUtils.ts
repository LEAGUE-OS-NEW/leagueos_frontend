export function normalizeCodeInput(value: string) {
  return value.replace(/[^\d]/g, '');
}
