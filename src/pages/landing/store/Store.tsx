import { useState } from 'react';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import StoreHero from './sections/StoreHero';
import ShopByCategory from './sections/ShopByCategory';
import type { CategorySlug } from './sections/shopCategories';
import FeaturedClubStores from './sections/FeaturedClubStores';
import ProductShowcase from './sections/ProductShowcase';
import CommunityBanner from './sections/CommunityBanner';
import './Store.css';

function Store() {
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('all');

  return (
    <div className="store-page">
      <Navbar />

      <main className="store-main">
        <div className="store-main-inner">
          <StoreHero />
          <ShopByCategory
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
          <FeaturedClubStores />
          <ProductShowcase activeCategory={activeCategory} />
          <CommunityBanner />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Store;
