import type { ReactNode } from 'react';
import { FiHash } from 'react-icons/fi';
import { GiTShirt, GiClothes, GiWaterBottle } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import type { CategorySlug } from './shopCategories';
import './ShopByCategory.css';

type Category = {
  label: string;
  sublabel: string;
  slug: CategorySlug;
  icon: ReactNode;
};

const CATEGORIES: Category[] = [
  { label: 'Jerseys',       sublabel: 'Rep your team',       slug: 'jerseys',       icon: <GiTShirt /> },
  { label: 'Training Wear', sublabel: 'Train in style',      slug: 'training-wear', icon: <GiClothes /> },
  { label: 'Caps & Hats',   sublabel: 'Top off your look',   slug: 'caps',          icon: <FaHatCowboy /> },
  { label: 'Accessories',   sublabel: 'Essentials you need', slug: 'accessories',   icon: <GiWaterBottle /> },
  { label: 'Fan Gear',      sublabel: 'Show your pride',     slug: 'fan-gear',      icon: <FiHash /> },
];

function ShopByCategory({
  activeCategory = 'all',
  onSelect,
}: {
  activeCategory?: CategorySlug;
  onSelect?: (slug: CategorySlug) => void;
}) {
  return (
    <section className="store-panel shop-by-category" id="shop-by-category" aria-labelledby="shop-by-category-heading">
      <div className="store-panel-heading">
        <h2 id="shop-by-category-heading">Shop By Category</h2>
        {activeCategory !== 'all' && (
          <button
            type="button"
            className="store-view-link"
            onClick={() => onSelect?.('all')}
          >
            Clear filter ×
          </button>
        )}
      </div>

      <div className="category-cards">
        {CATEGORIES.map((category) => (
          <button
            type="button"
            className={`category-card${activeCategory === category.slug ? ' category-card--active' : ''}`}
            key={category.label}
            onClick={() =>
              onSelect?.(activeCategory === category.slug ? 'all' : category.slug)
            }
            aria-pressed={activeCategory === category.slug}
          >
            <span className="category-card-icon">{category.icon}</span>
            <span className="category-card-label">{category.label}</span>
            <span className="category-card-sublabel">{category.sublabel}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default ShopByCategory;
