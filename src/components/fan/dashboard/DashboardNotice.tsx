import { Link } from 'react-router-dom';

// Same convention as DashboardSkeleton — relies on FanDashboard.css's
// `.dashboard-card-notice--{empty|forbidden|error}` / `.dashboard-retry-btn`
// classes, already loaded by any page that renders these sections.

type DashboardNoticeProps = {
  tone: 'empty' | 'forbidden' | 'error';
  title: string;
  message: string;
  onRetry?: () => void;
  actionLabel?: string;
  actionTo?: string;
};

function DashboardNotice({ tone, title, message, onRetry, actionLabel, actionTo }: DashboardNoticeProps) {
  return (
    <div className={`dashboard-card-notice dashboard-card-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p className="dashboard-empty-title">{title}</p>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="dashboard-retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="dashboard-retry-btn">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default DashboardNotice;
