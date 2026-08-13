import { useState } from 'react';
import { FiDownload, FiTruck, FiPackage } from 'react-icons/fi';
import ClubAdminLayout from '../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../store/clubWorkspaceStore';
import { useAuthStore } from '../../store/authStore';
import { DEMO_ENTITLEMENTS } from '../../components/clubadmin/clubAdminData';
import { useCartStore } from '../../store/cartStore';
import '../../components/clubadmin/ClubAdminLayout.css';

// Map clubSlug → club admin scope_id via the registry
import { CLUB_REGISTRY } from '../../components/clubadmin/clubAdminData';

type FulfilmentStatus = 'pending' | 'shipped' | 'delivered';

const STATUS_CLASS: Record<FulfilmentStatus, string> = {
  pending: 'ca-pill-orange',
  shipped: 'ca-pill-blue',
  delivered: 'ca-pill-green',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  a.click();
}

/** Derive a slug-like string from a club registry entry name, e.g. "KCCA FC" → "kcca-fc" */
function nameToSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function ClubOrdersPage() {
  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();

  // Resolve the current club scope
  const rawEntitlements = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const entitlements = rawEntitlements.length > 0 ? rawEntitlements : DEMO_ENTITLEMENTS;
  const current = entitlements.find(e => e.id === selectedEntitlementId) ?? entitlements[0] ?? null;
  const scopeId = current?.scope_id ?? 1;
  const clubInfo = CLUB_REGISTRY[scopeId] ?? { name: `Club #${scopeId}`, league: '', season: '', badge: '' };
  const currentClubSlug = nameToSlug(clubInfo.name);

  // Pull cart items that belong to this club and treat them as "pending" orders
  const cartItems = useCartStore(s => s.items);
  const removeItem = useCartStore(s => s.removeItem);

  // Fulfilment status overlay — lives in local state (would be API-backed in prod)
  const [statuses, setStatuses] = useState<Record<string, FulfilmentStatus>>({});
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const clubOrders = cartItems.filter(item => item.clubSlug === currentClubSlug);

  const getStatus = (id: string): FulfilmentStatus => statuses[id] ?? 'pending';

  const markShipped = (id: string) => {
    setStatuses(s => ({ ...s, [id]: 'shipped' }));
    showToast(`Order marked as shipped`);
  };

  const markDelivered = (id: string) => {
    setStatuses(s => ({ ...s, [id]: 'delivered' }));
    showToast(`Order marked as delivered`);
  };

  const exportRows = clubOrders.map(o => ({
    item: o.name,
    size: o.size ?? '—',
    qty: o.qty,
    amount: o.price,
    status: getStatus(o.id),
  }));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">Club Admin</p>
          <h1 className="ca-page-title">Orders</h1>
          <p className="ca-page-subtitle">Track and manage all store orders, fulfilment and delivery status.</p>
        </div>
        <div className="ca-page-actions">
          <button
            type="button"
            className="ca-btn ca-btn-secondary"
            disabled={clubOrders.length === 0}
            onClick={() => exportCSV(exportRows as unknown as Record<string, unknown>[], 'orders.csv')}
          >
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="ca-panel">
        <div className="ca-panel-header">
          <h2 className="ca-panel-title">All Orders</h2>
          <span className="ca-panel-count">{clubOrders.length} orders</span>
        </div>

        {clubOrders.length === 0 ? (
          <div className="ca-empty-state">
            <FiPackage className="ca-empty-icon" />
            <p className="ca-empty-title">No orders yet</p>
            <p className="ca-empty-sub">
              Orders from your store will appear here once customers start purchasing.
            </p>
          </div>
        ) : (
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {clubOrders.map((o) => {
                  const status = getStatus(o.id);
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{o.name}</td>
                      <td>{o.size ?? '—'}</td>
                      <td>{o.qty}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{o.price}</td>
                      <td>
                        <span className={`ca-pill ${STATUS_CLASS[status]}`}>{status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {status === 'pending' && (
                            <button
                              type="button"
                              className="ca-btn ca-btn-secondary ca-btn-sm"
                              onClick={() => markShipped(o.id)}
                            >
                              <FiTruck /> Mark Shipped
                            </button>
                          )}
                          {status === 'shipped' && (
                            <button
                              type="button"
                              className="ca-btn ca-btn-secondary ca-btn-sm"
                              onClick={() => markDelivered(o.id)}
                            >
                              Mark Delivered
                            </button>
                          )}
                          {status === 'delivered' && (
                            <button
                              type="button"
                              className="ca-btn ca-btn-secondary ca-btn-sm"
                              style={{ color: '#ef4444' }}
                              onClick={() => { removeItem(o.id); showToast('Order removed'); }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ClubAdminLayout>
  );
}
