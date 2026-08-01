import { Link } from 'react-router-dom';
import './LatestNews.css';

type NewsItem = {
  category: 'football' | 'rugby' | 'basketball';
  categoryLabel: string;
  headline: string;
  timeAgo: string;
  image: string;
};

const NEWS_ITEMS: NewsItem[] = [
  {
    category: 'football',
    categoryLabel: 'Football',
    headline: 'Vipers SC maintain top spot with late winner',
    timeAgo: '2h ago',
    image: '/news/league-announcement.png',
  },
  {
    category: 'rugby',
    categoryLabel: 'Rugby',
    headline: 'Buffaloes advance to Africa Cup semi-finals',
    timeAgo: '3h ago',
    image: '/news/super-cup.png',
  },
  {
    category: 'basketball',
    categoryLabel: 'Basketball',
    headline: 'City Oilers extend winning streak to 5 games',
    timeAgo: '5h ago',
    image: '/news/oilers-preview.png',
  },
];

function LatestNews() {
  return (
    <div className="latest-news dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Latest News</h2>
        <Link to="/news" className="dashboard-card-link">
          View all
        </Link>
      </div>

      <div className="news-list">
        {NEWS_ITEMS.map((item) => (
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
    </div>
  );
}

export default LatestNews;
