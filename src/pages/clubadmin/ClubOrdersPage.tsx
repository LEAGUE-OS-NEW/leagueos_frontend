import { useState } from 'react';
import { FiDownload, FiTruck } from 'react-icons/fi';
import ClubAdminLayout from '../../components/clubadmin/ClubAdminLayout';
import '../../components/clubadmin/ClubAdminLayout.css';

type Order = { id: string; item: string; buyer: string; amt: string; date: string; status: 'pending' | 'shipped' | 'delivered' };

const INIT: Order[] = [
  { id: '#ORD-4821', item: 'Home Jersey (XL)',  buyer: 'Brian Ssempa',  amt: 'UGX 120,000', date: '10 May 2026', status: 'pending' },
  { id: '#ORD-4820', item: 'Training Kit (M)',  buyer: 'Grace Nakirya', amt: 'UGX 75,000',  date: '10 May 2026', status: 'pending' },
  { id: '#ORD-4819', item: 'Scarf x2',          buyer: 'David Kato',   amt: 'UGX 50,000',  date: '9 May 2026',  status: 'shipped' },
  { id: '#ORD-4818', item: 'Away Jersey (S)',    buyer: 'Joan Nassanga', amt: 'UGX 120,000', date: '9 May 2026',  status: 'shipped' },
  { id: '#ORD-4817', item: 'KCCA FC Mug',        buyer: 'Moses Onen',   amt: 'UGX 18,000',  date: '8 May 2026',  status: 'delivered' },
  { id: '#ORD-4816', item: 'Cap + Scarf bundle', buyer: 'Ruth Akello',  amt: 'UGX 47,000',  date: '7 May 2026',  status: 'delivered' },
];

const STATUS_CLASS: Record<string, string> = {
  pending: 'ca-pill-orange', shipped: 'ca-pill-blue', delivered: 'ca-pill-green',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

export default function ClubOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(INIT);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const markShipped = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped' } : o));
    showToast(`Order ${id} marked as shipped`);
  };

  const markDelivered = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'delivered' } : o));
    showToast(`Order ${id} marked as delivered`);
  };

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
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(orders as unknown as Record<string, unknown>[], 'orders.csv')}>
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="ca-panel">
        <div className="ca-panel-header">
          <h2 className="ca-panel-title">All Orders</h2>
          <span className="ca-panel-count">{orders.length} orders</span>
        </div>
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr><th>Order ID</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{o.id}</td>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{o.item}</td>
                  <td>{o.buyer}</td>
                  <td>{o.amt}</td>
                  <td>{o.date}</td>
                  <td><span className={`ca-pill ${STATUS_CLASS[o.status]}`}>{o.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status === 'pending' && (
                        <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => markShipped(o.id)}>
                          <FiTruck /> Mark Shipped
                        </button>
                      )}
                      {o.status === 'shipped' && (
                        <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => markDelivered(o.id)}>
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
