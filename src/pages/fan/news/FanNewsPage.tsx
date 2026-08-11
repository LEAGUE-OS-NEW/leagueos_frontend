import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Circle, Shield, BarChart3, Bookmark, Clock, ArrowDown, ArrowRight, Star, Check,
} from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchNews, type Story } from '../../../services/newsService';
import '../sections/FanDashboard.css';
import './FanNewsPage.css';

const FILTERS = ['All', 'Football', 'Rugby', 'Basketball', 'Clubs', 'Markets', 'Fantasy'] as const;
type Filter = (typeof FILTERS)[number];

const TRENDING = [
  { rank: 1, image: '/images/vipersvs.jfif',                                                                          title: 'Vipers edge KCCA in title race clash',               time: '2h ago' },
  { rank: 2, image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=200&auto=format&fit=crop',      title: 'City Oilers strengthen roster ahead of NBL round 2', time: '4h ago' },
  { rank: 3, image: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=200&auto=format&fit=crop',   title: 'SC Villa prepare for crucial UPL clash',              time: '5h ago' },
  { rank: 4, image: '/images/fantasy.jfif',                                                                            title: 'Fantasy tips for Gameweek 28',                       time: '6h ago' },
  { rank: 5, image: '/images/express-fc.jfif',                                                                         title: 'Express FC unveil new home jersey',                  time: '8h ago' },
];

const LIVE_MATCHES = [
  { status: 'LIVE', minute: "78'", home: 'Vipers SC',  homeScore: 2, away: 'KCCA FC',    awayScore: 1, league: 'StarTimes Premier League' },
  { status: 'LIVE', minute: "62'", home: 'SC Villa',   homeScore: 1, away: 'Maroons FC', awayScore: 0, league: 'StarTimes Premier League' },
  { status: 'HT',   minute: 'HT',  home: 'BUL FC',     homeScore: 0, away: 'URA FC',     awayScore: 0, league: 'StarTimes Premier League' },
];

export default function FanNewsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchNews().then((data) => {
      if (!cancelled) { setStories(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

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
            <div className="fn-hero">
              <img src="/images/vipersvs.jfif" alt="Top story" className="fn-hero-img" />
              <div className="fn-hero-overlay" />
              <div className="fn-hero-content">
                <span className="fn-badge fn-badge-top">TOP STORY</span>
                <p className="fn-hero-headline">Vipers edge KCCA in title race clash</p>
                <p className="fn-hero-desc">A late strike from Allan Okello sealed all three points for Vipers SC in a tense encounter at St. Mary's Stadium.</p>
                <div className="fn-hero-meta">
                  <Clock size={13} /> <span>2h ago</span> <span className="fn-dot">•</span> <span>Football</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="fn-filters">
              {FILTERS.map((f) => (
                <button key={f} type="button"
                  className={`fn-chip${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'Football' || f === 'Rugby' || f === 'Basketball' ? <Circle size={13} /> : null}
                  {f === 'Clubs' ? <Shield size={13} /> : null}
                  {f === 'Markets' ? <BarChart3 size={13} /> : null}
                  {f === 'Fantasy' ? <Trophy size={13} /> : null}
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
                    {TRENDING.map((t) => (
                      <li key={t.rank} className="fn-trending-item">
                        <span className="fn-trending-rank">{t.rank}</span>
                        <img src={t.image} alt={t.title} className="fn-trending-img" />
                        <div>
                          <p className="fn-trending-title">{t.title}</p>
                          <span className="fn-trending-time">{t.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Live scores */}
                <div className="fn-panel">
                  <div className="fn-panel-header">
                    <h3>LIVE SCORES</h3>
                    <span className="fn-panel-link">View all <ArrowRight size={12} /></span>
                  </div>
                  <ul className="fn-live-list">
                    {LIVE_MATCHES.map((m, i) => (
                      <li key={i} className="fn-live-item">
                        <span className={`fn-live-pill${m.status === 'LIVE' ? ' live' : ' ht'}`}>{m.status}</span>
                        <div className="fn-live-teams">
                          <div className="fn-live-team">
                            <span className="fn-live-name">{m.home}</span>
                            <span className="fn-live-score">{m.homeScore}</span>
                          </div>
                          <div className="fn-live-team">
                            <span className="fn-live-name">{m.away}</span>
                            <span className="fn-live-score">{m.awayScore}</span>
                          </div>
                        </div>
                        <button type="button" className="fn-icon-btn" aria-label="Follow match">
                          <Star size={14} />
                        </button>
                      </li>
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
