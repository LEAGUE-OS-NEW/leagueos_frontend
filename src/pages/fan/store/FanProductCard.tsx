import { useState } from 'react';
import { FiShoppingCart, FiPackage, FiCheck } from 'react-icons/fi';
import { GiTShirt, GiClothes } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import type { ClubProduct, ProductCategory } from '../../../services/storeService';
import { useCartStore, parseUGX } from '../../../store/cartStore';
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
  const addItem = useCartStore((s) => s.addItem);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      clubSlug: product.clubSlug,
      name: product.name,
      price: product.price,
      priceValue: parseUGX(product.price),
      size: selectedSize,
      color: product.accentColor,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="fan-product-card">
      <div className="fan-product-card-image" style={{ backgroundColor: product.accentColor }}>
        {product.badge && (
          <span className={`fan-product-badge fan-product-badge--${product.badge.startsWith('-') ? 'discount' : 'new'}`}>
            {product.badge}
          </span>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} className="fan-product-card-photo" />
        ) : (
          <span className="fan-product-card-icon">{productIcon(product.category)}</span>
        )}
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
              <span
                key={s}
                className={`fan-product-size${selectedSize === s ? ' selected' : ''}`}
                onClick={() => setSelectedSize(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSize(s)}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className={`fan-product-cart-btn${added ? ' in-cart' : ''}`}
          onClick={handleAdd}
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? <FiCheck /> : <FiShoppingCart />}
          {added ? 'Added!' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
