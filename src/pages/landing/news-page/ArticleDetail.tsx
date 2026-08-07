import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiArrowLeft, FiClock } from 'react-icons/fi';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import { fetchStoryById, type Story } from '../../../services/newsService';
import './ArticleDetail.css';

function badgeClass(category: Story['category']): string {
  switch (category) {
    case 'Football':
      return 'article-badge article-badge--football';
    case 'Rugby':
      return 'article-badge article-badge--rugby';
    case 'Basketball':
      return 'article-badge article-badge--basketball';
    default:
      return 'article-badge';
  }
}

function ArticleDetail() {
  const { storyId = '' } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchStoryById(storyId)
      .then((found) => {
        if (cancelled) return;
        setStory(found);
        if (!found) setLoadError('This story could not be found.');
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this story. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return (
    <div className="article-page">
      <Navbar />

      <main className="article-main">
        <div className="article-main-inner">
          <Link to="/news" className="article-breadcrumb">
            <FiArrowLeft aria-hidden="true" /> Back to News
          </Link>

          {loadError && (
            <div className="article-error-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>{loadError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="article-loading">
              <FiActivity aria-hidden="true" className="article-loading__icon" />
              Loading story…
            </div>
          ) : (
            story && (
              <article className="article-body">
                <span className={badgeClass(story.category)}>{story.category.toUpperCase()}</span>
                <h1>{story.title}</h1>
                <div className="article-byline">
                  <img src={story.avatar} alt={story.author} className="article-byline__avatar" />
                  <span>By {story.author}</span>
                  <span className="article-byline__dot">•</span>
                  <span className="article-byline__time">
                    <FiClock aria-hidden="true" /> {story.time}
                  </span>
                </div>
                <img src={story.image} alt={story.title} className="article-hero-image" />
                <p className="article-description">{story.description}</p>
              </article>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ArticleDetail;
