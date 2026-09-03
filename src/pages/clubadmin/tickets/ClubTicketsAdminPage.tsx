import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiPlus, FiDownload, FiX, FiEdit2, FiCheck, FiAlertCircle,
  FiClock, FiUsers, FiZap, FiSave, FiUpload, FiEye, FiLoader,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import { DEMO_ENTITLEMENTS } from '../../../components/clubadmin/clubAdminData';
import {
  createTicketProduct,
  deleteTicketProduct,
  fetchTicketOrders,
  fetchTicketProducts,
  publishTicketProduct,
  scanTicketCode,
  updateTicketProduct,
  type SaveTicketProductInput,
  type TicketOrder,
  type TicketProduct,
} from '../../../services/ticketAdminService';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubTicketsAdminPage.css';

const TABS = ['Ticket Products', 'Scanner'];

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'ca-pill-muted',
  ACTIVE: 'ca-pill-green',
  PAUSED: 'ca-pill-orange',
  SOLD_OUT: 'ca-pill-red',
  ARCHIVED: 'ca-pill-muted',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail;
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

type ProductForm = {
  name: string;
  description: string;
  price: string;
  currency: string;
  venue: string;
  capacity: string;
  is_refundable: boolean;
  eventLabel: string;
};

const BLANK_FORM: ProductForm = {
  name: '', description: '', price: '', currency: 'UGX', venue: '', capacity: '', is_refundable: false, eventLabel: '',
};

function toSavePayload(form: ProductForm): SaveTicketProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: form.price,
    currency: form.currency.trim() || 'UGX',
    venue: form.venue.trim(),
    capacity: form.capacity.trim() ? Number(form.capacity) : null,
    is_refundable: form.is_refundable,
    metadata: form.eventLabel.trim() ? { event_label: form.eventLabel.trim() } : {},
  };
}

function fromProduct(product: TicketProduct): ProductForm {
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    venue: product.venue,
    capacity: product.capacity != null ? String(product.capacity) : '',
    is_refundable: product.is_refundable,
    eventLabel: typeof product.metadata?.event_label === 'string' ? product.metadata.event_label : '',
  };
}

export default function ClubTicketsAdminPage() {
  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEnt = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const ents = rawEnt.length > 0 ? rawEnt : DEMO_ENTITLEMENTS;
  const current = ents.find(e => e.id === selectedEntitlementId) ?? ents[0] ?? null;
  const canManage = current?.permissions.includes('club.ticketing.manage') ?? true;
  const clubId = current?.scope_id != null ? String(current.scope_id) : '';

  const [activeTab, setActiveTab] = useState('Ticket Products');
  const [products, setProducts] = useState<TicketProduct[]>([]);
  const [loading, setLoading] = useState(() => Boolean(clubId));
  const [fetchError, setFetchError] = useState('');
  const [modal, setModal] = useState<null | 'product'>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ordersProduct, setOrdersProduct] = useState<TicketProduct | null>(null);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [scanInput, setScanInput] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<null | { valid: boolean; message: string }>(null);
  const [scannedOrders, setScannedOrders] = useState<TicketOrder[]>([]);
  const [toast, setToast] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (!clubId) {
      return;
    }
    let cancelled = false;
    fetchTicketProducts(clubId)
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(errorMessage(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const openNew = () => { setForm(BLANK_FORM); setEditId(null); setSaveError(''); setModal('product'); };
  const openEdit = (product: TicketProduct) => { setForm(fromProduct(product)); setEditId(product.id); setSaveError(''); setModal('product'); };

  const saveProduct = async () => {
    if (!form.name.trim() || !form.price.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = toSavePayload(form);
      if (editId) {
        const updated = await updateTicketProduct(clubId, editId, payload);
        setProducts(prev => prev.map(p => (p.id === editId ? updated : p)));
        showToast('Ticket product updated');
      } else {
        const created = await createTicketProduct(clubId, payload);
        setProducts(prev => [created, ...prev]);
        showToast(`Ticket product "${created.name}" created`);
      }
      setModal(null);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (product: TicketProduct) => {
    setBusyId(product.id);
    try {
      const published = await publishTicketProduct(clubId, product.id);
      setProducts(prev => prev.map(p => (p.id === product.id ? published : p)));
      showToast(`"${product.name}" is now on sale`);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product: TicketProduct) => {
    if (!window.confirm(`Delete ticket product "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    try {
      await deleteTicketProduct(clubId, product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      showToast('Ticket product deleted');
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const openOrders = async (product: TicketProduct) => {
    setOrdersProduct(product);
    setOrdersLoading(true);
    try {
      const list = await fetchTicketOrders(clubId, product.id);
      setOrders(list);
    } catch (err) {
      showToast(errorMessage(err));
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleScan = async () => {
    const code = scanInput.trim().toUpperCase();
    if (!code || !clubId) return;
    setScanBusy(true);
    try {
      const order = await scanTicketCode(clubId, code);
      setScannedOrders(prev => [order, ...prev]);
      setScanResult({ valid: true, message: `Valid ticket — ${order.product_name}` });
      setProducts(prev => prev.map(p => (p.id === order.product ? { ...p } : p)));
    } catch (err) {
      setScanResult({ valid: false, message: errorMessage(err) });
    } finally {
      setScanBusy(false);
      setScanInput('');
      setTimeout(() => setScanResult(null), 4000);
      scanRef.current?.focus();
    }
  };

  const totalSold = useMemo(() => products.reduce((s, p) => s + p.sold, 0), [products]);
  const totalCheckedIn = scannedOrders.length;
  const scanPct = totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 100) : 0;
  const loadError = !clubId ? 'No club is selected for this workspace.' : fetchError;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Ticket product modal */}
      {modal === 'product' && (
        <div className="ca-modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{editId ? 'Edit Ticket Product' : 'Create Ticket Product'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              {saveError && (
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#ef4444' }}>{saveError}</p>
              )}
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Name *</label>
                  <input className="ca-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Final Match — General Admission" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Match / Event</label>
                  <input className="ca-input" value={form.eventLabel} onChange={e => setForm(f => ({ ...f, eventLabel: e.target.value }))} placeholder="e.g. Club A vs Club B, 18 May 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price *</label>
                  <input className="ca-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="10000.00" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Currency</label>
                  <input className="ca-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="UGX" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Capacity</label>
                  <input className="ca-input" type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Leave blank for unlimited" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Venue</label>
                  <input className="ca-input" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Mandela National Stadium" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description</label>
                  <input className="ca-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveProduct} disabled={saving}>
                {saving ? <><FiLoader className="ca-spin" /> Saving…</> : editId ? <><FiSave /> Save Changes</> : <><FiPlus /> Create Product</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders modal */}
      {ordersProduct && (
        <div className="ca-modal-overlay" onClick={() => setOrdersProduct(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Orders — {ordersProduct.name}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setOrdersProduct(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              {ordersLoading ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading orders…</p>
              ) : orders.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No orders yet for this ticket.</p>
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead><tr><th>Buyer</th><th>Qty</th><th>Total</th><th>Status</th><th>Code</th></tr></thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td>{o.buyer_email}</td>
                          <td>{o.quantity}</td>
                          <td>{o.total_amount} {o.currency}</td>
                          <td><span className={`ca-pill ${STATUS_CLASS[o.status] ?? 'ca-pill-muted'}`}>{o.status}</span></td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Ticketing &amp; Match Events</h1>
          <p className="ca-page-subtitle">Manage ticket products, sales and match-day check-in.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(products as unknown as Record<string, unknown>[], 'ticket-products.csv')}>
            <FiDownload /> Export
          </button>
          {canManage && activeTab === 'Ticket Products' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={openNew}><FiPlus /> Create Ticket Product</button>
          )}
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {loadError && (
        <div className="ca-scan-result ca-scan-invalid" style={{ marginBottom: 16 }}>
          <FiAlertCircle style={{ fontSize: '1.1rem', color: '#ef4444', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.82rem' }}>{loadError}</p>
        </div>
      )}

      {/* ── TICKET PRODUCTS TAB ── */}
      {activeTab === 'Ticket Products' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Ticket Products</h2>
                <span className="ca-panel-count">{products.length} products</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Name</th><th>Match / Event</th><th>Price</th><th>Sold</th><th>Capacity</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}><FiLoader className="ca-spin" /> Loading ticket products…</td></tr>
                    )}
                    {!loading && products.length === 0 && !loadError && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No ticket products yet. Create one to start selling.</td></tr>
                    )}
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{p.name}</td>
                        <td>{typeof p.metadata?.event_label === 'string' ? p.metadata.event_label : '—'}</td>
                        <td>{p.price} {p.currency}</td>
                        <td>{p.sold > 0 ? p.sold.toLocaleString() : '—'}</td>
                        <td>{p.capacity != null ? p.capacity.toLocaleString() : 'Unlimited'}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[p.status] ?? 'ca-pill-muted'}`}>{p.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="ca-icon-btn" title="View orders" onClick={() => openOrders(p)}><FiEye /></button>
                            {canManage && (
                              <>
                                <button type="button" className="ca-icon-btn" title="Edit" onClick={() => openEdit(p)}><FiEdit2 /></button>
                                {p.status === 'DRAFT' && (
                                  <button type="button" className="ca-icon-btn" title="Publish" disabled={busyId === p.id} onClick={() => handlePublish(p)}><FiUpload /></button>
                                )}
                                <button type="button" className="ca-icon-btn" title="Delete" disabled={busyId === p.id} onClick={() => handleDelete(p)}><FiX /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Sales Overview</h2></div>
              {products.length === 0
                ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No ticket products configured.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {products.map(p => {
                      const pct = p.capacity ? Math.round((p.sold / Math.max(p.capacity, 1)) * 100) : 0;
                      return (
                        <div key={p.id} className="ca-channel-row">
                          <span className="ca-channel-label" style={{ width: 110 }}>{p.name}</span>
                          <div className="ca-channel-bar-wrap" style={{ flex: 1 }}>
                            <div className="ca-channel-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="ca-channel-pct">{p.capacity ? `${pct}%` : p.sold}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── SCANNER TAB ── */}
      {activeTab === 'Scanner' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Ticket Scanner</h2>
                <span className="ca-pill ca-pill-green" style={{ fontSize: '0.68rem' }}><FiZap style={{ fontSize: '0.7rem' }} /> Live</span>
              </div>
              <div className="ca-scanner-box">
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Enter a ticket code and press Enter to check it in
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={scanRef}
                    className="ca-input ca-scanner-input"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    placeholder="TK-XXXXXXXX"
                    autoFocus
                    disabled={scanBusy}
                  />
                  <button type="button" className="ca-btn ca-btn-primary" onClick={handleScan} disabled={scanBusy}>
                    {scanBusy ? <FiLoader className="ca-spin" /> : 'Scan'}
                  </button>
                </div>

                {scanResult && (
                  <div className={`ca-scan-result ${scanResult.valid ? 'ca-scan-valid' : 'ca-scan-invalid'}`}>
                    {scanResult.valid
                      ? <FiCheck style={{ fontSize: '1.1rem', color: '#22c55e', flexShrink: 0 }} />
                      : <FiAlertCircle style={{ fontSize: '1.1rem', color: '#ef4444', flexShrink: 0 }} />
                    }
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: scanResult.valid ? '#22c55e' : '#ef4444', fontSize: '0.85rem' }}>
                        {scanResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{scanResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="ca-scanner-stats">
                <div className="ca-scanner-stat">
                  <FiUsers style={{ color: '#22c55e', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{totalCheckedIn.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Checked In (this session)</p>
                </div>
                <div className="ca-scanner-stat">
                  <FiClock style={{ color: '#f97316', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{totalSold.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Total Sold</p>
                </div>
                <div className="ca-scanner-stat">
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>{scanPct}%</div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Session Attendance</p>
                </div>
              </div>
              <div className="ca-fill-bar-wrap" style={{ width: '100%', marginTop: 6 }}>
                <div className="ca-fill-bar" style={{ width: `${scanPct}%` }} />
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Recent Check-ins</h2>
                <span className="ca-panel-count">{scannedOrders.length} scanned</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Code</th><th>Buyer</th><th>Product</th><th>Checked in</th></tr></thead>
                  <tbody>
                    {scannedOrders.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No tickets scanned yet this session.</td></tr>
                    )}
                    {scannedOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.code}</td>
                        <td style={{ color: 'var(--color-text-primary)' }}>{o.buyer_email}</td>
                        <td>{o.product_name}</td>
                        <td>{o.checked_in_at ? new Date(o.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Scanner Tips</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Valid ticket codes start with TK-',
                  'Each ticket can only be checked in once',
                  'Invalid or expired scans are not counted',
                  'Press Enter to scan quickly',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    <FiCheck style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: 2 }} />{tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
