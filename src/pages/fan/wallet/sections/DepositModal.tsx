import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FiX, FiSmartphone, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiCopy, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { GiBank } from 'react-icons/gi';
import {
  DEPOSIT_METHODS,
  BANK_OPTIONS,
  MIN_DEPOSIT,
  MAX_DEPOSIT,
  QUICK_AMOUNTS,
  initializeDeposit,
  checkDepositStatus,
  retryDeposit,
  recordDepositTransaction,
} from '../../../../services/walletService';
import type { DepositMethod, DepositRecord } from '../../../../services/walletService';
import './DepositModal.css';

type Step = 'method' | 'amount' | 'review' | 'pending' | 'result';

type DepositModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const METHOD_ICONS: Record<DepositMethod, ReactNode> = {
  mtn: <FiSmartphone />,
  airtel: <FiSmartphone />,
  card: <FiCreditCard />,
  bank: <GiBank />,
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dep-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function DepositModal({ onClose, onSuccess }: DepositModalProps) {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankName, setBankName] = useState(BANK_OPTIONS[0]);
  const [formError, setFormError] = useState('');
  const [record, setRecord] = useState<DepositRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copied, setCopied] = useState(false);

  const idempotencyKeyRef = useRef(generateIdempotencyKey());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (step !== 'pending') return;

    let isCancelled = false;

    const poll = async () => {
      try {
        const updated = await checkDepositStatus(idempotencyKeyRef.current);
        if (isCancelled) return;
        setRecord(updated);
        if (updated.status !== 'pending') {
          if (updated.status === 'success') {
            recordDepositTransaction(updated);
          }
          setStep('result');
        }
      } catch {
        // transient poll failure — the next interval tick retries
      }
    };

    const interval = setInterval(() => void poll(), 1500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [step]);

  const numericAmount = Number(amount);
  const selectedMethod = DEPOSIT_METHODS.find((option) => option.id === method) ?? null;

  function validateAmountStep() {
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Enter an amount to deposit.');
      return false;
    }
    if (numericAmount < MIN_DEPOSIT) {
      setFormError(`Minimum deposit is UGX ${MIN_DEPOSIT.toLocaleString()}.`);
      return false;
    }
    if (numericAmount > MAX_DEPOSIT) {
      setFormError(`Maximum deposit is UGX ${MAX_DEPOSIT.toLocaleString()}.`);
      return false;
    }
    if ((method === 'mtn' || method === 'airtel') && !/^0\d{9}$/.test(phoneNumber)) {
      setFormError('Enter a valid 10-digit phone number starting with 0.');
      return false;
    }
    setFormError('');
    return true;
  }

  async function handleSubmitDeposit() {
    if (!method) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await initializeDeposit(idempotencyKeyRef.current, {
        method,
        amount: numericAmount,
        phoneNumber: method === 'mtn' || method === 'airtel' ? phoneNumber : undefined,
        bankName: method === 'bank' ? bankName : undefined,
      });
      setRecord(result);
      setStep('pending');
    } catch {
      setSubmitError('Could not start this deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetry() {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await retryDeposit(idempotencyKeyRef.current);
      setRecord(result);
      setStep('pending');
    } catch {
      setSubmitError('Could not retry this deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartOver() {
    idempotencyKeyRef.current = generateIdempotencyKey();
    setRecord(null);
    setMethod(null);
    setAmount('');
    setPhoneNumber('');
    setFormError('');
    setSubmitError('');
    setStep('method');
  }

  function handleCopyReference() {
    if (!record) return;
    navigator.clipboard
      ?.writeText(record.txRef)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // clipboard access denied — reference is still visible on screen
      });
  }

  return (
    <>
      <div className="deposit-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="deposit-modal" role="dialog" aria-modal="true" aria-label="Deposit funds">
        <div className="deposit-modal-header">
          {(step === 'amount' || step === 'review') && (
            <button
              type="button"
              className="deposit-modal-back"
              aria-label="Back"
              onClick={() => setStep(step === 'review' ? 'amount' : 'method')}
            >
              <FiArrowLeft />
            </button>
          )}
          <h3>
            {step === 'method' && 'Choose a deposit method'}
            {step === 'amount' && 'Enter amount'}
            {step === 'review' && 'Review your deposit'}
            {step === 'pending' && 'Approval pending'}
            {step === 'result' && (record?.status === 'success' ? 'Deposit successful' : 'Deposit failed')}
          </h3>
          <button type="button" ref={closeButtonRef} className="deposit-modal-close" aria-label="Close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="deposit-modal-body">
          {step === 'method' && (
            <div className="deposit-method-list">
              {DEPOSIT_METHODS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`deposit-method-card${method === option.id ? ' selected' : ''}`}
                  onClick={() => setMethod(option.id)}
                >
                  <span className="deposit-method-icon">{METHOD_ICONS[option.id]}</span>
                  <span className="deposit-method-text">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 'amount' && selectedMethod && (
            <div className="deposit-form">
              <p className="deposit-selected-method">
                Depositing via <strong>{selectedMethod.label}</strong>
              </p>

              <label className="deposit-field">
                Amount (UGX)
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder="e.g. 50000"
                />
              </label>

              <div className="deposit-quick-amounts">
                {QUICK_AMOUNTS.map((value) => (
                  <button type="button" key={value} onClick={() => setAmount(String(value))}>
                    UGX {value.toLocaleString()}
                  </button>
                ))}
              </div>

              {(method === 'mtn' || method === 'airtel') && (
                <label className="deposit-field">
                  Phone number
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0771234567"
                  />
                </label>
              )}

              {method === 'bank' && (
                <label className="deposit-field">
                  Bank
                  <select value={bankName} onChange={(event) => setBankName(event.target.value)}>
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formError && <p className="deposit-error">{formError}</p>}
            </div>
          )}

          {step === 'review' && selectedMethod && (
            <div className="deposit-review">
              <dl>
                <div>
                  <dt>Method</dt>
                  <dd>{selectedMethod.label}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>UGX {numericAmount.toLocaleString()}</dd>
                </div>
                {phoneNumber && (
                  <div>
                    <dt>Phone number</dt>
                    <dd>{phoneNumber}</dd>
                  </div>
                )}
                {method === 'bank' && (
                  <div>
                    <dt>Bank</dt>
                    <dd>{bankName}</dd>
                  </div>
                )}
              </dl>
              {submitError && <p className="deposit-error">{submitError}</p>}
            </div>
          )}

          {step === 'pending' && record && (
            <div className="deposit-pending">
              <span className="deposit-pending-spinner" aria-hidden="true">
                <FiClock />
              </span>
              <p className="deposit-instructions">{record.providerInstructions}</p>
              <div className="deposit-reference">
                <span>Transaction reference</span>
                <div>
                  <code>{record.txRef}</code>
                  <button type="button" onClick={handleCopyReference} aria-label="Copy reference">
                    <FiCopy />
                  </button>
                </div>
                {copied && <p className="deposit-copied-note">Copied</p>}
              </div>
              <p className="deposit-waiting-note">Waiting for confirmation — this updates automatically.</p>
            </div>
          )}

          {step === 'result' && record && (
            <div className="deposit-result">
              {record.status === 'success' ? (
                <>
                  <span className="deposit-result-icon success">
                    <FiCheckCircle />
                  </span>
                  <p className="deposit-result-title">UGX {record.details.amount.toLocaleString()} added to your wallet</p>
                  <p className="deposit-result-ref">Reference: {record.txRef}</p>
                </>
              ) : (
                <>
                  <span className="deposit-result-icon failed">
                    <FiXCircle />
                  </span>
                  <p className="deposit-result-title">{record.failureReason ?? 'This deposit could not be completed.'}</p>
                  <p className="deposit-result-ref">Reference: {record.txRef}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="deposit-modal-footer">
          {step === 'method' && (
            <button type="button" className="deposit-btn deposit-btn--primary" disabled={!method} onClick={() => setStep('amount')}>
              Continue
            </button>
          )}
          {step === 'amount' && (
            <button
              type="button"
              className="deposit-btn deposit-btn--primary"
              onClick={() => {
                if (validateAmountStep()) setStep('review');
              }}
            >
              Continue
            </button>
          )}
          {step === 'review' && (
            <button
              type="button"
              className="deposit-btn deposit-btn--primary"
              disabled={isSubmitting}
              onClick={() => void handleSubmitDeposit()}
            >
              {isSubmitting ? 'Starting deposit…' : 'Confirm Deposit'}
            </button>
          )}
          {step === 'result' && record?.status === 'success' && (
            <button type="button" className="deposit-btn deposit-btn--primary" onClick={onSuccess}>
              Done
            </button>
          )}
          {step === 'result' && record?.status === 'failed' && (
            <>
              <button type="button" className="deposit-btn deposit-btn--ghost" onClick={handleStartOver}>
                Change method
              </button>
              <button
                type="button"
                className="deposit-btn deposit-btn--primary"
                disabled={isSubmitting}
                onClick={() => void handleRetry()}
              >
                <FiRefreshCw /> {isSubmitting ? 'Retrying…' : 'Retry'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default DepositModal;
