import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  FiArrowLeft,
  FiCheckCircle,
  FiX,
} from 'react-icons/fi';

import {
  createFanWalletWithdrawal,
  type FanWalletWithdrawal,
  type FanWalletWithdrawalNetwork,
} from '../../../../services/fanWalletApiService';

import './DepositModal.css';


type Step =
  | 'destination'
  | 'amount'
  | 'review'
  | 'submitted';


type WithdrawModalProps = {
  availableBalance: number;
  onClose: () => void;
  onSubmitted: (
    withdrawal: FanWalletWithdrawal,
  ) => void;
};


const QUICK_AMOUNTS = [
  10_000,
  50_000,
  100_000,
  200_000,
];


function generateIdempotencyKey(): string {
  if (
    typeof globalThis.crypto !==
      'undefined' &&
    globalThis.crypto.randomUUID
  ) {
    return globalThis.crypto.randomUUID();
  }

  const timestamp =
    Date.now()
      .toString(16)
      .padStart(12, '0')
      .slice(-12);

  return `00000000-0000-4000-8000-${timestamp}`;
}


function formatUgx(
  value: number,
): string {
  return `UGX ${Math.round(
    value,
  ).toLocaleString(
    'en-UG',
  )}`;
}


function normalizedPhone(
  value: string,
): string {
  return value
    .replaceAll(' ', '')
    .replaceAll('-', '');
}


function isValidUgandanMobile(
  value: string,
): boolean {
  return /^(?:\+256|256|0)7\d{8}$/.test(
    normalizedPhone(
      value,
    ),
  );
}


function WithdrawModal({
  availableBalance,
  onClose,
  onSubmitted,
}: WithdrawModalProps) {
  const [
    step,
    setStep,
  ] =
    useState<Step>(
      'destination',
    );

  const [
    network,
    setNetwork,
  ] =
    useState<FanWalletWithdrawalNetwork>(
      'MTN',
    );

  const [
    phoneNumber,
    setPhoneNumber,
  ] =
    useState(
      '',
    );

  const [
    accountName,
    setAccountName,
  ] =
    useState(
      '',
    );

  const [
    amount,
    setAmount,
  ] =
    useState(
      '',
    );

  const [
    formError,
    setFormError,
  ] =
    useState(
      '',
    );

  const [
    submitError,
    setSubmitError,
  ] =
    useState(
      '',
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    submittedWithdrawal,
    setSubmittedWithdrawal,
  ] =
    useState<FanWalletWithdrawal | null>(
      null,
    );

  const idempotencyKeyRef =
    useRef(
      generateIdempotencyKey(),
    );

  const closeButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );


  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);


  useEffect(() => {
    document.body.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        '';
    };
  }, []);


  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
          'Escape' &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    isSubmitting,
    onClose,
  ]);


  const numericAmount =
    Number(
      amount,
    );


  function validateDestination(): boolean {
    const name =
      accountName.trim();

    if (
      name.length <
      2
    ) {
      setFormError(
        'Enter the Mobile Money account holder name.',
      );

      return false;
    }

    if (
      !isValidUgandanMobile(
        phoneNumber,
      )
    ) {
      setFormError(
        'Enter a valid Uganda Mobile Money number, for example 0777123456.',
      );

      return false;
    }

    setFormError(
      '',
    );

    return true;
  }


  function validateAmount(): boolean {
    if (
      !amount ||
      Number.isNaN(
        numericAmount,
      ) ||
      numericAmount <=
        0
    ) {
      setFormError(
        'Enter a withdrawal amount greater than zero.',
      );

      return false;
    }

    if (
      numericAmount >
      availableBalance
    ) {
      setFormError(
        `Your available balance is ${formatUgx(
          availableBalance,
        )}.`,
      );

      return false;
    }

    setFormError(
      '',
    );

    return true;
  }


  async function submitWithdrawal() {
    if (
      isSubmitting
    ) {
      return;
    }

    setSubmitError(
      '',
    );

    setIsSubmitting(
      true,
    );

    try {
      const withdrawal =
        await createFanWalletWithdrawal({
          amount:
            numericAmount,
          currency:
            'UGX',
          network,
          phoneNumber:
            normalizedPhone(
              phoneNumber,
            ),
          accountName:
            accountName.trim(),
          idempotencyKey:
            idempotencyKeyRef.current,
        });

      setSubmittedWithdrawal(
        withdrawal,
      );

      setStep(
        'submitted',
      );

      onSubmitted(
        withdrawal,
      );
    } catch (
      error
    ) {
      setSubmitError(
        error instanceof
        Error
          ? error.message
          : 'Could not submit the withdrawal request.',
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  const canGoBack =
    step ===
      'amount' ||
    step ===
      'review';


  return (
    <>
      <div
        className="deposit-modal-backdrop"
        aria-hidden="true"
        onClick={() => {
          if (
            !isSubmitting
          ) {
            onClose();
          }
        }}
      />

      <section
        className="deposit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-modal-title"
      >
        <div className="deposit-modal-header">
          {canGoBack ? (
            <button
              type="button"
              className="deposit-modal-back"
              aria-label="Go back"
              onClick={() => {
                setFormError(
                  '',
                );

                setSubmitError(
                  '',
                );

                setStep(
                  step ===
                    'review'
                    ? 'amount'
                    : 'destination',
                );
              }}
            >
              <FiArrowLeft />
            </button>
          ) : (
            <span
              aria-hidden="true"
              style={{
                width:
                  34,
              }}
            />
          )}

          <h3 id="withdraw-modal-title">
            {step ===
            'submitted'
              ? 'Withdrawal submitted'
              : 'Withdraw from wallet'}
          </h3>

          <button
            type="button"
            className="deposit-modal-close"
            aria-label="Close withdrawal"
            ref={
              closeButtonRef
            }
            disabled={
              isSubmitting
            }
            onClick={
              onClose
            }
          >
            <FiX />
          </button>
        </div>

        <div className="deposit-modal-body">
          {step ===
            'destination' && (
            <div className="deposit-form">
              <p className="deposit-instructions">
                Withdraw to a Uganda Mobile Money account.
                Payouts are reviewed by the Finance team
                before funds are released.
              </p>

              <label className="deposit-field">
                Mobile Money network

                <select
                  value={
                    network
                  }
                  onChange={(
                    event,
                  ) => {
                    setNetwork(
                      event
                        .target
                        .value as FanWalletWithdrawalNetwork,
                    );

                    setFormError(
                      '',
                    );
                  }}
                >
                  <option value="MTN">
                    MTN Mobile Money
                  </option>

                  <option value="AIRTEL">
                    Airtel Money
                  </option>
                </select>
              </label>

              <label className="deposit-field">
                Mobile Money number

                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0777123456"
                  value={
                    phoneNumber
                  }
                  onChange={(
                    event,
                  ) => {
                    setPhoneNumber(
                      event
                        .target
                        .value,
                    );

                    setFormError(
                      '',
                    );
                  }}
                />
              </label>

              <label className="deposit-field">
                Account holder name

                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Name registered on Mobile Money"
                  value={
                    accountName
                  }
                  onChange={(
                    event,
                  ) => {
                    setAccountName(
                      event
                        .target
                        .value,
                    );

                    setFormError(
                      '',
                    );
                  }}
                />
              </label>

              {formError && (
                <p
                  className="deposit-error"
                  role="alert"
                >
                  {
                    formError
                  }
                </p>
              )}
            </div>
          )}

          {step ===
            'amount' && (
            <div className="deposit-form">
              <p className="deposit-selected-method">
                Available balance:{' '}
                <strong>
                  {formatUgx(
                    availableBalance,
                  )}
                </strong>
              </p>

              <label className="deposit-field">
                Amount to withdraw

                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="50000"
                  value={
                    amount
                  }
                  onChange={(
                    event,
                  ) => {
                    setAmount(
                      event
                        .target
                        .value,
                    );

                    setFormError(
                      '',
                    );
                  }}
                />
              </label>

              <div className="deposit-quick-amounts">
                {QUICK_AMOUNTS
                  .filter(
                    (
                      quickAmount,
                    ) =>
                      quickAmount <=
                      availableBalance,
                  )
                  .map(
                    (
                      quickAmount,
                    ) => (
                      <button
                        type="button"
                        key={
                          quickAmount
                        }
                        onClick={() => {
                          setAmount(
                            String(
                              quickAmount,
                            ),
                          );

                          setFormError(
                            '',
                          );
                        }}
                      >
                        {formatUgx(
                          quickAmount,
                        )}
                      </button>
                    ),
                  )}
              </div>

              {formError && (
                <p
                  className="deposit-error"
                  role="alert"
                >
                  {
                    formError
                  }
                </p>
              )}
            </div>
          )}

          {step ===
            'review' && (
            <div className="deposit-review">
              <dl>
                <div>
                  <dt>
                    Amount
                  </dt>

                  <dd>
                    {formatUgx(
                      numericAmount,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Network
                  </dt>

                  <dd>
                    {
                      network ===
                      'MTN'
                        ? 'MTN Mobile Money'
                        : 'Airtel Money'
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Mobile number
                  </dt>

                  <dd>
                    {normalizedPhone(
                      phoneNumber,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Account name
                  </dt>

                  <dd>
                    {accountName.trim()}
                  </dd>
                </div>

                <div>
                  <dt>
                    Balance after reservation
                  </dt>

                  <dd>
                    {formatUgx(
                      availableBalance -
                        numericAmount,
                    )}
                  </dd>
                </div>
              </dl>

              <p className="deposit-instructions">
                When submitted, this amount will be moved
                from your available balance into reserved
                funds while the withdrawal is reviewed.
              </p>

              {submitError && (
                <p
                  className="deposit-error"
                  role="alert"
                >
                  {
                    submitError
                  }
                </p>
              )}
            </div>
          )}

          {step ===
            'submitted' &&
            submittedWithdrawal && (
            <div className="deposit-result">
              <span className="deposit-result-icon success">
                <FiCheckCircle />
              </span>

              <p className="deposit-result-title">
                Withdrawal request submitted
              </p>

              <p className="deposit-instructions">
                {formatUgx(
                  submittedWithdrawal.amount,
                )}{' '}
                has been reserved while the Finance team
                reviews your payout request.
              </p>

              <div className="deposit-reference">
                <span>
                  Status
                </span>

                <div>
                  <code>
                    {
                      submittedWithdrawal.status
                    }
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="deposit-modal-footer">
          {step ===
            'destination' && (
            <>
              <button
                type="button"
                className="deposit-btn deposit-btn--ghost"
                onClick={
                  onClose
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="deposit-btn deposit-btn--primary"
                onClick={() => {
                  if (
                    validateDestination()
                  ) {
                    setStep(
                      'amount',
                    );
                  }
                }}
              >
                Continue
              </button>
            </>
          )}

          {step ===
            'amount' && (
            <button
              type="button"
              className="deposit-btn deposit-btn--primary"
              onClick={() => {
                if (
                  validateAmount()
                ) {
                  setStep(
                    'review',
                  );
                }
              }}
            >
              Review withdrawal
            </button>
          )}

          {step ===
            'review' && (
            <button
              type="button"
              className="deposit-btn deposit-btn--primary"
              disabled={
                isSubmitting
              }
              onClick={() => {
                void submitWithdrawal();
              }}
            >
              {isSubmitting
                ? 'Submitting…'
                : 'Submit withdrawal'}
            </button>
          )}

          {step ===
            'submitted' && (
            <button
              type="button"
              className="deposit-btn deposit-btn--primary"
              onClick={
                onClose
              }
            >
              Done
            </button>
          )}
        </div>
      </section>
    </>
  );
}


export default WithdrawModal;
