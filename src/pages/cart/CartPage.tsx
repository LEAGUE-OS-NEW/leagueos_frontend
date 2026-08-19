import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiMinus, FiPlus, FiTrash2, FiShoppingBag,
  FiArrowLeft, FiCheck, FiCreditCard, FiAlertTriangle,
} from 'react-icons/fi';
import Sidebar from '../../components/fan/Sidebar';
import Topbar from '../fan/sections/Topbar';
import Footer from '../../components/landing/Footer';
import { useCartStore } from '../../store/cartStore';
import { useFanWallet } from '../../hooks/useFanWallet';
import { spendWalletBalance } from '../../services/fanWalletApiService';
import { createPublicStoreOrder } from '../../services/clubStoreService';
import '../fan/sections/FanDashboard.css';
import './CartPage.css';

export default function CartPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const navigate = useNavigate();

  const { wallet, isLoading: walletLoading, refresh: refreshWallet } = useFanWallet('UGX');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placed, setPlaced] = useState(false);
  const [deductedAmount, setDeductedAmount] = useState(0);
  // Stable idempotency key per cart session — rotated after each successful order
  const idempotencyKeyRef = useRef(`cart-${crypto.randomUUID()}`);

  const total = items.reduce((sum, i) => sum + i.priceValue * i.qty, 0);
  const availableBalance = wallet?.availableBalance ?? 0;
  const insufficientFunds = !walletLoading && wallet !== null && total > availableBalance;

  const handlePlaceOrder = async () => {
    if (total <= 0 || items.length === 0) return;
    setOrderError('');

    if (insufficientFunds) {
      setOrderError('Insufficient wallet balance. Please top up your wallet to continue.');
      return;
    }

    setPlacing(true);
    try {
      // Group items by club for the order payload
      const itemsByClub = items.reduce<Record<string, typeof items>>((groups, item) => {
        groups[item.clubSlug] = [...(groups[item.clubSlug] ?? []), item];
        return groups;
      }, {});

      // Deduct wallet first
      await spendWalletBalance({
        amount: total,
        currency: 'UGX',
        description: `Store purchase — ${items.length} item${items.length !== 1 ? 's' : ''}`,
        idempotencyKey: idempotencyKeyRef.current,
      });

      // Place one order per club via the public store endpoint
      await Promise.all(
        Object.entries(itemsByClub).map(([clubSlug, clubItems]) =>
          createPublicStoreOrder({
            items: clubItems.map((item) => ({
              product: item.productId,
              quantity: item.qty,
              size: item.size,
            })),
            metadata: {
              clubSlug,
              cartLineIds: clubItems.map((item) => item.id),
              walletIdempotencyKey: idempotencyKeyRef.current,
            },
          }),
        ),
      );

      await refreshWallet();
      setDeductedAmount(total);
      clearCart();
      setPlaced(true);
      // Rotate key so a retry after navigation gets a fresh key
      idempotencyKeyRef.current = `cart-${crypto.randomUUID()}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place your order.';
      setOrderError(`Order failed: ${message}. Please try again.`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="cart-shell">
      <div className="cart-layout">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="cart-main-col">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="cart-content">
            <div className="cart-page-inner">

              {placed ? (
                <div className="cart-confirm">
                  <div className="cart-confirm-icon"><FiCheck /></div>
                  <h1 className="cart-confirm-title">Order Placed!</h1>
                  <p className="cart-confirm-body">
                    UGX {deductedAmount.toLocaleString('en-UG')} has been deducted from your wallet.
                    Your order has been sent to the club for fulfilment.
                  </p>
                  {wallet && (
                    <p className="cart-confirm-balance">
                      New wallet balance:{' '}
                      <strong>UGX {wallet.availableBalance.toLocaleString('en-UG')}</strong>
                    </p>
                  )}
                  <div className="cart-confirm-actions">
                    <Link to="/fan/store" className="cart-btn cart-btn-primary">Continue Shopping</Link>
                    <Link to="/wallet" className="cart-btn cart-btn-secondary">View Wallet</Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="cart-page-header">
                    <button type="button" className="cart-back-btn" onClick={() => navigate(-1)}>
                      <FiArrowLeft /> Back
                    </button>
                    <h1 className="cart-page-title">
                      <FiShoppingBag /> Your Cart
                      {items.length > 0 && (
                        <span className="cart-page-count">
                          {items.reduce((s, i) => s + i.qty, 0)} items
                        </span>
                      )}
                    </h1>
                  </div>

                  {items.length === 0 ? (
                    <div className="cart-page-empty">
                      <FiShoppingBag className="cart-page-empty-icon" />
                      <h2>Your cart is empty</h2>
                      <p>Browse the store and add products to get started.</p>
                      <Link to="/fan/store" className="cart-btn cart-btn-primary">Browse Store</Link>
                    </div>
                  ) : (
                    <div className="cart-page-layout">

                      {/* Item list */}
                      <div className="cart-page-items">
                        {items.map((item) => (
                          <div key={item.id} className="cart-page-item">
                            <div className="cart-page-swatch" style={{ background: item.color }} />
                            <div className="cart-page-item-info">
                              <p className="cart-page-item-name">{item.name}</p>
                              <div className="cart-page-item-meta">
                                {item.size && <span className="cart-page-size">{item.size}</span>}
                                <span className="cart-page-club">{item.clubSlug.replace(/-/g, ' ')}</span>
                              </div>
                              <p className="cart-page-item-unit">{item.price} each</p>
                            </div>
                            <div className="cart-page-item-controls">
                              <div className="cart-page-qty">
                                <button
                                  type="button"
                                  className="cart-qty-btn"
                                  onClick={() => updateQty(item.id, item.qty - 1)}
                                  aria-label="Decrease"
                                >
                                  <FiMinus />
                                </button>
                                <span className="cart-qty-value">{item.qty}</span>
                                <button
                                  type="button"
                                  className="cart-qty-btn"
                                  onClick={() => updateQty(item.id, item.qty + 1)}
                                  aria-label="Increase"
                                >
                                  <FiPlus />
                                </button>
                              </div>
                              <p className="cart-page-line-total">
                                UGX {(item.priceValue * item.qty).toLocaleString('en-UG')}
                              </p>
                              <button
                                type="button"
                                className="cart-page-remove"
                                onClick={() => removeItem(item.id)}
                                aria-label="Remove"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order summary */}
                      <aside className="cart-page-summary">
                        <h2 className="cart-summary-title">Order Summary</h2>

                        <div className="cart-summary-rows">
                          {items.map((item) => (
                            <div key={item.id} className="cart-summary-row">
                              <span className="cart-summary-row-label">
                                {item.name}{item.size ? ` (${item.size})` : ''} × {item.qty}
                              </span>
                              <span className="cart-summary-row-val">
                                UGX {(item.priceValue * item.qty).toLocaleString('en-UG')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="cart-summary-divider" />

                        <div className="cart-summary-total">
                          <span>Total</span>
                          <span className="cart-summary-total-val">
                            UGX {total.toLocaleString('en-UG')}
                          </span>
                        </div>

                        {/* Wallet balance */}
                        <div className={`cart-wallet-row${insufficientFunds ? ' cart-wallet-row--low' : ''}`}>
                          <span className="cart-wallet-label">
                            <FiCreditCard /> Wallet balance
                          </span>
                          <span className="cart-wallet-val">
                            {walletLoading
                              ? '—'
                              : wallet === null
                              ? 'No wallet'
                              : `UGX ${availableBalance.toLocaleString('en-UG')}`}
                          </span>
                        </div>

                        {insufficientFunds && (
                          <div className="cart-insufficient">
                            <FiAlertTriangle />
                            <span>
                              Insufficient balance.{' '}
                              <Link to="/wallet" className="cart-topup-link">Top up wallet</Link>
                            </span>
                          </div>
                        )}

                        {orderError && (
                          <p className="cart-order-error">{orderError}</p>
                        )}

                        <button
                          type="button"
                          className="cart-btn cart-btn-primary cart-place-btn"
                          onClick={handlePlaceOrder}
                          disabled={placing || walletLoading || insufficientFunds}
                        >
                          {placing ? 'Processing…' : <><FiCheck /> Place Order</>}
                        </button>

                        <button type="button" className="cart-clear-btn" onClick={clearCart}>
                          Clear cart
                        </button>
                      </aside>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
