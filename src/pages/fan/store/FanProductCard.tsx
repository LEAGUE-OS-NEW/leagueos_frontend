import { useState } from 'react';
import { FiShoppingCart, FiPackage } from 'react-icons/fi';
import { GiTShirt, GiClothes } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import type { ClubProduct, ProductCategory } from '../../../services/storeService';
import './FanProductCard.css';

function productIcon(category: ProductCategory) {
  switch (category) {
    case 'Jersey': return <GiTShirt />;
    case 'Training Wear': return <GiClothes />;
    case 'Cap': return <FaHatCowboy />;
    case 'Bundle': return <FiPackage />;
    default: return <GiClothes />;
  }
}

export function FanProductCard({ product }: { product: ClubProduct }) {
  const [inCart, setInCart] = useState(false);

  return (
    <article className="fan-product-card">
      <div className="fan-product-card-image" style={{ backgroundColor: product.accentColor }}>
        {product.badge && (
          <span className={`fan-product-badge fan-product-badge--${product.badge.startsWith('-') ? 'discount' : 'new'}`}>
            {product.badge}
          </span>
        )}
        <span className="fan-product-card-icon">{productIcon(product.category)}</span>
      </div>

      <div className="fan-product-card-body">
        <p className="fan-product-card-category">{product.category}</p>
        <p className="fan-product-card-name">{product.name}</p>

        <p className="fan-product-card-price">
          {product.price}
          {product.originalPrice && (
            <span className="fan-product-card-original">{product.originalPrice}</span>
          )}
        </p>

        {product.sizes && (
          <div className="fan-product-card-sizes">
            {product.sizes.map((s) => (
              <span className="fan-product-size" key={s}>{s}</span>
            ))}
          </div>
        )}

        <button
          type="button"
          className={`fan-product-cart-btn${inCart ? ' in-cart' : ''}`}
          onClick={() => setInCart(true)}
          aria-label={`Add ${product.name} to cart`}
        >
          <FiShoppingCart />
          {inCart ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
