import { useEffect, useState } from 'react';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import ShopByCategory from '../../landing/store/sections/ShopByCategory';
import type { CategorySlug } from '../../landing/store/sections/shopCategories';
import FeaturedClubStores from '../../landing/store/sections/FeaturedClubStores';
import ProductShowcase from '../../landing/store/sections/ProductShowcase';
import CommunityBanner from '../../landing/store/sections/CommunityBanner';
import { fetchFollowedClubSlugs, fetchClubs, type ClubSummary } from '../../../services/clubsService';
import { fetchPublicStoreProducts, type ClubMerchandiseProduct } from '../../../services/clubStoreService';
import { useClubProductStore, toCategorySlug, CATEGORY_COLORS } from '../../../store/clubProductStore';
import type { StoreProduct } from '../../../store/clubProductStore';
import type { ClubProduct, ProductCategory } from '../../../services/storeService';
import { FanProductCard } from './FanProductCard';
import '../sections/FanDashboard.css';
import '../../landing/store/Store.css';
import './FanProductCard.css';
import './FanStorePage.css';

const CAT_TO_PRODUCT_CATEGORY: Record<string, ProductCategory> = {
  Apparel: 'Jersey',
  Training: 'Training Wear',
  'Fan Gear': 'Fan Gear',
  Accessories: 'Accessory',
  Other: 'Fan Gear',
};

const STORE_CATEGORY_TO_PRODUCT_CATEGORY: Record<StoreProduct['category'], ProductCategory> = {
  all: 'Fan Gear',
  jerseys: 'Jersey',
  'training-wear': 'Training Wear',
  caps: 'Cap',
  scarves: 'Scarf',
  bundles: 'Bundle',
  accessories: 'Accessory',
  'fan-gear': 'Fan Gear',
};

function priceFromApi(apiPrice: string, currency = 'UGX'): string {
  const num = Math.round(Number(apiPrice));
  return num > 0 ? `${currency} ${num.toLocaleString('en-US')}` : apiPrice;
}

function toClubProduct(p: ClubMerchandiseProduct, clubSlug: string): ClubProduct {
  const catName = (p.metadata?.cat as string) ?? 'Fan Gear';
  const category = CAT_TO_PRODUCT_CATEGORY[catName] ?? 'Fan Gear';
  const image = (p.metadata?.image as string) || undefined;
  const price = priceFromApi(p.price, p.currency);
  return {
    id: p.id,
    clubSlug,
    name: p.name,
    category,
    price,
    originalPrice: (p.metadata?.originalPrice as string) || undefined,
    accentColor: CATEGORY_COLORS[toCategorySlug(catName)] ?? '#7c3aed',
    badge: (p.metadata?.badge as string) || undefined,
    sizes: Array.isArray(p.metadata?.sizes) ? p.metadata.sizes.filter((s): s is string => typeof s === 'string') : undefined,
    image,
  };
}

function toStoreProduct(p: ClubMerchandiseProduct): StoreProduct {
  const catName = (p.metadata?.cat as string) ?? 'Other';
  const category = toCategorySlug(catName);
  const priceNum = Math.round(Number(p.price));
  const image = (p.metadata?.image as string) || undefined;
  return {
    id: p.id,
    clubSlug: p.club_slug ?? p.club,
    clubName: p.club_name ?? 'Club Store',
    name: p.name,
    category,
    price: priceFromApi(p.price, p.currency),
    priceValue: priceNum,
    description: p.description || undefined,
    sku: p.sku || undefined,
    stock: p.available_stock ?? p.stock,
    image,
    originalPrice: (p.metadata?.originalPrice as string) || undefined,
    badge: (p.metadata?.badge as string) || undefined,
    sizes: Array.isArray(p.metadata?.sizes) ? p.metadata.sizes.filter((s): s is string => typeof s === 'string') : undefined,
    accentColor: CATEGORY_COLORS[category] ?? '#7c3aed',
    createdAt: p.published_at ? new Date(p.published_at).getTime() : Date.now(),
  };
}

function cachedToClubProduct(product: StoreProduct): ClubProduct {
  return {
    id: product.id,
    clubSlug: product.clubSlug,
    name: product.name,
    category: STORE_CATEGORY_TO_PRODUCT_CATEGORY[product.category] ?? 'Fan Gear',
    price: product.price,
    originalPrice: product.originalPrice,
    accentColor: product.accentColor,
    badge: product.badge,
    sizes: product.sizes,
    image: product.image,
  };
}

// The public products endpoint currently returns one row per product per
// size/variant (a backend join issue), so the same product id can appear
// several times in a row. Collapse to one entry per id here as a stop-gap
// until the API is fixed, so the storefront doesn't show visible dupes.
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return Array.from(seen.values());
}

function SportBadge({ sport }: { sport: string }) {
  return <span className={`fsp-sport-badge fsp-sport-badge--${sport.toLowerCase()}`}>{sport}</span>;
}

function CrestPlaceholder() {
  return (
    <div className="fsp-crest-placeholder" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    </div>
  );
}

function FanStorePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [followedClubs, setFollowedClubs] = useState<ClubSummary[]>([]);
  const [products, setProducts] = useState<ClubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('all');
  const replaceAll = useClubProductStore(s => s.replaceAll);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([fetchFollowedClubSlugs(), fetchClubs(), fetchPublicStoreProducts()])
      .then(([slugsResult, clubsResult, productsResult]) => {
        if (cancelled) return;
        const slugs = slugsResult.status === 'fulfilled' ? slugsResult.value : [];
        const allClubs = clubsResult.status === 'fulfilled' ? clubsResult.value : [];
        const publicProducts = productsResult.status === 'fulfilled'
          ? dedupeById(productsResult.value)
          : [];
        const clubs = allClubs.filter(c => slugs.includes(c.slug));
        setFollowedClubs(clubs);
        const fanProducts: ClubProduct[] = [];
        const storeProducts: StoreProduct[] = [];

        for (const product of publicProducts) {
          const slug = product.club_slug ?? product.club;

          storeProducts.push(toStoreProduct(product));
          if (slugs.includes(slug)) {
            fanProducts.push(toClubProduct(product, slug));
          }
        }

        if (productsResult.status === 'fulfilled') replaceAll(storeProducts);
        setProducts(
          productsResult.status === 'fulfilled' && fanProducts.length > 0
            ? fanProducts
            : dedupeById(
                useClubProductStore.getState().products
                  .filter(p => slugs.includes(p.clubSlug))
                  .map(cachedToClubProduct),
              ),
        );
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [replaceAll]);

  const clubProducts = (slug: string) => products.filter(p => p.clubSlug === slug);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content">
          <div className="fan-store-inner">

            {/* ── Personalized section ── */}
            <section className="fan-store-section fan-your-store store-panel">
              <div className="store-panel-heading">
                <h2>Your Club Store</h2>
                <span className="fsp-followed-count">
                  {followedClubs.length} club{followedClubs.length !== 1 ? 's' : ''} you follow
                </span>
              </div>

              {loading ? (
                <p className="fsp-loading">Loading your picks…</p>
              ) : followedClubs.length === 0 ? (
                <div className="fsp-empty">
                  <p className="fsp-empty-title">Follow clubs to see their products here</p>
                  <p>Head to the Clubs section and follow the teams you support.</p>
                </div>
              ) : (
                <div className="fsp-club-list">
                  {followedClubs.map(club => (
                    <div key={club.slug} className="fsp-club-section">
                      <div className="fsp-club-header">
                        {club.crest ? (
                          <img src={club.crest} alt={`${club.name} crest`} className="fsp-crest" />
                        ) : (
                          <CrestPlaceholder />
                        )}
                        <span className="fsp-club-name">{club.name}</span>
                        <SportBadge sport={club.sport} />
                      </div>

                      {clubProducts(club.slug).length === 0 ? (
                        <p className="fsp-no-products">No products listed yet for this club.</p>
                      ) : (
                        <div className="fsp-products-grid">
                          {clubProducts(club.slug).slice(0, 3).map(product => (
                            <FanProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── General store sections ── */}
            <ShopByCategory activeCategory={activeCategory} onSelect={setActiveCategory} />
            <FeaturedClubStores clubsPath="/fan/clubs" />
            <ProductShowcase storePath="/fan/store" activeCategory={activeCategory} />
            <CommunityBanner />

          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanStorePage;