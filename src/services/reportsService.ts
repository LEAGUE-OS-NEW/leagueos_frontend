// Admin Reports — service layer. No backend endpoint exists yet, so this is
// in-memory mock, following the same delay()-wrapped async convention as
// every other admin service this pass. "Generating" a report just records a
// row — there's no real export pipeline behind it.

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

export interface ReportCategory {
  id: string;
  label: string;
  description: string;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'trading-volume', label: 'Trading Volume', description: 'Contracts matched and UGX volume by market and category.' },
  { id: 'financial', label: 'Financial', description: 'Deposits, withdrawals, fees, and payout totals.' },
  { id: 'user', label: 'User', description: 'Fan sign-ups, active traders, and retention.' },
  { id: 'market', label: 'Market', description: 'Markets created, published, resolved, and cancelled.' },
  { id: 'system', label: 'System', description: 'Uptime, API performance, and integration health.' },
];

export interface GeneratedReport {
  id: string;
  categoryId: string;
  categoryLabel: string;
  generatedBy: string;
  generatedAt: string;
  format: 'CSV' | 'PDF';
}

const reports: GeneratedReport[] = [
  {
    id: genId('report'),
    categoryId: 'financial',
    categoryLabel: 'Financial',
    generatedBy: 'Merab Aceng',
    generatedAt: hoursAgo(18),
    format: 'CSV',
  },
  {
    id: genId('report'),
    categoryId: 'trading-volume',
    categoryLabel: 'Trading Volume',
    generatedBy: 'Dennis Kato',
    generatedAt: hoursAgo(40),
    format: 'PDF',
  },
];

export async function fetchRecentReports(): Promise<GeneratedReport[]> {
  return delay([...reports].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
}

export async function generateReport(categoryId: string, generatedBy: string, format: 'CSV' | 'PDF' = 'CSV'): Promise<GeneratedReport> {
  const category = REPORT_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) throw new Error(`Unknown report category: ${categoryId}`);

  const report: GeneratedReport = {
    id: genId('report'),
    categoryId: category.id,
    categoryLabel: category.label,
    generatedBy,
    generatedAt: new Date().toISOString(),
    format,
  };
  reports.unshift(report);
  return delay({ ...report });
}
