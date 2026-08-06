import { useEffect, useState } from 'react';
import { FiActivity, FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiX } from 'react-icons/fi';
import {
  cancelDeletion,
  fetchAccountStatus,
  reactivateAccount,
  requestDeactivation,
  requestDeletion,
  type AccountStatus,
} from '../../../../services/accountService';
import './AccountTab.css';

type PendingAction = 'deactivate' | 'delete';

const ACTION_COPY: Record<PendingAction, { title: string; body: string; confirmLabel: string }> = {
  deactivate: {
    title: 'Deactivate your account?',
    body: 'Your profile will be hidden and you\'ll be signed out. You can reactivate any time by logging back in.',
    confirmLabel: 'Deactivate account',
  },
  delete: {
    title: 'Delete your account?',
    body: 'Your account will be scheduled for deletion. You can still cancel this from this page before it\'s final.',
    confirmLabel: 'Request deletion',
  },
};

function statusPillClass(status: AccountStatus): string {
  switch (status) {
    case 'Active':
      return 'account-status-pill account-status-pill--active';
    case 'Deactivated':
      return 'account-status-pill account-status-pill--deactivated';
    case 'Pending Deletion':
      return 'account-status-pill account-status-pill--pending';
  }
}

function ConfirmModal({
  action,
  onClose,
  onConfirm,
}: {
  action: PendingAction;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const copy = ACTION_COPY[action];

  return (
    <div className="account-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="account-modal" onClick={(event) => event.stopPropagation()}>
        <div className="account-modal__header">
          <span className="account-modal__icon">
            <FiAlertTriangle aria-hidden="true" />
          </span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.body}</p>
          </div>
          <button type="button" className="account-modal__close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>
        <div className="account-modal__footer">
          <button type="button" className="settings-btn settings-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="settings-btn settings-btn--danger" onClick={onConfirm}>
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  const [status, setStatus] = useState<AccountStatus>('Active');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccountStatus()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = async (action: () => Promise<AccountStatus>, successMessage: string) => {
    setIsBusy(true);
    setBanner(null);
    try {
      const nextStatus = await action();
      setStatus(nextStatus);
      setBanner({ tone: 'success', message: successMessage });
    } catch {
      setBanner({ tone: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setIsBusy(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-panel-heading">Account</h2>
      <p className="settings-panel-subtext">Control the status of your League OS account.</p>

      {banner && (
        <div className={`settings-banner settings-banner--${banner.tone}`} role="status">
          {banner.tone === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {banner.message}
        </div>
      )}

      {isLoading ? (
        <div className="settings-loading">
          <FiActivity className="settings-loading__icon" aria-hidden="true" />
          Loading account status…
        </div>
      ) : (
        <>
          <div className="account-status-row">
            <span>Current status</span>
            <span className={statusPillClass(status)}>{status}</span>
          </div>

          {status === 'Active' && (
            <div className="account-actions">
              <button
                type="button"
                className="settings-btn settings-btn--outline"
                onClick={() => setPendingAction('deactivate')}
                disabled={isBusy}
              >
                Deactivate account
              </button>
              <button
                type="button"
                className="settings-btn settings-btn--danger"
                onClick={() => setPendingAction('delete')}
                disabled={isBusy}
              >
                Delete account
              </button>
            </div>
          )}

          {status === 'Deactivated' && (
            <div className="account-actions">
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={() => runAction(reactivateAccount, 'Your account has been reactivated.')}
                disabled={isBusy}
              >
                Reactivate account
              </button>
            </div>
          )}

          {status === 'Pending Deletion' && (
            <div className="account-actions">
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={() => runAction(cancelDeletion, 'Account deletion has been cancelled.')}
                disabled={isBusy}
              >
                Cancel deletion
              </button>
            </div>
          )}
        </>
      )}

      {pendingAction && (
        <ConfirmModal
          action={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={() =>
            runAction(
              pendingAction === 'deactivate' ? requestDeactivation : requestDeletion,
              pendingAction === 'deactivate' ? 'Your account has been deactivated.' : 'Account deletion requested.',
            )
          }
        />
      )}
    </div>
  );
}

export default AccountTab;
