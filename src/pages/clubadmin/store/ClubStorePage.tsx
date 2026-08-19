import { useEffect, useMemo, useState } from 'react';
import {
  FiPlus, FiDownload, FiEdit2, FiAlertTriangle, FiX, FiTrash2,
  FiPackage, FiCheck, FiEye, FiRefreshCw, FiShoppingCart, FiImage,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import { DEMO_ENTITLEMENTS, CLUB_REGISTRY } from '../../../components/clubadmin/clubAdminData';
import { useClubProductStore, toCategorySlug, nameToSlug, CATEGORY_COLORS } from '../../../store/clubProductStore';
import { parseUGX } from '../../../store/cartStore';
import {
  fetchClubProducts,
  createClubProduct,
  updateClubProduct as apiUpdateClubProduct,
  deleteClubProduct,
  fetchClubStoreOrders,
  type SaveClubProductInput,
  type ClubMerchandiseProduct,
  type ClubStoreOrder,
} from '../../../services/clubStoreService';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubStorePage.css';

const TABS = ['Products', 'Orders', 'Inventory'];
const CATEGORIES = ['Apparel', 'Fan Gear', 'Training', 'Accessories', 'Other'];

type ProductStatus = 'active' | 'low stock' | 'out of stock';
type Product = { id: string; name: string; cat: string; price: string; stock: number; status: ProductStatus; sku?: string; description?: string; image?: string };
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled';
type Order = { id: string; item: string; buyer: string; email: string; amt: string; date: string; qty: number; address: string; notes: string; status: OrderStatus };

const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', 'low stock': 'ca-pill-orange', 'out of stock': 'ca-pill-red',
};
const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'ca-pill-orange', processing: 'ca-pill-blue', shipped: 'ca-pill-blue',
  fulfilled: 'ca-pill-green', cancelled: 'ca-pill-red',
};

function getStatus(stock: number): ProductStatus {
  if (stock <= 0) return 'out of stock';
  if (stock < 20) return 'low stock';
  return 'active';
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

function toApiPrice(displayPrice: string): string {
  const num = parseUGX(displayPrice);
  return num > 0 ? String(num) : displayPrice.replace(/[^0-9.]/g, '') || '0';
}

function formatPrice(apiPrice: string, currency = 'UGX'): string {
  const num = Math.round(Number(apiPrice));
  if (num > 0) return `${currency} ${num.toLocaleString('en-US')}`;
  return apiPrice;
}

function fromApiProduct(p: ClubMerchandiseProduct): Product {
  const stock = p.available_stock ?? p.stock ?? 0;
  const catName = (p.metadata?.cat as string) ?? 'Other';
  const image = (p.metadata?.image as string) || undefined;
  return {
    id: p.id,
    name: p.name,
    cat: catName,
    price: formatPrice(p.price, p.currency),
    stock,
    status: getStatus(stock),
    sku: p.sku || undefined,
    description: p.description || undefined,
    image,
  };
}

const BACKEND_TO_LOCAL_ORDER: Record<string, OrderStatus> = {
  PENDING: 'pending', PAID: 'processing', PROCESSING: 'processing',
  FULFILLED: 'fulfilled', CANCELLED: 'cancelled', REFUNDED: 'cancelled',
};

function fromApiOrder(o: ClubStoreOrder): Order {
  const addr = o.shipping_address && typeof o.shipping_address === 'object'
    ? Object.values(o.shipping_address).filter(Boolean).join(', ')
    : '—';
  const date = o.fulfilled_at
    ? new Date(o.fulfilled_at).toLocaleDateString()
    : o.cancelled_at
      ? new Date(o.cancelled_at).toLocaleDateString()
      : 'Pending';
  return {
    id: o.id.slice(0, 8).toUpperCase(),
    item: '—',
    buyer: o.user,
    email: '',
    amt: `${o.currency} ${Number(o.total_amount).toLocaleString('en-US')}`,
    date,
    qty: 1,
    address: addr,
    notes: '',
    status: (BACKEND_TO_LOCAL_ORDER[o.status] as OrderStatus) ?? 'pending',
  };
}

const BLANK_PRODUCT: Omit<Product, 'id' | 'status'> = { name: '', cat: 'Apparel', price: '', stock: 0, sku: '', description: '', image: '' };
type ModalKind = null | 'product' | 'order-detail' | 'restock' | 'confirm-delete';
let prodIdCounter = Date.now();

export default function ClubStorePage() {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, 'id' | 'status'>>(BLANK_PRODUCT);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [catFilter, setCatFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEnt = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const ents = rawEnt.length > 0 ? rawEnt : DEMO_ENTITLEMENTS;
  const current = ents.find(e => e.id === selectedEntitlementId) ?? ents[0] ?? null;
  const canManage = current?.permissions.includes('club.admin.manage') ?? true;

  const { addProduct, updateProduct, removeProduct } = useClubProductStore();

  const scopeId = current?.scope_id ?? 1;
  const clubInfo = CLUB_REGISTRY[scopeId] ?? { name: `Club #${scopeId}`, league: '', season: '', badge: '' };

  // Real club UUID — only available when the backend issued a real entitlement
  const clubId = typeof current?.scope_id === 'string' ? current.scope_id : null;

  // Derived: show loading only while the real club fetch is in flight
  const isLoadingData = !!clubId && !hasFetched;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const categoryOptions = useMemo(() => CATEGORIES, []);

  // Load products and orders from backend on mount
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    Promise.all([
      fetchClubProducts(clubId).catch(() => null),
      fetchClubStoreOrders(clubId).catch(() => null),
    ]).then(([apiProducts, apiOrders]) => {
      if (cancelled) return;
      if (apiProducts) setProducts(apiProducts.map(fromApiProduct));
      if (apiOrders) setOrders(apiOrders.map(fromApiOrder));
      setHasFetched(true);
    });
    return () => { cancelled = true; };
  }, [clubId]);

  const openNewProduct = () => { setProductForm(BLANK_PRODUCT); setEditProductId(null); setModal('product'); };
  const openEditProduct = (p: Product) => {
    setProductForm({ name: p.name, cat: p.cat, price: p.price, stock: p.stock, sku: p.sku ?? '', description: p.description ?? '', image: p.image ?? '' });
    setEditProductId(p.id);
    setModal('product');
  };

  const handleProductImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setProductForm(f => ({ ...f, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const buildApiPayload = (): SaveClubProductInput => ({
    category: null,
    name: productForm.name,
    description: productForm.description ?? '',
    price: toApiPrice(productForm.price),
    currency: 'UGX',
    sku: productForm.sku ?? '',
    stock: productForm.stock,
    low_stock_threshold: 20,
    images: [],
    metadata: { cat: productForm.cat, image: productForm.image ?? '' },
    status: productForm.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
    is_featured: false,
  });

  const saveProduct = async () => {
    if (!productForm.name.trim()) return;
    setIsSaving(true);

    // Fall back to local-only mode if no real club UUID
    if (!clubId) {
      const status = getStatus(productForm.stock);
      const categorySlug = toCategorySlug(productForm.cat);
      const clubSlug = nameToSlug(clubInfo.name);
      if (editProductId) {
        setProducts(prev => prev.map(p => p.id === editProductId ? { ...productForm, id: editProductId, status } : p));
        updateProduct(editProductId, {
          name: productForm.name, category: categorySlug, price: productForm.price,
          priceValue: parseUGX(productForm.price), stock: productForm.stock,
          description: productForm.description, sku: productForm.sku,
          image: productForm.image, accentColor: CATEGORY_COLORS[categorySlug],
        });
        showToast('Product updated');
      } else {
        const id = `p-${prodIdCounter++}`;
        setProducts(prev => [...prev, { ...productForm, id, status }]);
        addProduct({
          id, clubSlug, clubName: clubInfo.name, name: productForm.name,
          category: categorySlug, price: productForm.price,
          priceValue: parseUGX(productForm.price), description: productForm.description,
          sku: productForm.sku, stock: productForm.stock, image: productForm.image,
          accentColor: CATEGORY_COLORS[categorySlug], createdAt: Date.now(),
        });
        showToast(`${productForm.name} added to catalog`);
      }
      setModal(null);
      setIsSaving(false);
      return;
    }

    try {
      const payload = buildApiPayload();
      const clubSlug = nameToSlug(clubInfo.name);
      const categorySlug = toCategorySlug(productForm.cat);

      if (editProductId) {
        const updated = await apiUpdateClubProduct(clubId, editProductId, payload);
        const display = fromApiProduct(updated);
        setProducts(prev => prev.map(p => p.id === editProductId ? display : p));
        updateProduct(editProductId, {
          name: display.name, category: categorySlug, price: display.price,
          priceValue: parseUGX(display.price), stock: display.stock,
          description: display.description, sku: display.sku,
          image: display.image, accentColor: CATEGORY_COLORS[categorySlug],
        });
        showToast('Product updated');
      } else {
        const created = await createClubProduct(clubId, payload);
        const display = fromApiProduct(created);
        setProducts(prev => [display, ...prev]);
        addProduct({
          id: display.id, clubSlug, clubName: clubInfo.name,
          name: display.name, category: categorySlug, price: display.price,
          priceValue: parseUGX(display.price), description: display.description,
          sku: display.sku, stock: display.stock, image: display.image,
          accentColor: CATEGORY_COLORS[categorySlug], createdAt: Date.now(),
        });
        showToast(`${display.name} added to catalog`);
      }
      setModal(null);
    } catch {
      showToast('Failed to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const openRestock = (p: Product) => { setRestockProduct(p); setRestockQty(50); setModal('restock'); };
  const confirmRestock = async () => {
    if (!restockProduct || restockQty <= 0) return;
    const newStock = restockProduct.stock + Math.trunc(restockQty);
    setIsSaving(true);
    try {
      if (clubId) {
        await apiUpdateClubProduct(clubId, restockProduct.id, { stock: newStock });
      }
      setProducts(prev => prev.map(p => p.id === restockProduct.id ? { ...p, stock: newStock, status: getStatus(newStock) } : p));
      updateProduct(restockProduct.id, { stock: newStock });
      showToast(`Restocked ${restockProduct.name} (+${restockQty})`);
      setModal(null);
    } catch {
      showToast('Failed to restock. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductId) return;
    setIsSaving(true);
    try {
      if (clubId) {
        await deleteClubProduct(clubId, deleteProductId);
      }
      setProducts(prev => prev.filter(p => p.id !== deleteProductId));
      removeProduct(deleteProductId);
      showToast('Product deleted');
      setDeleteProductId(null);
      setModal(null);
    } catch {
      showToast('Failed to delete product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const openOrderDetail = (o: Order) => { setSelectedOrder(o); setModal('order-detail'); };
  const advanceOrderStatus = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next: Record<OrderStatus, OrderStatus> = { pending: 'processing', processing: 'shipped', shipped: 'fulfilled', fulfilled: 'fulfilled', cancelled: 'cancelled' };
      return { ...o, status: next[o.status] };
    }));
    showToast('Order status updated');
    setModal(null);
  };
  const cancelOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
    showToast('Order cancelled');
    setModal(null);
  };

  const filteredProducts = products.filter(p => catFilter === 'All' || p.cat === catFilter);
  const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);
  const stockAlerts = products.filter(p => p.status !== 'active');
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* ── Product modal ── */}
      {modal === 'product' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal ca-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{editProductId ? 'Edit Product' : 'Add Product'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Product Name *</label>
                  <input className="ca-input" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">SKU</label>
                  <input className="ca-input" value={productForm.sku ?? ''} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. APP-HJ-001" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Category</label>
                  <select className="ca-select" value={productForm.cat} onChange={e => setProductForm(f => ({ ...f, cat: e.target.value }))}>
                    {categoryOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price</label>
                  <input className="ca-input" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. UGX 50,000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Stock Quantity</label>
                  <input className="ca-input" type="number" min="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description</label>
                  <textarea className="ca-textarea" rows={2} value={productForm.description ?? ''} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief product description…" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Product Image</label>
                  {productForm.image ? (
                    <div className="ca-cover-preview">
                      <img src={productForm.image} alt="Product preview" className="ca-cover-preview-img" style={{ height: 140 }} />
                      <button type="button" className="ca-cover-remove" onClick={() => setProductForm(f => ({ ...f, image: '' }))} aria-label="Remove image"><FiX /></button>
                    </div>
                  ) : (
                    <label className="ca-cover-upload">
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleProductImage} />
                      <FiImage className="ca-cover-upload-icon" />
                      <span className="ca-cover-upload-text">Click to upload product image</span>
                      <span className="ca-cover-upload-hint">JPG, PNG, WebP — max 10 MB</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={() => void saveProduct()} disabled={isSaving}>
                {isSaving ? 'Saving…' : editProductId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order detail modal ── */}
      {modal === 'order-detail' && selectedOrder && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Order {selectedOrder.id}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span className={`ca-pill ${ORDER_STATUS_CLASS[selectedOrder.status]}`} style={{ fontSize: '0.72rem' }}>{selectedOrder.status}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Ordered {selectedOrder.date}</span>
              </div>
              <div className="ca-order-detail-grid">
                <div className="ca-order-section">
                  <p className="ca-order-section-title">Item</p>
                  <p className="ca-order-section-body">{selectedOrder.item} × {selectedOrder.qty}</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, color: 'var(--color-primary-light)', fontSize: '0.9rem' }}>{selectedOrder.amt}</p>
                </div>
                <div className="ca-order-section">
                  <p className="ca-order-section-title">Buyer</p>
                  <p className="ca-order-section-body" style={{ fontWeight: 700 }}>{selectedOrder.buyer}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedOrder.email}</p>
                </div>
                <div className="ca-order-section ca-form-grid-full">
                  <p className="ca-order-section-title">Delivery Address</p>
                  <p className="ca-order-section-body">{selectedOrder.address}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="ca-order-section ca-form-grid-full">
                    <p className="ca-order-section-title">Notes</p>
                    <p className="ca-order-section-body" style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="ca-modal-footer">
              {selectedOrder.status !== 'fulfilled' && selectedOrder.status !== 'cancelled' && (
                <button type="button" className="ca-btn ca-btn-danger" style={{ marginRight: 'auto' }} onClick={() => cancelOrder(selectedOrder.id)}>
                  <FiX /> Cancel Order
                </button>
              )}
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Close</button>
              {selectedOrder.status !== 'fulfilled' && selectedOrder.status !== 'cancelled' && (
                <button type="button" className="ca-btn ca-btn-primary" onClick={() => advanceOrderStatus(selectedOrder.id)}>
                  <FiPackage /> {selectedOrder.status === 'pending' ? 'Mark Processing' : selectedOrder.status === 'processing' ? 'Mark Shipped' : 'Mark Fulfilled'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {modal === 'confirm-delete' && deleteProductId && (() => {
        const target = products.find(p => p.id === deleteProductId);
        return (
          <div className="ca-modal-overlay" onClick={() => { setDeleteProductId(null); setModal(null); }}>
            <div className="ca-modal" onClick={e => e.stopPropagation()}>
              <div className="ca-modal-header">
                <h2 className="ca-modal-title" style={{ color: '#ef4444' }}>Delete Product</h2>
                <button type="button" className="ca-modal-close" onClick={() => { setDeleteProductId(null); setModal(null); }}><FiX /></button>
              </div>
              <div className="ca-modal-body">
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                  Are you sure you want to delete <strong>{target?.name}</strong>? This will also remove it from the public store.
                </p>
              </div>
              <div className="ca-modal-footer">
                <button type="button" className="ca-btn ca-btn-secondary" onClick={() => { setDeleteProductId(null); setModal(null); }}>Cancel</button>
                <button type="button" className="ca-btn ca-btn-danger" onClick={() => void confirmDeleteProduct()} disabled={isSaving}>
                  <FiTrash2 /> {isSaving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Restock modal ── */}
      {modal === 'restock' && restockProduct && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Restock Inventory</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-restock-product-ref">
                <FiPackage style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{restockProduct.name}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current stock: {restockProduct.stock} units</p>
                </div>
                <span className={`ca-pill ${STATUS_CLASS[restockProduct.status]}`} style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>{restockProduct.status}</span>
              </div>
              <div className="ca-field" style={{ marginTop: 12 }}>
                <label className="ca-label">Add Quantity</label>
                <input className="ca-input" type="number" min="1" value={restockQty} onChange={e => setRestockQty(Number(e.target.value))} />
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>New total: {restockProduct.stock + restockQty} units</p>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={() => void confirmRestock()} disabled={isSaving}>
                <FiRefreshCw /> {isSaving ? 'Saving…' : 'Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Store &amp; Orders</h1>
          <p className="ca-page-subtitle">Manage club merchandise, orders, inventory and customer fulfilment.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => exportCSV(products as unknown as Record<string, unknown>[], 'products.csv')}><FiDownload /> Export</button>
          {canManage && activeTab === 'Products' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={openNewProduct}><FiPlus /> Add Product</button>
          )}
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
            {t === 'Orders' && pendingCount > 0 && <span className="ca-tab-badge">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {isLoadingData && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', padding: '24px 0' }}>Loading store data…</p>
      )}

      {/* ── PRODUCTS TAB ── */}
      {!isLoadingData && activeTab === 'Products' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Product Catalog</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="All">All Categories</option>
                    {categoryOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <span className="ca-panel-count">{filteredProducts.length} products</span>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filteredProducts.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No products yet. Add a product to start your catalog.</td></tr>
                    )}
                    {filteredProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.image ? (
                              <img src={p.image} alt={p.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FiImage style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }} />
                              </div>
                            )}
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.82rem' }}>{p.name}</p>
                              {p.description && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.description.slice(0, 50)}{p.description.length > 50 ? '…' : ''}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.sku || '—'}</td>
                        <td><span className="ca-pill ca-pill-muted">{p.cat}</span></td>
                        <td>{p.price}</td>
                        <td style={{ fontWeight: p.stock < 20 ? 800 : undefined, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f97316' : undefined }}>{p.stock}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                        <td>
                          {canManage && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" className="ca-icon-btn" title="Edit" onClick={() => openEditProduct(p)}><FiEdit2 /></button>
                              <button type="button" className="ca-icon-btn" title="Delete" style={{ color: '#ef4444' }} onClick={() => { setDeleteProductId(p.id); setModal('confirm-delete'); }}><FiTrash2 /></button>
                            </div>
                          )}
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Stock Alerts</h2><span className="ca-panel-count">{stockAlerts.length} items</span></div>
              {stockAlerts.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>All products well-stocked.</p>}
              {stockAlerts.map(s => (
                <div key={s.id} className="ca-alert-item" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div className={s.status === 'out of stock' ? 'ca-alert-dot-red' : 'ca-alert-dot-orange'} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Stock: {s.stock}</p>
                    </div>
                  </div>
                  {canManage && <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRestock(s)}><FiRefreshCw /></button>}
                </div>
              ))}
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Bestsellers</h2></div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No sales data yet.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {!isLoadingData && activeTab === 'Orders' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Orders</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={orderFilter} onChange={e => setOrderFilter(e.target.value as typeof orderFilter)}>
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className="ca-panel-count">{filteredOrders.length} orders</span>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Order ID</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.id}</td>
                        <td style={{ color: 'var(--color-text-primary)' }}>{o.item}</td>
                        <td>{o.buyer}</td>
                        <td>{o.amt}</td>
                        <td>{o.date}</td>
                        <td><span className={`ca-pill ${ORDER_STATUS_CLASS[o.status]}`} style={{ fontSize: '0.65rem' }}>{o.status}</span></td>
                        <td><div style={{ display: 'flex', gap: 6 }}><button type="button" className="ca-icon-btn" title="View details" onClick={() => openOrderDetail(o)}><FiEye /></button></div></td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No orders match this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Order Summary</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['pending', 'processing', 'shipped', 'fulfilled', 'cancelled'] as const).map(s => {
                  const count = orders.filter(o => o.status === s).length;
                  return (
                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiShoppingCart style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }} />
                        <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{s}</span>
                      </div>
                      <span className={`ca-pill ${ORDER_STATUS_CLASS[s]}`} style={{ fontSize: '0.65rem' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Quick Actions</h2></div>
              <button type="button" className="ca-btn ca-btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.78rem', width: '100%' }} onClick={() => exportCSV(orders as unknown as Record<string, unknown>[], 'orders.csv')}>
                <FiDownload /> Export order report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {!isLoadingData && activeTab === 'Inventory' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Inventory</h2><span className="ca-panel-count">{products.length} products</span></div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Status</th><th>Price</th><th></th></tr></thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No products in inventory.</td></tr>
                    )}
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.82rem' }}>{p.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.sku || '—'}</td>
                        <td><span className="ca-pill ca-pill-muted">{p.cat}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f97316' : 'var(--color-text-primary)' }}>{p.stock}</span>
                            <div className="ca-fill-bar-wrap" style={{ width: 60 }}>
                              <div className="ca-fill-bar" style={{ width: `${Math.min(p.stock / 300 * 100, 100)}%`, background: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f97316' : undefined }} />
                            </div>
                          </div>
                        </td>
                        <td><span className={`ca-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                        <td>{p.price}</td>
                        <td>
                          {canManage && p.status !== 'active' && <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRestock(p)}><FiRefreshCw /> Restock</button>}
                          {canManage && p.status === 'active' && <button type="button" className="ca-icon-btn" onClick={() => openEditProduct(p)}><FiEdit2 /></button>}
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Inventory Health</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Well-stocked', count: products.filter(p => p.status === 'active').length, color: '#22c55e' },
                  { label: 'Low stock', count: products.filter(p => p.status === 'low stock').length, color: '#f97316' },
                  { label: 'Out of stock', count: products.filter(p => p.status === 'out of stock').length, color: '#ef4444' },
                ].map(h => (
                  <div key={h.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: h.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{h.label}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Alerts</h2></div>
              {stockAlerts.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>All products well-stocked.</p>}
              {stockAlerts.map(s => (
                <div key={s.id} className="ca-alert-item" style={{ marginBottom: 8 }}>
                  <FiAlertTriangle style={{ color: s.status === 'out of stock' ? '#ef4444' : '#f97316', fontSize: '0.9rem', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.stock} units remaining</p>
                  </div>
                  <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRestock(s)}>Restock</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
