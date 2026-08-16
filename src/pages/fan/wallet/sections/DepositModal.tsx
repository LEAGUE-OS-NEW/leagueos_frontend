import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  FiArrowLeft,
  FiClock,
  FiLock,
  FiX,
} from 'react-icons/fi';

import {
  createFanWalletDeposit,
} from '../../../../services/fanWalletApiService';

import './DepositModal.css';


type Step =
  | 'amount'
  | 'review'
  | 'redirecting';


type DepositModalProps = {
  onClose: () => void;
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


function DepositModal({
  onClose,
}: DepositModalProps) {
  const [
    step,
    setStep,
  ] =
    useState<Step>(
      'amount',
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
    confirmOwner,
    setConfirmOwner,
  ] =
    useState(
      false,
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
        'Enter an amount greater than UGX 0.',
      );

      return false;
    }

    setFormError(
      '',
    );

    return true;
  }


  async function handleSubmitDeposit() {
    if (
      !validateAmount()
    ) {
      setStep(
        'amount',
      );

      return;
    }

    if (
      !confirmOwner
    ) {
      setSubmitError(
        'Please confirm that you authorize this wallet top-up.',
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    setSubmitError(
      '',
    );

    try {
      const deposit =
        await createFanWalletDeposit(
          {
            amount:
              numericAmount,
            currency:
              'UGX',
            idempotencyKey:
              idempotencyKeyRef.current,
          },
        );

      if (
        !deposit.paymentUrl
      ) {
        throw new Error(
          'Pesapal did not return a checkout URL for this deposit.',
        );
      }

      try {
        sessionStorage.setItem(
          'leagueos.wallet.pendingDepositId',
          deposit.id,
        );

      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
        // The backend callback still remains authoritative.
      }

      setStep(
        'redirecting',
      );

      window.location.assign(
        deposit.paymentUrl,
      );
    } catch (
      error
    ) {
      setSubmitError(
        error instanceof
          Error
          ? error.message
          : 'Could not start the deposit. Please try again.',
      );

      setStep(
        'review',
      );

      setIsSubmitting(
        false,
      );
    }
  }


  return (
    <>
      <div
        className="deposit-modal-backdrop"
        onClick={
          isSubmitting
            ? undefined
            : onClose
        }
        aria-hidden="true"
      />

      <div
        className="deposit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Top up wallet"
      >
        <div className="deposit-modal-header">
          {step ===
            'review' && (
            <button
              type="button"
              className="deposit-modal-back"
              aria-label="Back"
              disabled={
                isSubmitting
              }
              onClick={() =>
                setStep(
                  'amount',
                )
              }
            >
              <FiArrowLeft />
            </button>
          )}

          <h3>
            {step ===
              'amount' &&
              'Top up your wallet'}

            {step ===
              'review' &&
              'Review your top-up'}

            {step ===
              'redirecting' &&
              'Opening Pesapal'}
          </h3>

          <button
            type="button"
            ref={
              closeButtonRef
            }
            className="deposit-modal-close"
            aria-label="Close"
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
            'amount' && (
            <div className="deposit-form">
              <p className="deposit-selected-method">
                Your payment will be securely
                completed through{' '}
                <strong>
                  Pesapal
                </strong>
                .
              </p>

              <label className="deposit-field">
                Amount (UGX)

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    amount
                  }
                  onChange={(
                    event,
                  ) => {
                    setAmount(
                      event.target.value.replace(
                        /[^\d]/g,
                        '',
                      ),
                    );

                    setFormError(
                      '',
                    );
                  }}
                  placeholder="e.g. 50000"
                  autoFocus
                />
              </label>

              <div className="deposit-quick-amounts">
                {QUICK_AMOUNTS.map(
                  (
                    value,
                  ) => (
                    <button
                      type="button"
                      key={
                        value
                      }
                      onClick={() =>
                        setAmount(
                          String(
                            value,
                          ),
                        )
                      }
                    >
                      UGX{' '}
                      {value.toLocaleString(
                        'en-UG',
                      )}
                    </button>
                  ),
                )}
              </div>

              <p className="deposit-selected-method">
                After review, League OS will open the
                Pesapal checkout page where you can
                complete the payment.
              </p>

              {formError && (
                <p className="deposit-error">
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
                    UGX{' '}
                    {numericAmount.toLocaleString(
                      'en-UG',
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Currency
                  </dt>

                  <dd>
                    UGX
                  </dd>
                </div>

                <div>
                  <dt>
                    Payment provider
                  </dt>

                  <dd>
                    Pesapal
                  </dd>
                </div>
              </dl>

              <label className="deposit-field deposit-field--checkbox">
                <input
                  type="checkbox"
                  checked={
                    confirmOwner
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmOwner(
                      event.target.checked,
                    )
                  }
                />

                I confirm that I authorize this
                wallet top-up.
              </label>

              <p className="deposit-selected-method">
                <FiLock
                  aria-hidden="true"
                />{' '}
                League OS does not ask you to enter
                your payment PIN on this screen.
              </p>

              {submitError && (
                <p className="deposit-error">
                  {
                    submitError
                  }
                </p>
              )}
            </div>
          )}


          {step ===
            'redirecting' && (
            <div className="deposit-pending">
              <span
                className="deposit-pending-spinner"
                aria-hidden="true"
              >
                <FiClock />
              </span>

              <p className="deposit-instructions">
                Your deposit has been created.
                Opening the secure Pesapal checkout
                page…
              </p>

              <p className="deposit-waiting-note">
                Do not close this window while the
                payment page is opening.
              </p>
            </div>
          )}
        </div>


        {step !==
          'redirecting' && (
          <div className="deposit-modal-footer">
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
                Review Top-Up
              </button>
            )}

            {step ===
              'review' && (
              <button
                type="button"
                className="deposit-btn deposit-btn--primary"
                disabled={
                  isSubmitting ||
                  !confirmOwner
                }
                onClick={() =>
                  void handleSubmitDeposit()
                }
              >
                {isSubmitting
                  ? 'Creating deposit…'
                  : 'Continue to Pesapal'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}


export default DepositModal;
