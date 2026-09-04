import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Clock, ArrowDown, ArrowUp } from 'lucide-react';
import { FiCircle } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchClubs, fetchFollowedClubSlugs } from '../../../services/clubsService';
import { fetchNews, type Story } from '../../../services/newsService';
import '../sections/FanDashboard.css';
import './FanNewsPage.css';

/* ---------- constants ---------- */

const FILTERS = ['For You', 'Football', 'Basketball', 'Rugby'] as const;
type Filter = (typeof FILTERS)[number];

const INITIAL_COUNT = 6; // 2 rows × 3 columns

const TRENDING_COUNT = 6;

/* ---------- helpers ---------- */

/** Maps a story's backend category to one of the four trending labels. */
function trendingCategory(category: string): string {
  switch (category) {
    case 'Football':
    case 'Rugby':
    case 'Basketball': return 'Sports News';
    case 'Fantasy':    return 'Fantasy';
    case 'Markets':    return 'Market';
    default:           return 'Club News';
  }
}

/** CSS modifier for the trending category badge. */
function trendingBadgeMod(category: string): string {
  switch (category) {
    case 'Football':
    case 'Rugby':
    case 'Basketball': return 'sports';
    case 'Fantasy':    return 'fantasy';
    case 'Markets':    return 'market';
    default:           return 'club';
  }
}

// Prefer followed clubs when we can resolve them; otherwise fall back to the
// full feed so the page still has content.
function forYouStories(stories: Story[], followedClubIds: Set<string>): Story[] {
  if (followedClubIds.size === 0) return stories;
  const selected = stories.filter((story) => story.club && followedClubIds.has(story.club));
  return selected.length > 0 ? selected : stories;
}

/* ---------- component ---------- */

export default function FanNewsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('For You');
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [followedClubIds, setFollowedClubIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchNews(), fetchFollowedClubSlugs(), fetchClubs()]).then(([news, slugs, clubs]) => {
      if (cancelled) return;
      const clubIds = new Set(
        slugs
          .map((slug) => clubs.find((club) => club.slug === slug)?.id)
          .filter((id): id is string => Boolean(id)),
      );
      setStories(news);
      setFollowedClubIds(clubIds);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Reset pagination when filter changes
  const handleFilterChange = useCallback((f: Filter) => {
    setActiveFilter(f);
    setVisibleCount(INITIAL_COUNT);
  }, []);

  // Apply sport filter to main feed
  const filtered: Story[] =
    activeFilter === 'For You'
      ? forYouStories(stories, followedClubIds)
      : stories.filter((s) => s.category === activeFilter);

  const heroStory: Story | undefined =
    filtered.find((s) => s.isFeatured) ?? filtered[0];

  // Grid excludes the hero so it doesn't appear twice
  const gridStories = heroStory
    ? filtered.filter((s) => s.id !== heroStory.id)
    : filtered;

  const displayed = gridStories.slice(0, visibleCount);
  const hasMore = visibleCount < gridStories.length;
  const hasExpanded = visibleCount > INITIAL_COUNT;

  // Trending — platform-wide (not filtered), prefer flagged isTrending stories
  const flaggedTrending = stories.filter((s) => s.isTrending);
  const trendingStories = (flaggedTrending.length > 0 ? flaggedTrending : stories).slice(0, TRENDING_COUNT);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="fan-dashboard-content">
          <div className="fn-inner">

            {/* ── Page heading ── */}
            <div className="fn-header">
              <p className="fn-title">YOUR SPORTS FEED</p>
              <p className="fn-subtitle">News and updates from clubs you follow.</p>
            </div>

            {/* ── Sport filters ── */}
            <div className="fn-filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`fn-chip${activeFilter === f ? ' active' : ''}`}
                  onClick={() => handleFilterChange(f)}
                >
                  {f !== 'For You' && <FiCircle size={12} />}
                  {f}
                </button>
              ))}
            </div>

            {/* ── Hero ── */}
            {!loading && heroStory && (
              <Link to={`/fan/news/${heroStory.id}`} className="fn-hero">
                <img src={heroStory.image} alt={heroStory.title} className="fn-hero-img" />
                <div className="fn-hero-overlay" />
                <div className="fn-hero-content">
                  <span className="fn-badge fn-badge-club-label">LATEST FROM YOUR CLUB</span>
                  <p className="fn-hero-headline">{heroStory.title}</p>
                  <p className="fn-hero-desc">{heroStory.description}</p>
                  <div className="fn-hero-meta">
                    <Clock size={13} />
                    <span>{heroStory.time}</span>
                    <span className="fn-dot">•</span>
                    <span>{heroStory.category}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* ── Main layout: feed + sidebar ── */}
            <div className="fn-layout">

              {/* ── Left: personalised story feed ── */}
              <div className="fn-stories">
                <h2 className="fn-section-heading">LATEST FROM YOUR CLUB</h2>

                {loading && <p className="fn-loading">Loading stories…</p>}

                {!loading && gridStories.length === 0 && (
                  <p className="fn-empty">No stories available right now.</p>
                )}

                <div className="fn-story-grid">
                  {displayed.map((story) => (
                    <article key={story.id} className="fn-card">
                      <div className="fn-card-img-wrap">
                        <Link to={`/fan/news/${story.id}`}>
                          <img src={story.image} alt={story.title} className="fn-card-img" />
                        </Link>
                        <span className={`fn-badge fn-badge-${story.category.toLowerCase()}`}>
                          {story.category.toUpperCase()}
                        </span>
                        <span className="fn-card-time">
                          <Clock size={11} /> {story.time}
                        </span>
                      </div>
                      <div className="fn-card-body">
                        <p className="fn-card-title">
                          <Link to={`/fan/news/${story.id}`} className="fn-card-link">
                            {story.title}
                          </Link>
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

                {/* Load more / View less */}
                {!loading && gridStories.length > INITIAL_COUNT && (
                  <div className="fn-pagination">
                    {hasMore ? (
                      <button
                        type="button"
                        className="fn-load-more"
                        onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
                      >
                        Load more <ArrowDown size={15} />
                      </button>
                    ) : hasExpanded ? (
                      <button
                        type="button"
                        className="fn-load-more"
                        onClick={() => setVisibleCount(INITIAL_COUNT)}
                      >
                        View less <ArrowUp size={15} />
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Right: platform-wide trending ── */}
              <aside className="fn-aside">
                <div className="fn-panel">
                  <div className="fn-panel-header">
                    <h3>TRENDING</h3>
                  </div>

                  {trendingStories.length === 0 && !loading && (
                    <p className="fn-empty">No trending stories right now.</p>
                  )}

                  <ul className="fn-trending-list">
                    {trendingStories.map((story) => (
                      <li key={story.id} className="fn-trending-item">
                        <Link to={`/fan/news/${story.id}`} className="fn-trending-link">
                          <img
                            src={story.image}
                            alt={story.title}
                            className="fn-trending-img"
                          />
                          <div className="fn-trending-body">
                            <span className={`fn-badge fn-badge-trend-${trendingBadgeMod(story.category)}`}>
                              {trendingCategory(story.category)}
                            </span>
                            <p className="fn-trending-title">{story.title}</p>
                            <span className="fn-trending-time">
                              <Clock size={10} /> {story.time}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
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
