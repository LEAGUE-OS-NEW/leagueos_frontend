import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  FiDownload,
  FiPackage,
  FiRefreshCw,
} from 'react-icons/fi';

import ClubAdminLayout from '../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../store/clubWorkspaceStore';
import { useAuthStore } from '../../store/authStore';
import {
  getClubAdminEntitlements,
  getSelectedClubAdminEntitlement,
  getSelectedClubId,
} from '../../utils/clubAdminAccess';
import {
  fetchClubStoreOrders,
  type ClubStoreOrder,
} from '../../services/clubStoreService';

import '../../components/clubadmin/ClubAdminLayout.css';

const STATUS_CLASS: Record<
  ClubStoreOrder['status'],
  string
> = {
  PENDING: 'ca-pill-orange',
  PAID: 'ca-pill-blue',
  PROCESSING: 'ca-pill-blue',
  FULFILLED: 'ca-pill-green',
  CANCELLED: 'ca-pill-red',
  REFUNDED: 'ca-pill-red',
};

function formatMoney(
  value: string,
  currency: string,
) {
  const amount = Number(value);

  return `${currency || 'UGX'} ${
    Number.isFinite(amount)
      ? Math.round(amount).toLocaleString('en-UG')
      : '0'
  }`;
}

function formatAddress(
  address: Record<string, unknown>,
) {
  const values = Object.values(
    address ?? {},
  ).filter(
    value =>
      typeof value === 'string' &&
      value.trim(),
  );

  return values.length > 0
    ? values.join(', ')
    : '—';
}

function exportCSV(
  rows: Record<string, unknown>[],
  filename: string,
) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(
          header =>
            `"${String(
              row[header] ?? '',
            ).replaceAll('"', '""')}"`,
        )
        .join(','),
    ),
  ].join('\n');

  const href = URL.createObjectURL(
    new Blob(
      [csv],
      {
        type: 'text/csv',
      },
    ),
  );

  const link = Object.assign(
    document.createElement('a'),
    {
      href,
      download: filename,
    },
  );

  link.click();

  URL.revokeObjectURL(href);
}

export default function ClubOrdersPage() {
  const user = useAuthStore(
    state => state.user,
  );

  const {
    selectedEntitlementId,
  } = useClubWorkspaceStore();

  const entitlements = getClubAdminEntitlements(user);

  const current = getSelectedClubAdminEntitlement(
    entitlements,
    selectedEntitlementId,
  );

  const clubId = getSelectedClubId(
    current,
    user,
  );

  const [
    orders,
    setOrders,
  ] = useState<ClubStoreOrder[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const loadOrders = useCallback(
    async () => {
      if (!clubId) {
        setOrders([]);
        setError(
          'No Club Admin workspace is selected.',
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        setOrders(
          await fetchClubStoreOrders(
            clubId,
          ),
        );
      } catch (loadError) {
        setOrders([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load store orders.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [clubId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOrders]);

  const exportRows = orders.map(
    order => ({
      order_id: order.id,
      customer: order.user,
      amount: order.total_amount,
      currency: order.currency,
      status: order.status,
      delivery_address:
        formatAddress(
          order.shipping_address,
        ),
    }),
  );

  return (
    <ClubAdminLayout>
      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">
            Club Admin
          </p>

          <h1 className="ca-page-title">
            Orders
          </h1>

          <p className="ca-page-subtitle">
            Track real merchandise orders
            recorded for the selected club.
          </p>
        </div>

        <div className="ca-page-actions">
          <button
            type="button"
            className="ca-btn ca-btn-secondary"
            disabled={
              orders.length === 0
            }
            onClick={() =>
              exportCSV(
                exportRows,
                'orders.csv',
              )
            }
          >
            <FiDownload /> Export
          </button>

          <button
            type="button"
            className="ca-btn ca-btn-secondary"
            onClick={() =>
              void loadOrders()
            }
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="ca-panel">
        <div className="ca-panel-header">
          <h2 className="ca-panel-title">
            All Orders
          </h2>

          <span className="ca-panel-count">
            {orders.length} orders
          </span>
        </div>

        {isLoading ? (
          <div className="ca-empty-state">
            <FiRefreshCw className="ca-empty-icon" />

            <p className="ca-empty-title">
              Loading orders…
            </p>
          </div>
        ) : error ? (
          <div className="ca-empty-state">
            <FiPackage className="ca-empty-icon" />

            <p className="ca-empty-title">
              Could not load orders
            </p>

            <p className="ca-empty-sub">
              {error}
            </p>

            <button
              type="button"
              className="ca-btn ca-btn-secondary"
              onClick={() =>
                void loadOrders()
              }
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="ca-empty-state">
            <FiPackage className="ca-empty-icon" />

            <p className="ca-empty-title">
              No orders yet
            </p>

            <p className="ca-empty-sub">
              Completed customer store
              purchases will appear here.
            </p>
          </div>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td
                      style={{
                        fontFamily:
                          'monospace',
                        fontWeight: 700,
                      }}
                    >
                      {order.id.slice(
                        0,
                        8,
                      )}
                    </td>

                    <td>
                      {String(
                        order.user,
                      ).slice(
                        0,
                        8,
                      )}
                    </td>

                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          'var(--color-primary-light)',
                      }}
                    >
                      {formatMoney(
                        order.total_amount,
                        order.currency,
                      )}
                    </td>

                    <td>
                      {formatAddress(
                        order.shipping_address,
                      )}
                    </td>

                    <td>
                      <span
                        className={`ca-pill ${
                          STATUS_CLASS[
                            order.status
                          ]
                        }`}
                      >
                        {
                          order.status
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ClubAdminLayout>
  );
}
