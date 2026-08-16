import {
  useState,
} from 'react';

import AdminLayout from '../../../components/admin/AdminLayout';

import FinanceWithdrawalQueue from './FinanceWithdrawalQueue';

import './FinanceAdmin.css';


const WITHDRAWAL_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'FAILED',
] as const;


function PayoutsPage() {
  const [
    search,
    setSearch,
  ] = useState(
    '',
  );

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    'all',
  );


  return (
    <AdminLayout>
      <div className="fa-content">
        <header className="fa-header">
          <div>
            <h1 className="fa-header__title">
              Wallet Payouts
            </h1>

            <p className="fa-header__subtitle">
              Review and process real fan wallet withdrawal requests.
            </p>
          </div>

          <div className="fa-header__meta">
            <span className="fa-header__badge">
              Manual Mobile Money payouts
            </span>
          </div>
        </header>


        <section className="fa-panel">
          <div className="fa-panel__header">
            <div>
              <h2>
                Withdrawal Requests
              </h2>

              <p className="fa-panel__note">
                Funds remain reserved while requests are reviewed.
                Approve a request before starting payout processing.
              </p>
            </div>
          </div>


          <div className="fa-filters">
            <input
              className="fa-filters__search"
              type="search"
              aria-label="Search withdrawal requests"
              placeholder="Search by request ID, fan, Mobile Money number or payout reference..."
              value={
                search
              }
              onChange={(
                event,
              ) => {
                setSearch(
                  event.target.value,
                );
              }}
            />

            <select
              className="fa-filters__select"
              aria-label="Filter withdrawal status"
              value={
                statusFilter
              }
              onChange={(
                event,
              ) => {
                setStatusFilter(
                  event.target.value,
                );
              }}
            >
              <option value="all">
                All statuses
              </option>

              {WITHDRAWAL_STATUSES.map(
                (
                  status,
                ) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {status
                      .replaceAll(
                        '_',
                        ' ',
                      )
                      .toLowerCase()
                      .replace(
                        /^\w/,
                        (
                          value,
                        ) =>
                          value.toUpperCase(),
                      )}
                  </option>
                ),
              )}
            </select>
          </div>


          <div className="fa-table-wrap">
            <FinanceWithdrawalQueue
              search={
                search
              }
              statusFilter={
                statusFilter
              }
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}


export default PayoutsPage;
