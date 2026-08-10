import { useEffect, useState, type ReactElement } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronLeft, FiPackage } from 'react-icons/fi';
import { GiTShirt, GiClothes } from 'react-icons/gi';
import { FaHatCowboy } from 'react-icons/fa';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchClubs, type ClubSummary } from '../../../services/clubsService';
import {
  fetchProductsByCategory,
  CATEGORY_SLUG_MAP,
  CATEGORY_META,
  type ClubProduct,
  type ProductCategory,
} from '../../../services/storeService';
import { FanProductCard } from './FanProductCard';
import '../sections/FanDashboard.css';
import './FanProductCard.css';
import './FanStoreCategoryPage.css';

function CategoryHeroIcon({ category }: { category: ProductCategory }) {
  const icons: Record<ProductCategory, ReactElement> = {
    Jersey: <GiTShirt />,
    'Training Wear': <GiClothes />,
    Cap: <FaHatCowboy />,
    Accessory: <GiClothes />,
    'Fan Gear': <FiPackage />,
    Scarf: <GiClothes />,
    Bundle: <FiPackage />,
  };
  return <span className="fscp-hero-icon">{icons[category]}</span>;
}

function FanStoreCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();

  const category: ProductCategory | undefined = categorySlug
    ? CATEGORY_SLUG_MAP[categorySlug]
    : undefined;

  const meta = category ? CATEGORY_META[category] : null;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<ClubProduct[]>([]);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [activeClub, setActiveClub] = useState<string>('all');
  const [loading, setLoading] = useState(!!category);

  useEffect(() => {
    if (!category) return;
    Promise.all([fetchProductsByCategory(category), fetchClubs()]).then(([prods, allClubs]) => {
      setProducts(prods);
      const presentSlugs = new Set(prods.map((p) => p.clubSlug));
      setClubs(allClubs.filter((c) => presentSlugs.has(c.slug)));
      setLoading(false);
    });
  }, [category]);

  const displayed = activeClub === 'all'
    ? products
    : products.filter((p) => p.clubSlug === activeClub);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content">
          <div className="fscp-inner">

            <Link to="/fan/store" className="fscp-back">
              <FiChevronLeft /> Back to Store
            </Link>

            {!meta ? (
              <div className="fscp-not-found">
                <p className="fscp-not-found-title">Category not found</p>
                <p>That category doesn't exist. <Link to="/fan/store">Browse the store</Link> instead.</p>
              </div>
            ) : (
              <>
                {/* ── Category header ── */}
                <div className="fscp-header">
                  {category && <CategoryHeroIcon category={category} />}
                  <div className="fscp-header-text">
                    <h1 className="fscp-title">{meta.label}</h1>
                    <p className="fscp-desc">{meta.description}</p>
                  </div>
                  <span className="fscp-count">
                    {loading ? '—' : displayed.length} product{displayed.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* ── Club filter chips ── */}
                {!loading && clubs.length > 0 && (
                  <div className="fscp-filters" role="group" aria-label="Filter by club">
                    <button
                      type="button"
                      className={`fscp-chip${activeClub === 'all' ? ' active' : ''}`}
                      onClick={() => setActiveClub('all')}
                    >
                      All clubs
                    </button>
                    {clubs.map((club) => (
                      <button
                        key={club.slug}
                        type="button"
                        className={`fscp-chip${activeClub === club.slug ? ' active' : ''}`}
                        onClick={() => setActiveClub(club.slug)}
                      >
                        {club.crest && (
                          <img src={club.crest} alt="" className="fscp-chip-crest" aria-hidden="true" />
                        )}
                        {club.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Product grid ── */}
                {loading ? (
                  <p className="fscp-loading">Loading products…</p>
                ) : displayed.length === 0 ? (
                  <div className="fscp-empty">
                    <p className="fscp-empty-title">No products found</p>
                    <p>Try selecting a different club filter.</p>
                  </div>
                ) : (
                  <div className="fscp-grid">
                    {displayed.map((product) => (
                      <FanProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanStoreCategoryPage;
