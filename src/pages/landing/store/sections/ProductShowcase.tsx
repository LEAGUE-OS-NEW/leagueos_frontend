import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShoppingCart, FiCheck, FiImage } from 'react-icons/fi';
import type { CategorySlug } from './shopCategories';
import { useCartStore } from '../../../../store/cartStore';
import { useClubProductStore, type StoreProduct } from '../../../../store/clubProductStore';
import './ProductShowcase.css';

// ── Unified product shape for display ────────────────────────────────────────
interface DisplayProduct {
  id: string;
  clubSlug: string;
  name: string;
  price: string;
  priceValue: number;
  originalPrice?: string;
  sizes?: string[];
  badge?: string;
  image?: string;
  color: string;
  category: CategorySlug;
  isNew: boolean;
}

function ProductCard({ product }: { product: DisplayProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product.sizes?.[0]);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      clubSlug: product.clubSlug,
      name: product.name,
      price: product.price,
      priceValue: product.priceValue,
      size: selectedSize,
      color: product.color,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="product-card">
      <div className="product-card-image" style={{ backgroundColor: product.color }}>
        {product.badge && (
          <span className={`product-card-badge product-card-badge--${product.badge.startsWith('-') ? 'discount' : 'new'}`}>
            {product.badge}
          </span>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-card-photo" />
        ) : (
          <FiImage className="product-card-icon" />
        )}
      </div>

      <p className="product-card-name">{product.name}</p>

      <p className="product-card-price">
        {product.price}
        {product.originalPrice && (
          <span className="product-card-original-price">{product.originalPrice}</span>
        )}
      </p>

      <div className="product-card-footer">
        {product.sizes && (
          <div className="product-card-sizes">
            {product.sizes.map((size) => (
              <span
                key={size}
                className={`product-card-size${selectedSize === size ? ' selected' : ''}`}
                onClick={() => setSelectedSize(size)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSize(size)}
              >
                {size}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`product-card-cart-btn${added ? ' added' : ''}`}
          aria-label={`Add ${product.name} to cart`}
          onClick={handleAdd}
        >
          {added ? <FiCheck /> : <FiShoppingCart />}
        </button>
      </div>
    </article>
  );
}

// ── Convert a StoreProduct → DisplayProduct ───────────────────────────────────
function toDisplay(p: StoreProduct): DisplayProduct {
  return {
    id: p.id,
    clubSlug: p.clubSlug,
    name: p.name,
    price: p.price,
    priceValue: p.priceValue,
    originalPrice: p.originalPrice,
    sizes: p.sizes,
    badge: p.badge,
    image: p.image,
    color: p.accentColor,
    category: p.category,
    isNew: MODULE_LOAD_TIME - p.createdAt < ONE_WEEK_MS,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
function uniqueById(products: StoreProduct[]): StoreProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Snapshot time at module load — products created before this are not "new"
const MODULE_LOAD_TIME = Date.now();

function ProductShowcase({
  storePath = '/store',
  activeCategory = 'all',
}: {
  storePath?: string;
  activeCategory?: CategorySlug;
}) {
  const allProducts = useClubProductStore((s) => s.products);

  // Filter by category
  const filtered = uniqueById(activeCategory === 'all'
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory)
  ).filter((p) => p.stock > 0); // only in-stock products

  if (filtered.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '24px 0' }}>
        {activeCategory === 'all'
          ? 'No products available yet.'
          : 'No products found in this category.'}
      </p>
    );
  }

  // Group: newest first in "New Arrivals", rest in "All Products"
  const now = MODULE_LOAD_TIME;
  const newArrivals = filtered.filter((p) => now - p.createdAt < ONE_WEEK_MS);
  const rest = filtered.filter((p) => now - p.createdAt >= ONE_WEEK_MS);

  const columns = [
    ...(newArrivals.length > 0 ? [{ title: 'New Arrivals', products: newArrivals }] : []),
    ...(rest.length > 0 ? [{ title: 'All Products', products: rest }] : []),
    // If everything is new, just show one column
    ...(newArrivals.length > 0 && rest.length === 0 ? [] : []),
  ];

  // Edge case: all products are new — show one column
  const display = columns.length > 0 ? columns : [{ title: 'Products', products: filtered }];

  return (
    <section className="product-showcase" aria-label="Product showcase">
      {display.map((column) => (
        <div className="product-column" key={column.title}>
          <div className="product-column-heading">
            <h2>{column.title}</h2>
            <Link to={storePath} className="store-view-link">
              View all <FiArrowRight />
            </Link>
          </div>
          <div className="product-column-list">
            {column.products.map((p) => (
              <ProductCard product={toDisplay(p)} key={p.id} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default ProductShowcase;
