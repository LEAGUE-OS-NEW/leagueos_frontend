import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiPlus, FiDownload, FiEdit2, FiAlertTriangle, FiX,
  FiPackage, FiCheck, FiEye, FiRefreshCw, FiShoppingCart,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubStorePage.css';
import {
  createClubProduct,
  createClubProductCategory,
  fetchClubProductCategories,
  fetchClubProducts,
  fetchClubStoreOrders,
  updateClubProduct,
  type ClubMerchandiseProduct,
  type ClubProductCategory,
  type ClubStoreOrder,
} from '../../../services/clubStoreService';

const TABS = ['Products', 'Orders', 'Inventory'];

const CATEGORIES = ['Apparel', 'Fan Gear', 'Training', 'Accessories', 'Other'];
type ProductStatus = 'active' | 'low stock' | 'out of stock';

type Product = {
  id: string;
  name: string;
  cat: string;
  price: string;
  stock: number;
  status: ProductStatus;
  sku?: string;
  description?: string;
};

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'fulfilled'
  | 'cancelled';

type Order = {
  id: string;
  item: string;
  buyer: string;
  email: string;
  amt: string;
  date: string;
  qty: number;
  address: string;
  notes: string;
  status: OrderStatus;
};


const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', 'low stock': 'ca-pill-orange', 'out of stock': 'ca-pill-red',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'ca-pill-orange',
  processing: 'ca-pill-blue',
  fulfilled: 'ca-pill-green',
  cancelled: 'ca-pill-red',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK_PRODUCT: Omit<Product, 'id' | 'status'> = { name: '', cat: 'Apparel', price: '', stock: 0, sku: '', description: '' };

type ModalKind = null | 'product' | 'order-detail' | 'restock';


export default function ClubStorePage() {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] =
    useState<ClubProductCategory[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [storeError, setStoreError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, 'id' | 'status'>>(BLANK_PRODUCT);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled'>('all');
  const [catFilter, setCatFilter] = useState('All');
  const [toast, setToast] = useState('');

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const clubEntitlements =
    user?.dashboard_access?.entitlements.filter(
      e =>
        e.dashboard === 'CLUB_ADMIN' &&
        e.scope_type === 'CLUB' &&
        e.scope_id,
    ) ?? [];

  const current =
    clubEntitlements.find(
      e => e.id === selectedEntitlementId,
    ) ??
    clubEntitlements[0] ??
    null;

  const clubId =
    current?.scope_id
      ? String(current.scope_id)
      : '';

  const canManage =
    current?.permissions.includes('club.admin.manage') ??
    false;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const formatMoney = (
    value: string | number,
    currency = 'UGX',
  ) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return `${currency} 0`;
    }

    return `${currency} ${Math.round(amount).toLocaleString(
      'en-UG',
    )}`;
  };

  const parseMoney = (value: string) => {
    const amount = Number(
      value
        .replace(/UGX/gi, '')
        .replace(/,/g, '')
        .trim(),
    );

    return Number.isFinite(amount)
      ? amount
      : Number.NaN;
  };

  const productFromApi = useCallback(
    (
      record: ClubMerchandiseProduct,
      productCategories: ClubProductCategory[],
    ): Product => {
      const category =
        productCategories.find(
          item => item.id === record.category,
        )?.name ?? 'Other';

      const availableStock =
        Number(record.available_stock);

      return {
        id: record.id,
        name: record.name,
        cat: category,
        price: formatMoney(
          record.price,
          record.currency || 'UGX',
        ),
        stock: Number(record.stock),
        status:
          availableStock <= 0
            ? 'out of stock'
            : record.is_low_stock
              ? 'low stock'
              : 'active',
        sku: record.sku,
        description: record.description,
      };
    },
    [],
  );

  const orderFromApi = useCallback(
    (record: ClubStoreOrder): Order => {
      const metadata = record.metadata ?? {};
      const shipping = record.shipping_address ?? {};

      const item =
        typeof metadata.item_name === 'string'
          ? metadata.item_name
          : typeof metadata.summary === 'string'
            ? metadata.summary
            : 'Merchandise order';

      const buyer =
        typeof metadata.buyer_name === 'string'
          ? metadata.buyer_name
          : `Customer ${String(record.user).slice(0, 8)}`;

      const email =
        typeof metadata.buyer_email === 'string'
          ? metadata.buyer_email
          : '';

      const qty =
        typeof metadata.quantity === 'number'
          ? metadata.quantity
          : 0;

      const notes =
        typeof metadata.notes === 'string'
          ? metadata.notes
          : '';

      const date =
        typeof metadata.created_at === 'string'
          ? metadata.created_at
          : '—';

      const address = Object.values(shipping)
        .filter(
          value =>
            typeof value === 'string' &&
            value.trim(),
        )
        .join(', ');

      const status: OrderStatus =
        record.status === 'FULFILLED'
          ? 'fulfilled'
          : record.status === 'CANCELLED' ||
              record.status === 'REFUNDED'
            ? 'cancelled'
            : record.status === 'PROCESSING' ||
                record.status === 'PAID'
              ? 'processing'
              : 'pending';

      return {
        id: record.id,
        item,
        buyer,
        email,
        amt: formatMoney(
          record.total_amount,
          record.currency || 'UGX',
        ),
        date,
        qty,
        address: address || 'No delivery address recorded',
        notes,
        status,
      };
    },
    [],
  );

  const loadStore = useCallback(async () => {
    if (!clubId) {
      setProducts([]);
      setOrders([]);
      setCategories([]);
      setStoreError(
        'No Club Admin workspace is selected.',
      );
      setIsLoadingStore(false);
      return;
    }

    setIsLoadingStore(true);
    setStoreError('');

    try {
      const [
        nextCategories,
        nextProducts,
        nextOrders,
      ] = await Promise.all([
        fetchClubProductCategories(clubId),
        fetchClubProducts(clubId),
        fetchClubStoreOrders(clubId),
      ]);

      setCategories(nextCategories);

      setProducts(
        nextProducts.map(product =>
          productFromApi(
            product,
            nextCategories,
          ),
        ),
      );

      setOrders(
        nextOrders.map(orderFromApi),
      );
    } catch (error) {
      setProducts([]);
      setOrders([]);

      setStoreError(
        error instanceof Error
          ? error.message
          : 'Could not load the club store.',
      );
    } finally {
      setIsLoadingStore(false);
    }
  }, [
    clubId,
    orderFromApi,
    productFromApi,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStore();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadStore]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...CATEGORIES,
          ...categories.map(
            category => category.name,
          ),
        ]),
      ),
    [categories],
  );

  const openNewProduct = () => { setProductForm(BLANK_PRODUCT); setEditProductId(null); setModal('product'); };
  const openEditProduct = (p: Product) => { setProductForm({ name: p.name, cat: p.cat, price: p.price, stock: p.stock, sku: p.sku ?? '', description: p.description ?? '' }); setEditProductId(p.id); setModal('product'); };

  const saveProduct = async () => {
    if (
      !clubId ||
      !productForm.name.trim() ||
      isSavingProduct
    ) {
      return;
    }

    const price = parseMoney(
      productForm.price,
    );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      showToast(
        'Enter a valid product price.',
      );
      return;
    }

    setIsSavingProduct(true);

    try {
      let category =
        categories.find(
          item =>
            item.name.toLowerCase() ===
            productForm.cat.toLowerCase(),
        ) ?? null;

      if (!category) {
        category =
          await createClubProductCategory(
            clubId,
            productForm.cat,
          );

        setCategories(previous => [
          ...previous,
          category as ClubProductCategory,
        ]);
      }

      const payload = {
        category: category.id,
        name: productForm.name.trim(),
        description:
          productForm.description?.trim() ??
          '',
        price: price.toFixed(2),
        currency: 'UGX',
        sku: productForm.sku?.trim() ?? '',
        stock: Math.max(
          0,
          Math.trunc(productForm.stock),
        ),
        low_stock_threshold: 20,
        images: [],
        metadata: {},
        status: 'ACTIVE' as const,
        is_featured: false,
      };

      if (editProductId) {
        await updateClubProduct(
          clubId,
          editProductId,
          payload,
        );

        showToast('Product updated');
      } else {
        await createClubProduct(
          clubId,
          payload,
        );

        showToast(
          `${productForm.name} added to catalog`,
        );
      }

      setModal(null);

      await loadStore();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not save product.',
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const openRestock = (p: Product) => { setRestockProduct(p); setRestockQty(50); setModal('restock'); };
  const confirmRestock = async () => {
    if (
      !clubId ||
      !restockProduct ||
      restockQty <= 0
    ) {
      return;
    }

    try {
      await updateClubProduct(
        clubId,
        restockProduct.id,
        {
          stock:
            restockProduct.stock +
            Math.trunc(restockQty),
        },
      );

      showToast(
        `Restocked ${restockProduct.name} (+${restockQty})`,
      );

      setModal(null);

      await loadStore();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not restock product.',
      );
    }
  };

  const openOrderDetail = (o: Order) => {
    setSelectedOrder(o);
    setModal('order-detail');
  };



  const filteredProducts = products.filter(p => catFilter === 'All' || p.cat === catFilter);
  const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);
  const stockAlerts = products.filter(p => p.status !== 'active');
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Product modal */}
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
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveProduct}>
                {isSavingProduct
                  ? 'Saving…'
                  : editProductId
                    ? 'Save Changes'
                    : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal */}
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
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Restock modal */}
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
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  New total: {restockProduct.stock + restockQty} units
                </p>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={confirmRestock}>
                <FiRefreshCw /> Restock
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
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(products as unknown as Record<string, unknown>[], 'products.csv')}>
            <FiDownload /> Export
          </button>
          {canManage && activeTab === 'Products' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={openNewProduct}><FiPlus /> Add Product</button>
          )}
        </div>
      </div>

      {isLoadingStore && (
        <div className="ca-panel">
          <p className="ca-page-subtitle">
            Loading store data…
          </p>
        </div>
      )}

      {storeError && (
        <div className="ca-panel">
          <p
            style={{
              color: '#ef4444',
              margin: 0,
            }}
          >
            {storeError}
          </p>

          <button
            type="button"
            className="ca-btn ca-btn-secondary"
            style={{ marginTop: 12 }}
            onClick={() => void loadStore()}
          >
            <FiRefreshCw /> Retry
          </button>
        </div>
      )}

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
            {t === 'Orders' && pendingCount > 0 && (
              <span className="ca-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'Products' && (
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
                  <thead>
                    <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No products yet. Add a product to start your catalog.</td></tr>
                    )}
                    {filteredProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.82rem' }}>{p.name}</p>
                            {p.description && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.description.slice(0, 50)}{p.description.length > 50 ? '…' : ''}</p>}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.sku || '—'}</td>
                        <td><span className="ca-pill ca-pill-muted">{p.cat}</span></td>
                        <td>{p.price}</td>
                        <td style={{ fontWeight: p.stock < 20 ? 800 : undefined, color: p.stock === 0 ? '#ef4444' : p.stock < 20 ? '#f97316' : undefined }}>{p.stock}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                        <td>
                          {canManage && <button type="button" className="ca-icon-btn" onClick={() => openEditProduct(p)}><FiEdit2 /></button>}
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
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Stock Alerts</h2>
                <span className="ca-panel-count">{stockAlerts.length} items</span>
              </div>
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
                  {canManage && (
                    <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRestock(s)}>
                      <FiRefreshCw />
                    </button>
                  )}
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
      {activeTab === 'Orders' && (
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
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className="ca-panel-count">{filteredOrders.length} orders</span>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Order ID</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.id}</td>
                        <td style={{ color: 'var(--color-text-primary)' }}>{o.item}</td>
                        <td>{o.buyer}</td>
                        <td>{o.amt}</td>
                        <td>{o.date}</td>
                        <td><span className={`ca-pill ${ORDER_STATUS_CLASS[o.status]}`} style={{ fontSize: '0.65rem' }}>{o.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="ca-icon-btn" title="View details" onClick={() => openOrderDetail(o)}><FiEye /></button>
                          </div>
                        </td>
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
                {(['pending', 'processing', 'fulfilled', 'cancelled'] as const).map(s => {
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Export order report', icon: FiDownload, action: () => exportCSV(orders as unknown as Record<string, unknown>[], 'orders.csv') },
                ].map((qa, i) => (
                  <button key={i} type="button" className="ca-btn ca-btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }} onClick={qa.action}>
                    <qa.icon /> {qa.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {activeTab === 'Inventory' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Inventory</h2>
                <span className="ca-panel-count">{products.length} products</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Status</th><th>Price</th><th></th></tr>
                  </thead>
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
                          {canManage && p.status !== 'active' && (
                            <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRestock(p)}>
                              <FiRefreshCw /> Restock
                            </button>
                          )}
                          {canManage && p.status === 'active' && (
                            <button type="button" className="ca-icon-btn" onClick={() => openEditProduct(p)}><FiEdit2 /></button>
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Inventory Health</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Well-stocked', count: products.filter(p => p.status === 'active').length, color: '#22c55e' },
                  { label: 'Low stock',    count: products.filter(p => p.status === 'low stock').length, color: '#f97316' },
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
