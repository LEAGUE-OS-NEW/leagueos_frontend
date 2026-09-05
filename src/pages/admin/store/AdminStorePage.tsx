import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { fetchAdminStoreReport, type AdminStoreReport } from '../../../services/adminStoreService';
import './AdminStorePage.css';

export default function AdminStorePage() {
  const [report, setReport] = useState<AdminStoreReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchAdminStoreReport().then((value) => active && setReport(value))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Could not load Store operations.'));
    return () => { active = false; };
  }, []);
  return <AdminLayout><main className="admin-store">
    <header><h1>Store Operations</h1><p>Global products, orders, payments and fulfilment.</p></header>
    {error ? <div role="alert" className="admin-store-error">{error}</div> : !report ? <p>Loading Store operations…</p> : <>
      <section className="admin-store-stats"><article><b>{report.overview.total_orders}</b><span>Total orders</span></article><article><b>UGX {Number(report.overview.sales).toLocaleString()}</b><span>Authoritative sales</span></article></section>
      <section><h2>Global orders</h2>{report.orders.length === 0 ? <p>No Store orders.</p> : <div className="admin-store-table">{report.orders.map((order) => <article key={order.id}><b>{order.id}</b><span>{order.user_email ?? order.user}</span><span>{order.club_name ?? order.club}</span><span>{order.status}</span><span>{order.currency} {order.total_amount}</span><span>Payment: {order.payment_reference ?? 'Unlinked'}</span><span>Delivery: {order.delivery_reference || 'Not assigned'}</span></article>)}</div>}</section>
      <section><h2>Global products</h2>{report.products.length === 0 ? <p>No products in the catalogue.</p> : <div className="admin-store-table">{report.products.map((product) => <article key={product.id}><b>{product.name}</b><span>{product.club_name}</span><span>{product.sku || 'No SKU'}</span><span>{product.status}</span><span>{product.currency} {product.price}</span></article>)}</div>}</section>
    </>}
  </main></AdminLayout>;
}
