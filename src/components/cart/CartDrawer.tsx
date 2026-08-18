import { Link } from 'react-router-dom';
import { FiX, FiPlus, FiMinus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { useCartStore } from '../../store/cartStore';
import './CartDrawer.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);

  const total = items.reduce((sum, i) => sum + i.priceValue * i.qty, 0);
  const totalFormatted = `UGX ${total.toLocaleString('en-UG')}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cart-backdrop${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`cart-drawer${isOpen ? ' open' : ''}`}
        aria-label="Shopping cart"
        aria-modal="true"
        role="dialog"
      >
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <FiShoppingBag />
            <span>Your Cart</span>
            {items.length > 0 && (
              <span className="cart-drawer-count">{items.reduce((s, i) => s + i.qty, 0)}</span>
            )}
          </div>
          <button type="button" className="cart-drawer-close" aria-label="Close cart" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <FiShoppingBag className="cart-empty-icon" />
              <p className="cart-empty-title">Your cart is empty</p>
              <p className="cart-empty-sub">Add products from the store to get started.</p>
              <Link to="/store" className="cart-empty-link" onClick={onClose}>Browse Store</Link>
            </div>
          ) : (
            <ul className="cart-item-list">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  {/* Colour swatch */}
                  <div className="cart-item-swatch" style={{ background: item.color }} />

                  {/* Info */}
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <div className="cart-item-meta">
                      {item.size && <span className="cart-item-size">{item.size}</span>}
                      <span className="cart-item-price">{item.price}</span>
                    </div>

                    {/* Qty controls */}
                    <div className="cart-item-qty">
                      <button
                        type="button"
                        className="cart-qty-btn"
                        aria-label="Decrease quantity"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                      >
                        <FiMinus />
                      </button>
                      <span className="cart-qty-value">{item.qty}</span>
                      <button
                        type="button"
                        className="cart-qty-btn"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                      >
                        <FiPlus />
                      </button>
                    </div>
                  </div>

                  {/* Line total + remove */}
                  <div className="cart-item-right">
                    <span className="cart-item-line-total">
                      UGX {(item.priceValue * item.qty).toLocaleString('en-UG')}
                    </span>
                    <button
                      type="button"
                      className="cart-item-remove"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-value">{totalFormatted}</span>
            </div>
            <Link
              to="/cart"
              className="cart-checkout-btn"
              onClick={onClose}
            >
              Review &amp; Place Order
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
