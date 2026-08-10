import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FiArrowRight, FiHash } from 'react-icons/fi';
import { GiTShirt, GiClothes, GiWaterBottle } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import './ShopByCategory.css';

type Category = {
  label: string;
  sublabel: string;
  slug: string;
  icon: ReactNode;
};

const CATEGORIES: Category[] = [
  { label: 'Jerseys', sublabel: 'Rep your team', slug: 'jerseys', icon: <GiTShirt /> },
  { label: 'Training Wear', sublabel: 'Train in style', slug: 'training-wear', icon: <GiClothes /> },
  { label: 'Caps & Hats', sublabel: 'Top off your look', slug: 'caps', icon: <FaHatCowboy /> },
  { label: 'Accessories', sublabel: 'Essentials you need', slug: 'accessories', icon: <GiWaterBottle /> },
  { label: 'Fan Gear', sublabel: 'Show your pride', slug: 'fan-gear', icon: <FiHash /> },
];

function ShopByCategory({
  storePath = '/store',
  categoryBasePath,
}: {
  storePath?: string;
  categoryBasePath?: string;
}) {
  return (
    <section className="store-panel shop-by-category" id="shop-by-category" aria-labelledby="shop-by-category-heading">
      <div className="store-panel-heading">
        <h2 id="shop-by-category-heading">Shop By Category</h2>
        <Link to={storePath} className="store-view-link">
          View all categories
          <FiArrowRight />
        </Link>
      </div>

      <div className="category-cards">
        {CATEGORIES.map((category) => (
          <Link
            to={categoryBasePath ? `${categoryBasePath}/${category.slug}` : storePath}
            className="category-card"
            key={category.label}
          >
            <span className="category-card-icon">{category.icon}</span>
            <span className="category-card-label">{category.label}</span>
            <span className="category-card-sublabel">{category.sublabel}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ShopByCategory;
