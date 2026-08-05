import { Link } from 'react-router-dom';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchNews } from '../../../services/fanDashboardService';
import './LatestNews.css';

function LatestNews() {
  const { data: news, isLoading, error, retry } = useDashboardSection(fetchNews);

  return (
    <div className="latest-news dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Latest News</h2>
        <Link to="/news" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={3} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load the news" message={error} onRetry={retry} />
      ) : news && news.length === 0 ? (
        <DashboardNotice tone="empty" title="No news yet" message="Check back soon for updates." />
      ) : (
        <div className="news-list">
          {(news ?? []).map((item) => (
            <Link to="/news" className="news-item" key={item.headline}>
              <img src={item.image} alt="" className="news-item-image" />
              <div className="news-item-body">
                <span className={`news-item-category news-item-category--${item.category}`}>{item.categoryLabel}</span>
                <p className="news-item-headline">{item.headline}</p>
                <span className="news-item-time">{item.timeAgo}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default LatestNews;
