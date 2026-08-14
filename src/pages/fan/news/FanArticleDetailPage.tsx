import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiAlertTriangle, FiActivity, FiBookmark, FiShare2 } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchApprovedStories, type AdminStory } from '../../../services/newsAdminService';
import type { Story } from '../../../services/newsService';
import '../sections/FanDashboard.css';
import './FanArticleDetailPage.css';

function categoryClass(cat: Story['category']): string {
  return `fad-badge fad-badge--${cat.toLowerCase()}`;
}

export default function FanArticleDetailPage() {
  const { storyId = '' } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [story, setStory] = useState<AdminStory | null>(null);
  const [related, setRelated] = useState<AdminStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchApprovedStories()
      .then((all) => {
        if (cancelled) return;
        const found = all.find((s) => s.id === storyId) ?? null;
        setStory(found);
        if (!found) setLoadError('This story could not be found.');
        setRelated(all.filter((s) => s.id !== storyId).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this story. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [storyId]);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="fan-dashboard-content">
          <div className="fad-inner">
            <Link to="/fan/news" className="fad-back">
              <FiArrowLeft /> Back to News
            </Link>

            {loadError && (
              <div className="fad-error">
                <FiAlertTriangle /> {loadError}
              </div>
            )}

            {isLoading ? (
              <div className="fad-loading">
                <FiActivity className="fad-loading-icon" /> Loading story…
              </div>
            ) : story ? (
              <div className="fad-layout">
                {/* Article */}
                <article className="fad-article">
                  <span className={categoryClass(story.category)}>{story.category.toUpperCase()}</span>
                  <h1 className="fad-headline">{story.title}</h1>

                  <div className="fad-byline">
                    <img src={story.avatar} alt={story.author} className="fad-byline-avatar" />
                    <span className="fad-byline-name">By {story.author}</span>
                    <span className="fad-byline-dot">•</span>
                    <span className="fad-byline-time"><FiClock /> {story.time}</span>
                    <div className="fad-byline-actions">
                      <button type="button" className="fad-action-btn" aria-label="Bookmark">
                        <FiBookmark />
                      </button>
                      <button type="button" className="fad-action-btn" aria-label="Share">
                        <FiShare2 />
                      </button>
                    </div>
                  </div>

                  <img src={story.image} alt={story.title} className="fad-hero-img" />

                  <div className="fad-body">
                    <p>{story.description}</p>
                    <p>
                      The match drew thousands of fans to the stadium, with the atmosphere electric from kick-off.
                      Both sides showed tremendous quality, creating a contest that will be remembered throughout the season.
                      The result has significant implications for the league table as we enter the final stretch.
                    </p>
                    <p>
                      Supporters and analysts alike were quick to praise the performances on show, with several
                      players producing career-best displays. The coaching staff will be looking to build on this
                      momentum heading into the crucial fixtures ahead.
                    </p>
                  </div>
                </article>

                {/* Related articles */}
                {related.length > 0 && (
                  <div className="fad-related">
                    <h2 className="fad-related-title">More Stories</h2>
                    <div className="fad-related-grid">
                      {related.map((r) => (
                        <Link key={r.id} to={`/fan/news/${r.id}`} className="fad-related-card">
                          <img src={r.image} alt={r.title} className="fad-related-img" />
                          <div className="fad-related-body">
                            <span className={`fad-badge fad-badge--${r.category.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>
                              {r.category.toUpperCase()}
                            </span>
                            <p className="fad-related-headline">{r.title}</p>
                            <span className="fad-related-time"><FiClock style={{ fontSize: '0.7rem' }} /> {r.time}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
