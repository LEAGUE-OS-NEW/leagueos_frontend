import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { FiArrowRight, FiStar, FiShoppingCart, FiCheck } from 'react-icons/fi';
import { GiTShirt, GiClothes } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import type { CategorySlug } from './shopCategories';
import { useCartStore, parseUGX } from '../../../../store/cartStore';
import './ProductShowcase.css';

type Product = {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: number;
  sizes?: string[];
  badge?: { label: string; tone: 'new' | 'discount' };
  icon: IconType;
  color: string;
  category: CategorySlug;
};

type ProductColumn = {
  title: string;
  products: Product[];
};

const COLUMNS: ProductColumn[] = [
  {
    title: 'New Arrivals',
    products: [
      {
        id: 'vipers-home-jersey',
        name: 'Vipers SC Home Jersey 2024/25',
        price: 'UGX 120,000',
        rating: 4.8,
        reviews: 26,
        sizes: ['S', 'M', 'L', 'XL'],
        badge: { label: 'NEW', tone: 'new' },
        icon: GiTShirt,
        color: '#dc2626',
        category: 'jerseys',
      },
      {
        id: 'kcca-training-top',
        name: 'KCCA FC Training Top Navy 2024',
        price: 'UGX 85,000',
        rating: 4.6,
        reviews: 15,
        sizes: ['S', 'M', 'L', 'XL'],
        icon: GiTShirt,
        color: '#1e3a8a',
        category: 'training-wear',
      },
    ],
  },
  {
    title: 'Best Sellers',
    products: [
      {
        id: 'vipers-away-jersey',
        name: 'Vipers SC Away Jersey 2024/25',
        price: 'UGX 120,000',
        rating: 4.6,
        reviews: 42,
        sizes: ['S', 'M', 'L', 'XL'],
        icon: GiTShirt,
        color: '#dc2626',
        category: 'jerseys',
      },
      {
        id: 'oilers-home-jersey',
        name: 'City Oilers Jersey Home 2024',
        price: 'UGX 95,000',
        rating: 4.7,
        reviews: 31,
        sizes: ['S', 'M', 'L', 'XL'],
        icon: GiTShirt,
        color: '#1d4ed8',
        category: 'jerseys',
      },
    ],
  },
  {
    title: 'Matchday Offers',
    products: [
      {
        id: 'vipers-matchday-bundle',
        name: 'Vipers SC Matchday Bundle Jersey + Cap',
        price: 'UGX 144,500',
        originalPrice: 'UGX 170,000',
        rating: 4.8,
        reviews: 18,
        badge: { label: '-15%', tone: 'discount' },
        icon: GiTShirt,
        color: '#dc2626',
        category: 'jerseys',
      },
      {
        id: 'kcca-matchday-bundle',
        name: 'KCCA FC Matchday Bundle Jersey + Scarf',
        price: 'UGX 136,000',
        originalPrice: 'UGX 170,000',
        rating: 4.7,
        reviews: 22,
        badge: { label: '-20%', tone: 'discount' },
        icon: GiTShirt,
        color: '#ca8a04',
        category: 'accessories',
      },
    ],
  },
  {
    title: 'Fan Favourites',
    products: [
      {
        id: 'black-pirates-cap',
        name: 'Black Pirates Cap',
        price: 'UGX 45,000',
        rating: 4.6,
        reviews: 38,
        icon: FaHatCowboy,
        color: '#18181b',
        category: 'caps',
      },
      {
        id: 'heathens-scarf',
        name: 'Heathens RC Scarf',
        price: 'UGX 30,000',
        rating: 4.5,
        reviews: 21,
        icon: GiClothes,
        color: '#7f1d1d',
        category: 'fan-gear',
      },
    ],
  },
];

function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      clubSlug: product.id.split('-')[0], // derive club from product id prefix
      name: product.name,
      price: product.price,
      priceValue: parseUGX(product.price),
      size: selectedSize,
      color: product.color,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="product-card">
      <div className="product-card-image" style={{ backgroundColor: product.color }}>
        {product.badge && <span className={`product-card-badge product-card-badge--${product.badge.tone}`}>{product.badge.label}</span>}
        <product.icon className="product-card-icon" />
      </div>

      <p className="product-card-name">{product.name}</p>

      <p className="product-card-price">
        {product.price}
        {product.originalPrice && <span className="product-card-original-price">{product.originalPrice}</span>}
      </p>

      <p className="product-card-rating">
        <FiStar />
        {product.rating.toFixed(1)} ({product.reviews})
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

function ProductShowcase({
  storePath = '/store',
  activeCategory = 'all',
}: {
  storePath?: string;
  activeCategory?: CategorySlug;
}) {
  // Filter columns — hide columns whose every product is excluded,
  // and filter individual products within each column.
  const visibleColumns = COLUMNS.map(col => ({
    ...col,
    products: activeCategory === 'all'
      ? col.products
      : col.products.filter(p => p.category === activeCategory),
  })).filter(col => col.products.length > 0);

  return (
    <section className="product-showcase" aria-label="Product showcase">
      {visibleColumns.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '24px 0' }}>
          No products found in this category.
        </p>
      ) : (
        visibleColumns.map((column) => (
          <div className="product-column" key={column.title}>
            <div className="product-column-heading">
              <h2>{column.title}</h2>
              <Link to={storePath} className="store-view-link">
                View all
                <FiArrowRight />
              </Link>
            </div>

            <div className="product-column-list">
              {column.products.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export default ProductShowcase;
