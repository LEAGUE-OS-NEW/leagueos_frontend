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
import { fetchProductsForClubs, type ClubProduct } from '../../../services/storeService';
import { FanProductCard } from './FanProductCard';
import '../sections/FanDashboard.css';
import '../../landing/store/Store.css';
import './FanProductCard.css';
import './FanStorePage.css';

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

  useEffect(() => {
    Promise.all([fetchFollowedClubSlugs(), fetchClubs()]).then(([slugs, allClubs]) => {
      const clubs = allClubs.filter((c) => slugs.includes(c.slug));
      setFollowedClubs(clubs);
      return fetchProductsForClubs(slugs);
    }).then((prods) => {
      setProducts(prods);
      setLoading(false);
    });
  }, []);

  const clubProducts = (slug: string) => products.filter((p) => p.clubSlug === slug);

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
                  {followedClubs.map((club) => (
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
                          {clubProducts(club.slug).slice(0, 3).map((product) => (
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
