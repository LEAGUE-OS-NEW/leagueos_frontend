import { useState } from 'react';
import { FiPlus, FiDownload, FiEdit2, FiAlertTriangle, FiX, FiPackage } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubStorePage.css';

const KPI = [
  { label: 'Total Products',  value: '128',        delta: '14 inactive', up: null },
  { label: 'Active Products', value: '114',        delta: '89%',         up: null },
  { label: 'Pending Orders',  value: '36',         delta: 'to fulfill',  up: null },
  { label: 'Orders/Month',    value: '342',        delta: '+22%',        up: true },
  { label: 'Store Revenue',   value: 'UGX 124.6M', delta: '+18%',        up: true },
];

const CATEGORIES = ['Apparel', 'Fan Gear', 'Training', 'Accessories', 'Other'];
type ProductStatus = 'active' | 'low stock' | 'out of stock';
type Product = { name: string; cat: string; price: string; stock: number; status: ProductStatus };
type Order = { id: string; item: string; buyer: string; amt: string; date: string; fulfilled: boolean };

const INIT_PRODUCTS: Product[] = [
  { name: 'KCCA FC Home Jersey 2025/26', cat: 'Apparel',  price: 'UGX 120,000', stock: 284, status: 'active' },
  { name: 'KCCA FC Training Kit',        cat: 'Apparel',  price: 'UGX 75,000',  stock: 92,  status: 'active' },
  { name: 'KCCA FC Scarf',               cat: 'Fan Gear', price: 'UGX 25,000',  stock: 650, status: 'active' },
  { name: 'KCCA FC Mug',                 cat: 'Fan Gear', price: 'UGX 18,000',  stock: 12,  status: 'low stock' },
  { name: 'KCCA FC Cap',                 cat: 'Fan Gear', price: 'UGX 22,000',  stock: 0,   status: 'out of stock' },
  { name: 'KCCA FC Away Jersey 2025/26', cat: 'Apparel',  price: 'UGX 120,000', stock: 55,  status: 'active' },
];

const INIT_ORDERS: Order[] = [
  { id: '#ORD-4821', item: 'Home Jersey (XL)', buyer: 'Brian Ssempa',  amt: 'UGX 120,000', date: '10 May', fulfilled: false },
  { id: '#ORD-4820', item: 'Training Kit (M)', buyer: 'Grace Nakirya', amt: 'UGX 75,000',  date: '10 May', fulfilled: false },
  { id: '#ORD-4819', item: 'Scarf x2',         buyer: 'David Kato',   amt: 'UGX 50,000',  date: '9 May',  fulfilled: false },
  { id: '#ORD-4818', item: 'Away Jersey (S)',  buyer: 'Joan Nassanga', amt: 'UGX 120,000', date: '9 May',  fulfilled: false },
];

const BESTSELLERS = [
  { name: 'Home Jersey 2025/26', sold: 842 },
  { name: 'Training Kit',        sold: 410 },
  { name: 'KCCA FC Scarf',       sold: 380 },
  { name: 'KCCA FC Cap',         sold: 195 },
];

const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', 'low stock': 'ca-pill-orange', 'out of stock': 'ca-pill-red',
};

function getStatus(stock: number): ProductStatus {
  if (stock === 0) return 'out of stock';
  if (stock < 20) return 'low stock';
  return 'active';
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK_PRODUCT: Product = { name: '', cat: 'Apparel', price: '', stock: 0, status: 'active' };
type ModalKind = null | 'add' | 'edit';

export default function ClubStorePage() {
  const [products, setProducts] = useState<Product[]>(INIT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INIT_ORDERS);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Product>(BLANK_PRODUCT);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof Product) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: k === 'stock' ? Number(e.target.value) : e.target.value }));

  const openAdd = () => { setForm(BLANK_PRODUCT); setEditIdx(null); setModal('add'); };
  const openEdit = (idx: number) => { setForm({ ...products[idx] }); setEditIdx(idx); setModal('edit'); };

  const saveProduct = () => {
    if (!form.name.trim()) return;
    const withStatus = { ...form, status: getStatus(form.stock) };
    if (editIdx !== null) {
      setProducts(prev => prev.map((p, i) => i === editIdx ? withStatus : p));
      showToast('Product updated');
    } else {
      setProducts(prev => [...prev, withStatus]);
      showToast(`${form.name} added to catalog`);
    }
    setModal(null);
  };

  const fulfilOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, fulfilled: true } : o));
    showToast(`Order ${id} fulfilled`);
  };

  const pending = orders.filter(o => !o.fulfilled);
  const stockAlerts = products.filter(p => p.status !== 'active');

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {(modal === 'add' || modal === 'edit') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Product Name *</label>
                  <input className="ca-input" value={form.name} onChange={set('name')} placeholder="Product name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Category</label>
                  <select className="ca-select" value={form.cat} onChange={set('cat')}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price</label>
                  <input className="ca-input" value={form.price} onChange={set('price')} placeholder="e.g. UGX 50,000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Stock Quantity</label>
                  <input className="ca-input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveProduct}>
                {modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-07</p>
          <h1 className="ca-page-title">Store &amp; Orders</h1>
          <p className="ca-page-subtitle">Manage club merchandise, orders, inventory and customer fulfilment.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(products as unknown as Record<string, unknown>[], 'products.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={openAdd}><FiPlus /> Add Product</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className={`ca-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : 'neutral'}`}>
              {k.up === true ? '↑ ' : ''}{k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Product Catalog</h2>
              <span className="ca-panel-count">{products.length} products</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</td>
                      <td><span className="ca-pill ca-pill-muted">{p.cat}</span></td>
                      <td>{p.price}</td>
                      <td style={{ fontWeight: p.stock < 20 ? 800 : undefined, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f97316' : undefined }}>{p.stock}</td>
                      <td><span className={`ca-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                      <td><button type="button" className="ca-icon-btn" onClick={() => openEdit(i)}><FiEdit2 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Pending Orders</h2>
              <span className="ca-panel-count">{pending.length} to fulfil</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Order ID</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {pending.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{o.id}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{o.item}</td>
                      <td>{o.buyer}</td>
                      <td>{o.amt}</td>
                      <td>{o.date}</td>
                      <td>
                        <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => fulfilOrder(o.id)}>
                          <FiPackage /> Fulfil
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pending.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>All orders fulfilled.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Stock Alerts</h2>
              <span className="ca-panel-count">{stockAlerts.length} items</span>
            </div>
            {stockAlerts.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>All products well-stocked.</p>}
            {stockAlerts.map((s, i) => (
              <div key={i} className="ca-alert-item">
                <div className={s.status === 'out of stock' ? 'ca-alert-dot-red' : 'ca-alert-dot-orange'} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Only {s.stock} left</p>
                </div>
                <FiAlertTriangle style={{ color: s.status === 'out of stock' ? '#ef4444' : '#f97316', fontSize: '0.9rem' }} />
              </div>
            ))}
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Bestsellers</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BESTSELLERS.map((b, i) => (
                <div key={i} className="ca-bestseller-row">
                  <span className="ca-bestseller-rank">#{i + 1}</span>
                  <span className="ca-bestseller-name">{b.name}</span>
                  <span className="ca-bestseller-sold">{b.sold} sold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
