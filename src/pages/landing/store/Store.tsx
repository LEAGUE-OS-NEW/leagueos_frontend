import { useEffect, useState } from 'react';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import StoreHero from './sections/StoreHero';
import ShopByCategory from './sections/ShopByCategory';
import type { CategorySlug } from './sections/shopCategories';
import FeaturedClubStores from './sections/FeaturedClubStores';
import ProductShowcase from './sections/ProductShowcase';
import CommunityBanner from './sections/CommunityBanner';
import { fetchClubs, type ClubSummary } from '../../../services/clubsService';
import { fetchClubProducts, type ClubMerchandiseProduct } from '../../../services/clubStoreService';
import { useClubProductStore, toCategorySlug, CATEGORY_COLORS } from '../../../store/clubProductStore';
import type { StoreProduct } from '../../../store/clubProductStore';
import './Store.css';

function priceFromApi(apiPrice: string, currency = 'UGX'): string {
  const num = Math.round(Number(apiPrice));
  return num > 0 ? `${currency} ${num.toLocaleString('en-US')}` : apiPrice;
}

function toStoreProduct(p: ClubMerchandiseProduct, club: ClubSummary): StoreProduct {
  const catName = (p.metadata?.cat as string) ?? 'Other';
  const category = toCategorySlug(catName);
  const priceNum = Math.round(Number(p.price));
  const image = (p.metadata?.image as string) || undefined;
  return {
    id: p.id,
    clubSlug: club.slug,
    clubName: club.name,
    name: p.name,
    category,
    price: priceFromApi(p.price, p.currency),
    priceValue: priceNum,
    description: p.description || undefined,
    sku: p.sku || undefined,
    stock: p.available_stock ?? p.stock,
    image,
    accentColor: CATEGORY_COLORS[category] ?? '#7c3aed',
    createdAt: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
  };
}

function Store() {
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('all');
  const replaceAll = useClubProductStore(s => s.replaceAll);

  // Seed the product store from the backend on mount
  useEffect(() => {
    let cancelled = false;
    fetchClubs()
      .then(clubs => {
        if (cancelled) return;
        const clubsWithIds = clubs.filter(c => !!c.id);
        return Promise.all(
          clubsWithIds.map(c =>
            fetchClubProducts(c.id!)
              .then(prods => ({ club: c, prods }))
              .catch(() => ({ club: c, prods: [] as ClubMerchandiseProduct[] })),
          ),
        );
      })
      .then(results => {
        if (cancelled || !results) return;
        const storeProducts: StoreProduct[] = results.flatMap(({ club, prods }) =>
          prods
            .filter(p => (p.available_stock ?? p.stock) > 0)
            .map(p => toStoreProduct(p, club)),
        );
        if (storeProducts.length > 0) replaceAll(storeProducts);
      })
      .catch(() => {/* silently fall back to cached store */});
    return () => { cancelled = true; };
  }, [replaceAll]);

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
