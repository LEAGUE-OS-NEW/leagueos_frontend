// Wallet & deposits — service layer (US-9.2).
//
// No real backend endpoint exists for wallet/deposits yet, so this is
// mock-backed, following the same convention as fanDashboardService.ts /
// accountService.ts: typed interfaces, in-memory mock data, async
// delay()-wrapped functions, shaped so a real backend swap later only
// touches this file.
//
// Idempotency: initializeDeposit/retryDeposit are keyed by a caller-supplied
// idempotencyKey (one per deposit attempt, generated client-side and reused
// across retries of the *same* attempt). Calling initializeDeposit again with
// a key that already has a pending record returns that same record instead
// of creating a second one — this is what "retry without creating ambiguous
// duplicate deposits" means in practice, mirroring how real payment APIs
// (Flutterwave, Stripe) use idempotency keys.

import type { WalletTransaction } from './fanDashboardService';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function parseUGX(value: string): number {
  return Number(value.replace(/[^\d.-]/g, '')) || 0;
}

function formatUGX(value: number): string {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/* Deposit methods                                                      */
/* ------------------------------------------------------------------ */

export type DepositMethod = 'mtn' | 'airtel' | 'card' | 'bank';

export interface DepositMethodOption {
  id: DepositMethod;
  label: string;
  description: string;
}

export const DEPOSIT_METHODS: DepositMethodOption[] = [
  { id: 'mtn', label: 'MTN Mobile Money', description: 'Pay instantly from your MTN MoMo wallet.' },
  { id: 'airtel', label: 'Airtel Money', description: 'Pay instantly from your Airtel Money wallet.' },
  { id: 'card', label: 'Debit / Credit Card', description: 'Visa, Mastercard, and local cards.' },
  { id: 'bank', label: 'Bank Transfer', description: 'Stanbic, DFCU, or Equity Bank.' },
];

export const BANK_OPTIONS = ['Stanbic Bank', 'DFCU Bank', 'Equity Bank'];

export const MIN_DEPOSIT = 5000;
export const MAX_DEPOSIT = 5000000;
export const QUICK_AMOUNTS = [10000, 50000, 100000, 200000];

/* ------------------------------------------------------------------ */
/* Deposit flow                                                         */
/* ------------------------------------------------------------------ */

export interface DepositDetails {
  method: DepositMethod;
  amount: number;
  phoneNumber?: string;
  bankName?: string;
}

export type DepositStatus = 'pending' | 'success' | 'failed';

export interface DepositRecord {
  idempotencyKey: string;
  txRef: string;
  status: DepositStatus;
  details: DepositDetails;
  providerInstructions: string;
  createdAt: number;
  resolvesAt: number;
  failureReason?: string;
}

const pendingDeposits = new Map<string, DepositRecord>();

function generateTxRef(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DEP-${stamp}-${random}`;
}

function buildProviderInstructions(details: DepositDetails, txRef: string): string {
  switch (details.method) {
    case 'mtn':
      return `Check your phone (${details.phoneNumber}) for an MTN Mobile Money prompt and enter your PIN to approve. Reference: ${txRef}.`;
    case 'airtel':
      return `Check your phone (${details.phoneNumber}) for an Airtel Money prompt and enter your PIN to approve. Reference: ${txRef}.`;
    case 'card':
      return `You'll be redirected to a secure payment page to complete your card payment. Reference: ${txRef}.`;
    case 'bank':
      return `Transfer ${formatUGX(details.amount)} to League OS at ${details.bankName} using reference ${txRef}. Deposits are credited once the transfer is confirmed.`;
    default:
      return `Reference: ${txRef}.`;
  }
}

export async function initializeDeposit(idempotencyKey: string, details: DepositDetails): Promise<DepositRecord> {
  const existing = pendingDeposits.get(idempotencyKey);
  if (existing && existing.status === 'pending') {
    return delay({ ...existing });
  }

  const txRef = generateTxRef();
  const record: DepositRecord = {
    idempotencyKey,
    txRef,
    status: 'pending',
    details,
    providerInstructions: buildProviderInstructions(details, txRef),
    createdAt: Date.now(),
    resolvesAt: Date.now() + 4000 + Math.random() * 2000,
  };

  pendingDeposits.set(idempotencyKey, record);
  return delay({ ...record }, 500);
}

export async function checkDepositStatus(idempotencyKey: string): Promise<DepositRecord> {
  const record = pendingDeposits.get(idempotencyKey);
  if (!record) {
    throw new Error('No deposit found for this reference.');
  }

  if (record.status !== 'pending' || Date.now() < record.resolvesAt) {
    return delay({ ...record }, 200);
  }

  const didSucceed = Math.random() > 0.2;
  record.status = didSucceed ? 'success' : 'failed';
  if (!didSucceed) {
    record.failureReason =
      record.details.method === 'bank'
        ? 'We could not confirm your bank transfer. Double-check the reference and try again.'
        : 'The payment prompt expired or was declined. Please try again.';
  }

  return delay({ ...record }, 200);
}

export async function retryDeposit(idempotencyKey: string): Promise<DepositRecord> {
  const existing = pendingDeposits.get(idempotencyKey);
  if (existing && existing.status === 'pending') {
    return delay({ ...existing });
  }
  if (!existing) {
    throw new Error('Nothing to retry — start a new deposit instead.');
  }
  return initializeDeposit(idempotencyKey, existing.details);
}

/* ------------------------------------------------------------------ */
/* Wallet details (full page)                                          */
/* ------------------------------------------------------------------ */

export interface WalletDetails {
  balance: string;
  pendingWithdrawals: string;
  transactions: WalletTransaction[];
}

const WALLET_DETAILS: WalletDetails = {
  balance: 'UGX 920,000',
  pendingWithdrawals: 'UGX 0',
  transactions: [
    { id: 'txn-1', label: 'Vipers SC vs Express FC — Market win', amount: '+UGX 74,000', timestamp: '2h ago', type: 'credit' },
    { id: 'txn-2', label: 'Ticket purchase — City Oilers vs Patriots BC', amount: '-UGX 60,000', timestamp: '1d ago', type: 'debit' },
    { id: 'txn-3', label: 'Wallet top-up — MTN MoMo', amount: '+UGX 200,000', timestamp: '3d ago', type: 'credit' },
    { id: 'txn-4', label: 'Fantasy league entry — Classic League', amount: '-UGX 20,000', timestamp: '4d ago', type: 'debit' },
    { id: 'txn-5', label: 'Wallet top-up — Airtel Money', amount: '+UGX 150,000', timestamp: '6d ago', type: 'credit' },
    { id: 'txn-6', label: 'Market stake — Kobs Rugby win', amount: '-UGX 30,000', timestamp: '1w ago', type: 'debit' },
  ],
};

export async function fetchWalletDetails(): Promise<WalletDetails> {
  return delay({ ...WALLET_DETAILS, transactions: [...WALLET_DETAILS.transactions] });
}

/** Credits a winning market position's payout — called when a Referee
 * finalises a market result (see resultVerificationService.finalizeResult). */
export function recordMarketPayout(marketLabel: string, amountUgx: number): void {
  if (amountUgx <= 0) return;

  WALLET_DETAILS.balance = formatUGX(parseUGX(WALLET_DETAILS.balance) + amountUgx);
  WALLET_DETAILS.transactions = [
    {
      id: `payout-${Date.now().toString(36)}`,
      label: `${marketLabel} — Market win`,
      amount: `+${formatUGX(amountUgx)}`,
      timestamp: 'Just now',
      type: 'credit',
    },
    ...WALLET_DETAILS.transactions,
  ];
}

export function recordDepositTransaction(record: DepositRecord): void {
  if (record.status !== 'success') return;

  const methodLabel = DEPOSIT_METHODS.find((option) => option.id === record.details.method)?.label ?? record.details.method;

  WALLET_DETAILS.balance = formatUGX(parseUGX(WALLET_DETAILS.balance) + record.details.amount);
  WALLET_DETAILS.transactions = [
    {
      id: record.txRef,
      label: `Wallet top-up — ${methodLabel}`,
      amount: `+${formatUGX(record.details.amount)}`,
      timestamp: 'Just now',
      type: 'credit',
    },
    ...WALLET_DETAILS.transactions,
  ];
}
