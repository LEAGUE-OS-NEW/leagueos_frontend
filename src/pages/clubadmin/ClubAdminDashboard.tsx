import { FiShoppingCart, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ClubAdminLayout from '../../components/clubadmin/ClubAdminLayout';
import { useAuthStore } from '../../store/authStore';
import { useClubWorkspaceStore } from '../../store/clubWorkspaceStore';
import { DEMO_ENTITLEMENTS, CLUB_REGISTRY, ROLE_LABELS } from '../../components/clubadmin/clubAdminData';
import {
  canAccessClubSection,
  getClubAdminEntitlements,
  getSelectedClubAdminEntitlement,
  getUserClub,
  normalizeWorkspaceRole,
} from '../../utils/clubAdminAccess';
import '../../components/clubadmin/ClubAdminLayout.css';
import './ClubAdminDashboard.css';


const QUICK_LINKS = [
  { label: 'Club Profile & Branding',  route: '/club-admin/profile',     permission: 'club.profile.view' },
  { label: 'Fixtures & Match Ops',     route: '/club-admin/fixtures',     permission: 'club.matches.manage' },
  { label: 'Squad & Team Management',  route: '/club-admin/squad',        permission: 'club.squad.manage' },
  { label: 'News & Communications',    route: '/club-admin/news',         permission: 'club.communications.manage' },
  { label: 'Ticketing & Match Events', route: '/club-admin/tickets',      permission: 'club.ticketing.manage' },
  { label: 'Store & Orders',           route: '/club-admin/store',        permission: null },
  { label: 'Analytics & Finance',      route: '/club-admin/analytics',    permission: 'club.reports.view' },
  { label: 'Compliance & Documents',   route: '/club-admin/compliance',   permission: 'club.communications.manage' },
  { label: 'Staff & Permissions',      route: '/club-admin/staff',        permission: 'club.admin.manage' },
];

const RECENT: { text: string; time: string }[] = [];

const TASK_SUMMARY: { text: string; route: string; color: string; icon: typeof FiShoppingCart }[] = [];

export default function ClubAdminDashboard() {
  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();

  const rawEntitlements = getClubAdminEntitlements(user);
  const hasRealEntitlement = rawEntitlements.length > 0;
  const entitlements = hasRealEntitlement ? rawEntitlements : DEMO_ENTITLEMENTS;
  const current = getSelectedClubAdminEntitlement(entitlements, selectedEntitlementId);

  // AuthContextService.user_context() populates user.club from the user's
  // real active ClubWorkspace — prefer that over the demo registry
  // whenever we have a genuine (non-demo) entitlement, so the header
  // shows the club this admin was actually invited to, not a stand-in.
  const realClub = getUserClub(user);

  const scopeId = current?.scope_id ?? 1;
  const clubInfo =
    hasRealEntitlement && realClub
      ? { name: realClub.name, league: null, season: null, badge: realClub.name.slice(0, 2).toUpperCase() }
      : (CLUB_REGISTRY[scopeId] ?? {
          name: `Club #${scopeId}`,
          league: 'Uganda Premier League',
          season: 'Season 2025/26',
          badge: String(scopeId).slice(0, 2).toUpperCase(),
        });
  const normalizedRole = normalizeWorkspaceRole(current?.workspace_role);
  const roleLabel = normalizedRole ? (ROLE_LABELS[normalizedRole] ?? current?.workspace_role ?? normalizedRole) : '—';

  const canAccess = (permission: string | null) => {
    return canAccessClubSection(current, permission);
  };

  return (
    <ClubAdminLayout>
      {/* ── Club context header ── */}
      <div className="ca-club-context-bar">
        <div className="ca-club-context-badge">{clubInfo.badge}</div>
        <div className="ca-club-context-info">
          <h1 className="ca-club-context-name">{clubInfo.name}</h1>
          {clubInfo.league && clubInfo.season && (
            <span className="ca-club-context-meta">{clubInfo.league} · {clubInfo.season}</span>
          )}
        </div>
        <span className="ca-club-context-role">{roleLabel}</span>
      </div>


      <div className="ca-dash-grid">
        {/* ── Quick links ── */}
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">All Sections</h2>
          </div>
          <div className="ca-dash-modules">
            {QUICK_LINKS.map((l) => {
              const allowed = canAccess(l.permission);
              if (!allowed) {
                return (
                  <div key={l.route} className="ca-dash-module-link ca-dash-module-locked" title="Access restricted">
                    <span className="ca-dash-module-label">{l.label}</span>
                    <FiAlertCircle className="ca-dash-module-arrow" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                );
              }
              return (
                <Link key={l.route} to={l.route} className="ca-dash-module-link">
                  <span className="ca-dash-module-label">{l.label}</span>
                  <FiArrowRight className="ca-dash-module-arrow" />
                </Link>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* ── Task summary ── */}
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Pending Tasks</h2>
              <span className="ca-panel-count">{TASK_SUMMARY.length} items</span>
            </div>
            {TASK_SUMMARY.length === 0
              ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No pending tasks.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TASK_SUMMARY.map((t, i) => (
                    <Link key={i} to={t.route} className="ca-task-row">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0, marginTop: 2 }} />
                      <t.icon style={{ color: t.color, fontSize: '0.9rem', flexShrink: 0 }} />
                      <span className="ca-task-text">{t.text}</span>
                      <FiArrowRight style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto', flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              )
            }
          </div>

          {/* ── Recent activity ── */}
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Recent Activity</h2>
            </div>
            {RECENT.length === 0
              ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No recent activity.</p>
              : (
                <div className="ca-activity-list">
                  {RECENT.map((r, i) => (
                    <div key={i} className="ca-activity-item">
                      <div className="ca-activity-dot" />
                      <div>
                        <p className="ca-activity-text">{r.text}</p>
                        <p className="ca-activity-time">{r.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
