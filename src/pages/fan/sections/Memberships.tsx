import { Link } from 'react-router-dom';
import { GiShield } from 'react-icons/gi';
import { FiStar, FiClock, FiArrowRight } from 'react-icons/fi';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchMemberships, type Membership } from '../../../services/fanDashboardService';
import './Memberships.css';

type TierKey = 'gold' | 'silver' | 'bronze' | 'platinum' | 'season';

const TIER_META: Record<string, { key: TierKey; benefits: string[] }> = {
  'Bronze Member': {
    key: 'bronze',
    benefits: ['Matchday updates', 'Club newsletter', 'Fan forum access'],
  },
  'Silver Member': {
    key: 'silver',
    benefits: ['Priority ticket access', '10% merchandise discount', 'Monthly fan digest'],
  },
  'Gold Member': {
    key: 'gold',
    benefits: ['VIP lounge access', 'Meet & greet events', '20% merchandise discount'],
  },
  'Platinum Member': {
    key: 'platinum',
    benefits: ['Stadium tours', 'Away kit included', 'Exclusive annual event'],
  },
  'Season Pass': {
    key: 'season',
    benefits: ['All home games included', 'Dedicated seat', 'Special events access'],
  },
};

function daysUntil(dateStr: string): number {
  const parts = dateStr.trim().split(' ');
  if (parts.length === 3) {
    const [day, mon, year] = parts;
    const d = new Date(`${mon} ${day}, ${year}`);
    return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  }
  return 0;
}

function statusBadgeClass(status: Membership['status']): string {
  switch (status) {
    case 'Active':       return 'mem-badge mem-badge--active';
    case 'Expiring Soon': return 'mem-badge mem-badge--expiring';
    case 'Expired':      return 'mem-badge mem-badge--expired';
  }
}

function MembershipCard({ m }: { m: Membership }) {
  const meta = TIER_META[m.tier] ?? { key: 'season' as TierKey, benefits: ['Club membership benefits'] };
  const tierKey = meta.key;
  const days = daysUntil(m.validUntil);
  const isExpiringSoon = m.status === 'Expiring Soon';
  const isExpired = m.status === 'Expired';

  return (
    <div className={`mem-card mem-card--${tierKey}`}>
      <div className="mem-card-header">
        <div className={`mem-card-icon mem-card-icon--${tierKey}`}>
          <GiShield />
        </div>
        <div className="mem-card-identity">
          <p className="mem-card-club">{m.clubName}</p>
          <p className={`mem-card-tier mem-card-tier--${tierKey}`}>{m.tier}</p>
        </div>
        <span className={statusBadgeClass(m.status)}>{m.status}</span>
      </div>

      <ul className="mem-benefits">
        {meta.benefits.map((b) => (
          <li key={b}>
            <FiStar className="mem-benefit-icon" />
            {b}
          </li>
        ))}
      </ul>

      <div className="mem-card-footer">
        {isExpiringSoon && days > 0 ? (
          <span className="mem-expiry-warning">
            <FiClock /> Expires in {days} day{days !== 1 ? 's' : ''}
          </span>
        ) : isExpired ? (
          <span className="mem-expiry-warning mem-expiry-warning--expired">
            Expired {m.validUntil}
          </span>
        ) : (
          <span className="mem-valid">Valid until {m.validUntil}</span>
        )}
        <button className={`mem-cta mem-cta--${tierKey}`} type="button">
          {isExpired ? 'Rejoin' : isExpiringSoon ? 'Renew Now' : 'Upgrade'}
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}

function Memberships() {
  const { data: memberships, isLoading, error, retry } = useDashboardSection(fetchMemberships);

  return (
    <div className="memberships dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Memberships</h2>
        <Link to="/memberships" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={2} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your memberships" message={error} onRetry={retry} />
      ) : memberships && memberships.length === 0 ? (
        <DashboardNotice
          tone="empty"
          title="No memberships yet"
          message="Join a club membership to unlock exclusive benefits."
          actionLabel="Explore memberships"
          actionTo="/memberships"
        />
      ) : (
        <div className="mem-cards">
          {(memberships ?? []).map((m) => (
            <MembershipCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Memberships;
