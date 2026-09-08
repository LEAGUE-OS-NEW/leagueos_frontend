import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import type { ClubMerchandiseProduct, ClubStoreOrder } from '../../../services/clubStoreService';
import { fetchAdminStoreOrder, fetchAdminStoreReport, type AdminStorePage, type AdminStoreResource } from '../../../services/adminStoreService';
import './AdminStorePage.css';

const resources: AdminStoreResource[] = ['orders', 'products', 'payments', 'deliveries'];

export default function AdminStorePage() {
  const [resource, setResource] = useState<AdminStoreResource>('orders');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [report, setReport] = useState<AdminStorePage | null>(null);
  const [selected, setSelected] = useState<ClubStoreOrder | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchAdminStoreReport({ resource, page, page_size: 25, search, status })
      .then((value) => { if (active) { setReport(value); setError(''); } })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Could not load Store operations.'));
    return () => { active = false; };
  }, [resource, page, search, status]);
  const openOrder = async (id: string) => {
    try { setSelected(await fetchAdminStoreOrder(id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load order.'); }
  };
  return <AdminLayout><main className="admin-store">
    <header><h1>Store Operations</h1><p>Authoritative global products, orders, payments and fulfilment.</p></header>
    {report && <section className="admin-store-stats">
      <article><b>{report.overview.total_orders}</b><span>Total orders</span></article>
      <article><b>UGX {Number(report.overview.sales).toLocaleString()}</b><span>Authoritative sales</span></article>
      <article><b>{report.overview.total_products}</b><span>Products</span></article>
      <article><b>{report.overview.refunds}</b><span>Refunded payments</span></article>
    </section>}
    <nav className="admin-store-tabs" aria-label="Store reports">{resources.map((value) => <button key={value} aria-pressed={resource === value} onClick={() => { setResource(value); setPage(1); }}>{value}</button>)}</nav>
    <section className="admin-store-filters"><input aria-label="Search Store" placeholder="Search fan, reference, tracking, product or SKU" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /><select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option>ACTIVE</option><option>PAID</option><option>PROCESSING</option><option>SHIPPED</option><option>DELIVERED</option><option>FULFILLED</option><option>CANCELLED</option><option>REFUNDED</option></select></section>
    {error ? <div role="alert" className="admin-store-error">{error}</div> : !report ? <p>Loading Store operations…</p> : report.results.length === 0 ? <p>No {resource} match these filters.</p> : <section className="admin-store-table">
      {resource === 'products' ? (report.results as ClubMerchandiseProduct[]).map((product) => <article key={product.id}><b>{product.name}</b><span>{product.club_name}</span><span>SKU {product.sku || '—'}</span><span>{product.status}</span><span>{product.currency} {product.price}</span><span>Stock {product.stock} · Reserved {product.reserved_stock} · Available {product.available_stock}</span></article>) : (report.results as ClubStoreOrder[]).map((order) => <article key={order.id}><button className="admin-store-order" onClick={() => void openOrder(order.id)}>{order.id}</button><span>{order.club_name ?? order.club}</span><span>{order.user_email ?? order.user}</span><span>{order.currency} {order.total_amount}</span><span>{order.status}</span><span>Payment {order.payment_reference ?? '—'} · Refund {order.refund_reference ?? '—'}</span><span>Tracking {order.delivery_reference || '—'}</span></article>)}
    </section>}
    {report && report.total_pages > 1 && <footer className="admin-store-pagination"><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button><span>Page {report.page} of {report.total_pages} ({report.count} records)</span><button disabled={page >= report.total_pages} onClick={() => setPage((v) => v + 1)}>Next</button></footer>}
    {selected && <div className="admin-store-modal" role="dialog" aria-modal="true" aria-label="Order detail"><section><button onClick={() => setSelected(null)}>Close</button><h2>Order {selected.id}</h2><p>{selected.user_email} · {selected.club_name}</p><p>{selected.currency} {selected.total_amount} · {selected.status}</p><h3>Line items</h3>{selected.items?.map((item) => <p key={item.id}>{item.product_name} ({item.product_sku}) × {item.quantity} @ {item.unit_price} = {item.total_price}</p>)}<h3>Payment and refund</h3><p>Payment: {selected.payment_reference || 'None'}</p><p>Refund: {selected.refund_reference || 'None'}</p><h3>Delivery</h3><p>Tracking: {selected.delivery_reference || 'Not assigned'}</p>{selected.status_history?.map((event, index) => <p key={`${event.created_at}-${index}`}>{event.created_at}: {event.previous_status} → {event.new_status} ({event.changed_by_email ?? event.changed_by}) {event.note}</p>)}</section></div>}
  </main></AdminLayout>;
}
