import type { ReactNode } from 'react';
import { FiBriefcase, FiAward, FiUsers, FiChevronRight } from 'react-icons/fi';
import { GiWallet, GiTrophyCup } from 'react-icons/gi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchQuickStats, type QuickStatId } from '../../../services/fanDashboardService';
import './WelcomeStats.css';

const STAT_META: Record<QuickStatId, { label: string; icon: ReactNode; iconClassName: string; highlighted?: boolean }> = {
  wallet: { label: 'Wallet Balance', icon: <GiWallet />, iconClassName: 'stat-card-icon-purple' },
  positions: { label: 'Open Positions', icon: <FiBriefcase />, iconClassName: 'stat-card-icon-orange' },
  fantasy: { label: 'Fantasy Points', icon: <FiAward />, iconClassName: 'stat-card-icon-purple', highlighted: true },
  clubs: { label: 'My Clubs', icon: <FiUsers />, iconClassName: 'stat-card-icon-blue' },
  memberships: { label: 'Memberships', icon: <GiTrophyCup />, iconClassName: 'stat-card-icon-gold' },
};

function WelcomeStats() {
  const { currentUser } = useCurrentUser();
  const { data: stats, isLoading, error, retry } = useDashboardSection(fetchQuickStats);

  return (
    <div className="welcome-stats">
      <div className="welcome-text">
        <p className="welcome-greeting">Welcome back,</p>
        <h1 className="welcome-name">{currentUser.name}!</h1>
        <p className="welcome-tagline">
          Everything fans need. <span className="welcome-tagline-accent">One</span> place.
        </p>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={4} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your stats" message={error} onRetry={retry} />
      ) : (
        <div className="stat-cards">
          {(stats ?? []).map((stat) => {
            const meta = STAT_META[stat.id];
            return (
              <div className={`stat-card${meta.highlighted ? ' highlighted' : ''}`} key={stat.id}>
                <div className="stat-card-header">
                  <span className="stat-card-label">{meta.label}</span>
                  <span className={`stat-card-icon ${meta.iconClassName}`}>{meta.icon}</span>
                </div>
                <p className="stat-card-value">{stat.value}</p>
                <div className="stat-card-footer">
                  <span className={`stat-card-sublabel${stat.positive ? ' positive' : ''}`}>{stat.sublabel}</span>
                  <FiChevronRight className="stat-card-chevron" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WelcomeStats;
