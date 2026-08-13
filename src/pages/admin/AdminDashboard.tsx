import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckSquare,
  FiClipboard,
  FiDollarSign,
  FiHeadphones,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { ADMIN_NAV_ITEMS, ADMIN_ROLE_LABELS } from '../../config/adminNav';
import { useActiveAdminRole } from '../../hooks/useActiveAdminRole';
import { fetchAdminDashboardSummary, type AdminDashboardSummary } from '../../services/adminDashboardService';
import './AdminDashboard.css';

function StatCard({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <article className="admin-dash-stat">
      <span className="admin-dash-stat__icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="admin-dash-stat__value">{value}</p>
        <p className="admin-dash-stat__label">{label}</p>
      </div>
    </article>
  );
}

function buildStatCards(summary: AdminDashboardSummary): { key: string; icon: IconType; label: string; value: string }[] {
  const cards: { key: string; icon: IconType; label: string; value: string }[] = [];
  if (summary.activeAdministrators !== undefined) {
    cards.push({ key: 'admins', icon: FiUsers, label: 'Active Administrators', value: String(summary.activeAdministrators) });
  }
  if (summary.pendingMarkets !== undefined) {
    cards.push({ key: 'pending-markets', icon: FiTrendingUp, label: 'Pending Markets', value: String(summary.pendingMarkets) });
  }
  if (summary.publishedMarkets !== undefined) {
    cards.push({ key: 'published-markets', icon: FiActivity, label: 'Published Markets', value: String(summary.publishedMarkets) });
  }
  if (summary.suspendedMarkets !== undefined) {
    cards.push({ key: 'suspended-markets', icon: FiAlertTriangle, label: 'Suspended Markets', value: String(summary.suspendedMarkets) });
  }
  if (summary.pendingResultVerification !== undefined) {
    cards.push({
      key: 'pending-verification',
      icon: FiCheckSquare,
      label: 'Pending Result Verification',
      value: String(summary.pendingResultVerification),
    });
  }
  if (summary.complianceCases !== undefined) {
    cards.push({ key: 'compliance', icon: FiShield, label: 'Pending Compliance Cases', value: String(summary.complianceCases) });
  }
  if (summary.supportCases !== undefined) {
    cards.push({ key: 'support', icon: FiHeadphones, label: 'Open Support Cases', value: String(summary.supportCases) });
  }
  if (summary.financialReconciliationStatus !== undefined) {
    cards.push({
      key: 'reconciliation',
      icon: FiDollarSign,
      label: 'Pending Reconciliations',
      value: String(summary.financialReconciliationStatus),
    });
  }
  if (summary.sportsDataIssues !== undefined) {
    cards.push({ key: 'sports-data', icon: FiClipboard, label: 'Sports Data Issues', value: String(summary.sportsDataIssues) });
  }
  return cards;
}

function AdminDashboard() {
  const { activeRole, isLoading: isRoleLoading } = useActiveAdminRole();
  const isSuperAdmin = activeRole === 'SUPER_ADMIN';

  const myModules = ADMIN_NAV_ITEMS.filter(
    (item) => !isSuperAdmin && item.allowedRoles.includes(activeRole),
  );

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminDashboardSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load platform stats. Your permissions may not include dashboard access.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = summary ? buildStatCards(summary) : [];

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="admin-dashboard__header">
          <p className="admin-dashboard__eyebrow">Welcome back</p>
          <h1>
            {isRoleLoading ? 'Overview' : isSuperAdmin ? 'Platform Overview' : `${ADMIN_ROLE_LABELS[activeRole]} Overview`}
          </h1>
          <p>
            {isRoleLoading
              ? 'Loading your workspace…'
              : isSuperAdmin
                ? 'A snapshot of markets, users and platform health across League OS.'
                : 'Your queues and workspace at a glance.'}
          </p>
        </div>

        {loadError && (
          <div className="admin-dashboard__error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {isLoading ? (
          <p className="admin-dashboard__panel-note">Loading platform stats…</p>
        ) : statCards.length > 0 ? (
          <div className="admin-dashboard__stats">
            {statCards.map((card) => (
              <StatCard key={card.key} icon={card.icon} label={card.label} value={card.value} />
            ))}
          </div>
        ) : (
          !loadError && <p className="admin-dashboard__panel-note">No platform stats are visible for your current permissions.</p>
        )}

        {!isSuperAdmin && myModules.length > 0 && (
          <div className="admin-dashboard__panel">
            <h2>Your workspace</h2>
            <div className="admin-dashboard__module-links">
              {myModules.map((item) => (
                <Link to={item.route} className="admin-dashboard__module-link" key={item.route}>
                  <span className="admin-dashboard__module-icon">
                    <item.icon aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="admin-dashboard__panel">
            <h2>Specialist roles</h2>
            <p className="admin-dashboard__panel-note">
              Assign admins to a specialist role from Users, or review each role's fixed permission set under
              Roles &amp; Permissions.
            </p>
            <div className="admin-dashboard__module-links">
              {summary?.roleDistribution && summary.roleDistribution.length > 0
                ? summary.roleDistribution.map((entry) => (
                    <span className="admin-dashboard__role-chip" key={entry.roleName}>
                      {entry.roleName} · {entry.count}
                    </span>
                  ))
                : Object.entries(ADMIN_ROLE_LABELS)
                    .filter(([role]) => role !== 'SUPER_ADMIN' && !['FAN', 'CLUB_ADMIN', 'TICKETING_OFFICER'].includes(role))
                    .map(([role, label]) => (
                      <span className="admin-dashboard__role-chip" key={role}>
                        {label}
                      </span>
                    ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
