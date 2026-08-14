import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Circle, Shield, Bookmark, Clock, ArrowDown, Check,
} from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchApprovedStories, type AdminStory } from '../../../services/newsAdminService';
import '../sections/FanDashboard.css';
import './FanNewsPage.css';

const FILTERS = ['All', 'Football', 'Rugby', 'Basketball', 'Clubs'] as const;
type Filter = (typeof FILTERS)[number];

export default function FanNewsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchApprovedStories().then((data) => {
      if (!cancelled) { setStories(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const heroStory = stories.find((s) => s.isFeatured) ?? stories[0];
  const flaggedTrending = stories.filter((s) => s.isTrending);
  const trendingStories = (flaggedTrending.length > 0 ? flaggedTrending : stories).slice(0, 5);

  const q = search.trim().toLowerCase();
  const visible = stories.filter((s) => {
    const catOk = activeFilter === 'All' || s.category === activeFilter;
    const searchOk = !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    return catOk && searchOk;
  });

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="fan-dashboard-content">
          <div className="fn-inner">

            {/* Header */}
            <div className="fn-header">
              <div>
                <p className="fn-title">News &amp; Stories</p>
                <p className="fn-subtitle">The latest from Ugandan sport — football, rugby and basketball.</p>
              </div>
              <label className="fn-search">
                <FiSearch />
                <input
                  type="search"
                  placeholder="Search stories…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            {/* Hero story */}
            {heroStory && (
              <Link to={`/fan/news/${heroStory.id}`} className="fn-hero">
                <img src={heroStory.image} alt={heroStory.title} className="fn-hero-img" />
                <div className="fn-hero-overlay" />
                <div className="fn-hero-content">
                  <span className="fn-badge fn-badge-top">TOP STORY</span>
                  <p className="fn-hero-headline">{heroStory.title}</p>
                  <p className="fn-hero-desc">{heroStory.description}</p>
                  <div className="fn-hero-meta">
                    <Clock size={13} /> <span>{heroStory.time}</span> <span className="fn-dot">•</span> <span>{heroStory.category}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Filters */}
            <div className="fn-filters">
              {FILTERS.map((f) => (
                <button key={f} type="button"
                  className={`fn-chip${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {(f === 'Football' || f === 'Rugby' || f === 'Basketball') && <Circle size={13} />}
                  {f === 'Clubs' && <Shield size={13} />}
                  {f}
                </button>
              ))}
            </div>

            <div className="fn-layout">
              {/* Story grid */}
              <div className="fn-stories">
                {loading && <p className="fn-loading">Loading stories…</p>}

                {!loading && visible.length === 0 && (
                  <p className="fn-empty">No stories match your filter.</p>
                )}

                <div className="fn-story-grid">
                  {visible.map((story) => (
                    <article key={story.id} className="fn-card">
                      <div className="fn-card-img-wrap">
                        <Link to={`/fan/news/${story.id}`}>
                          <img src={story.image} alt={story.title} className="fn-card-img" />
                        </Link>
                        <span className={`fn-badge fn-badge-${story.category.toLowerCase()}`}>
                          {story.category.toUpperCase()}
                        </span>
                        <span className="fn-card-time"><Clock size={11} /> {story.time}</span>
                      </div>
                      <div className="fn-card-body">
                        <p className="fn-card-title">
                          <Link to={`/fan/news/${story.id}`} className="fn-card-link">{story.title}</Link>
                        </p>
                        <p className="fn-card-desc">{story.description}</p>
                        <div className="fn-card-footer">
                          <div className="fn-card-author">
                            <img src={story.avatar} alt={story.author} />
                            <span>By {story.author}</span>
                          </div>
                          <button type="button" className="fn-icon-btn" aria-label="Bookmark">
                            <Bookmark size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {!loading && visible.length > 0 && (
                  <button type="button" className="fn-load-more">
                    Load more stories <ArrowDown size={15} />
                  </button>
                )}
              </div>

              {/* Right sidebar */}
              <aside className="fn-aside">
                {/* Trending */}
                <div className="fn-panel">
                  <div className="fn-panel-header">
                    <h3>TRENDING</h3>
                    <span className="fn-panel-link">View all</span>
                  </div>
                  <ul className="fn-trending-list">
                    {trendingStories.map((story, index) => (
                      <Link to={`/fan/news/${story.id}`} key={story.id} className="fn-trending-item-link">
                        <li className="fn-trending-item">
                          <span className="fn-trending-rank">{index + 1}</span>
                          <img src={story.image} alt={story.title} className="fn-trending-img" />
                          <div>
                            <p className="fn-trending-title">{story.title}</p>
                            <span className="fn-trending-time">{story.time}</span>
                          </div>
                        </li>
                      </Link>
                    ))}
                  </ul>
                </div>

                {/* Newsletter */}
                <div className="fn-panel fn-newsletter">
                  <h3>STAY IN THE GAME</h3>
                  <p>Get the biggest stories, match previews and updates straight to your inbox.</p>
                  <input type="email" placeholder="Enter your email" className="fn-email-input" />
                  <button type="button" className="fn-subscribe-btn">Subscribe now</button>
                  <div className="fn-newsletter-note">
                    <Check size={13} /> <span>Join 25,000+ Ugandan fans</span>
                  </div>
                </div>
              </aside>
            </div>

          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
