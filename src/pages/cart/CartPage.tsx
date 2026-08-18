import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiArrowLeft, FiCheck } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import { useCartStore } from '../../store/cartStore';
import './CartPage.css';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const navigate = useNavigate();
  const [placed, setPlaced] = useState(false);

  const total = items.reduce((sum, i) => sum + i.priceValue * i.qty, 0);

  const handlePlaceOrder = () => {
    // In production this would POST to /api/v1/orders/
    // For now: clear cart and show confirmation
    clearCart();
    setPlaced(true);
  };

  if (placed) {
    return (
      <div className="cart-page">
        <Navbar />
        <main className="cart-main">
          <div className="cart-confirm">
            <div className="cart-confirm-icon"><FiCheck /></div>
            <h1 className="cart-confirm-title">Order Placed!</h1>
            <p className="cart-confirm-body">
              Your order has been sent to the club for fulfilment. You'll receive an update once it's processed.
            </p>
            <div className="cart-confirm-actions">
              <Link to="/store" className="cart-btn cart-btn-primary">Continue Shopping</Link>
              <Link to="/fan/store" className="cart-btn cart-btn-secondary">Your Club Store</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <Navbar />
      <main className="cart-main">
        <div className="cart-page-inner">

          {/* Header */}
          <div className="cart-page-header">
            <button type="button" className="cart-back-btn" onClick={() => navigate(-1)}>
              <FiArrowLeft /> Back
            </button>
            <h1 className="cart-page-title">
              <FiShoppingBag /> Your Cart
              {items.length > 0 && <span className="cart-page-count">{items.reduce((s, i) => s + i.qty, 0)} items</span>}
            </h1>
          </div>

          {items.length === 0 ? (
            <div className="cart-page-empty">
              <FiShoppingBag className="cart-page-empty-icon" />
              <h2>Your cart is empty</h2>
              <p>Browse the store and add products to get started.</p>
              <Link to="/store" className="cart-btn cart-btn-primary">Browse Store</Link>
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
                        <button type="button" className="cart-qty-btn" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease">
                          <FiMinus />
                        </button>
                        <span className="cart-qty-value">{item.qty}</span>
                        <button type="button" className="cart-qty-btn" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase">
                          <FiPlus />
                        </button>
                      </div>
                      <p className="cart-page-line-total">
                        UGX {(item.priceValue * item.qty).toLocaleString('en-UG')}
                      </p>
                      <button type="button" className="cart-page-remove" onClick={() => removeItem(item.id)} aria-label="Remove">
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

                <button type="button" className="cart-btn cart-btn-primary cart-place-btn" onClick={handlePlaceOrder}>
                  <FiCheck /> Place Order
                </button>

                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                >
                  Clear cart
                </button>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
