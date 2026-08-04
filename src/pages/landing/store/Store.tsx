import Navbar from '../../../components/landing/Navbar';
import StoreFooter from '../../../components/storefooter/StoreFooter';
import StoreHero from './sections/StoreHero';
import ShopByCategory from './sections/ShopByCategory';
import FeaturedClubStores from './sections/FeaturedClubStores';
import ProductShowcase from './sections/ProductShowcase';
import TrustBar from './sections/TrustBar';
import CommunityBanner from './sections/CommunityBanner';
import './Store.css';

function Store() {
  return (
    <div className="store-page">
      <Navbar />

      <main className="store-main">
        <div className="store-main-inner">
          <StoreHero />
          <ShopByCategory />
          <FeaturedClubStores />
          <ProductShowcase />
          <TrustBar />
          <CommunityBanner />
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}

export default Store;
