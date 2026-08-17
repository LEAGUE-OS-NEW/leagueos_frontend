import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiShield, FiFileText, FiUsers, FiCalendar,
  FiTag, FiShoppingCart, FiPackage, FiTrendingUp,
  FiLock, FiChevronLeft, FiChevronRight, FiX, FiLogOut,
  FiChevronDown, FiCheck, FiClipboard,
} from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { useClubWorkspaceStore } from '../../store/clubWorkspaceStore';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_ENTITLEMENTS, CLUB_REGISTRY as FULL_REGISTRY, ROLE_LABELS } from './clubAdminData';
import type { DashboardEntitlement } from '../../types/dashboardAccess';
import './ClubAdminSidebar.css';

const CLUB_REGISTRY: Record<string | number, { name: string; league: string; badge: string }> = Object.fromEntries(
  Object.entries(FULL_REGISTRY).map(([k, v]) => [k, { name: v.name, league: v.league, badge: v.badge }])
);

const NAV_ITEMS = [
  { label: 'Dashboard',       route: '/club-admin',             icon: FiGrid,         end: true,  permission: null as string | null },
  { label: 'Club Profile',    route: '/club-admin/profile',     icon: FiShield,       permission: 'club.profile.view' },
  { label: 'News',            route: '/club-admin/news',        icon: FiFileText,     permission: 'club.communications.manage' },
  { label: 'Squad',           route: '/club-admin/squad',       icon: FiUsers,        permission: 'club.squad.manage' },
  { label: 'Fixtures',        route: '/club-admin/fixtures',    icon: FiCalendar,     permission: 'club.matches.manage' },
  { label: 'Tickets',         route: '/club-admin/tickets',     icon: FiTag,          permission: 'club.ticketing.manage' },
  { label: 'Store',           route: '/club-admin/store',       icon: FiShoppingCart, permission: null },
  { label: 'Orders',          route: '/club-admin/orders',      icon: FiPackage,      permission: null },
  { label: 'Analytics',       route: '/club-admin/analytics',   icon: FiTrendingUp,   permission: 'club.reports.view' },
  { label: 'Compliance',      route: '/club-admin/compliance',  icon: FiClipboard,    permission: 'club.communications.manage' },
  { label: 'Staff & Perms',   route: '/club-admin/staff',       icon: FiLock,         permission: 'club.admin.manage' },
];

interface Props { isOpen: boolean; onClose: () => void; }

function getClubInfo(entitlement: DashboardEntitlement, realClub: { id: string; name: string } | null) {
  if (realClub) {
    return { name: realClub.name, league: '', badge: realClub.name.slice(0, 2).toUpperCase() };
  }
  const id = entitlement.scope_id ?? 1;
  return CLUB_REGISTRY[id] ?? { name: `Club #${id}`, league: 'Uganda Premier League', badge: String(id).slice(0, 2).toUpperCase() };
}

export default function ClubAdminSidebar({ isOpen, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { logout } = useAuth();
  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId, selectEntitlement } = useClubWorkspaceStore();

  // Gather club entitlements from auth — fall back to demo when none exist
  const rawEntitlements = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const hasRealEntitlement = rawEntitlements.length > 0;
  const entitlements: DashboardEntitlement[] = hasRealEntitlement ? rawEntitlements : DEMO_ENTITLEMENTS;

  // AuthContextService.user_context() populates user.club from the real
  // active ClubWorkspace — prefer that over the demo registry whenever we
  // have a genuine (non-demo) entitlement. Real and demo entitlements are
  // never mixed in the same list, so this applies to every entry here.
  const realClub =
    hasRealEntitlement && user?.club && typeof user.club === 'object' && 'id' in user.club && 'name' in user.club
      ? (user.club as { id: string; name: string })
      : null;

  // Auto-select first entitlement if nothing selected
  useEffect(() => {
    if (!selectedEntitlementId && entitlements.length > 0) {
      selectEntitlement(entitlements[0].id);
    }
  }, [selectedEntitlementId, entitlements, selectEntitlement]);

  const current = entitlements.find(e => e.id === selectedEntitlementId) ?? entitlements[0] ?? null;
  const clubInfo = current ? getClubInfo(current, realClub) : null;
  const roleLabel = current?.workspace_role ? (ROLE_LABELS[current.workspace_role] ?? current.workspace_role) : '—';

  const canAccess = (permission: string | null) => {
    if (!permission || !current) return true;
    // Full access for club admin / owner roles regardless of granular permissions
    if (
      current.workspace_role === 'CLUB_ADMIN' ||
      current.workspace_role === 'CLUB_OWNER' ||
      current.permissions.includes('dashboard.club_admin')
    ) return true;
    return current.permissions.includes(permission);
  };

  const handleSwitch = (id: string) => {
    selectEntitlement(id);
    setSwitcherOpen(false);
  };

  return (
    <>
      <div className={`ca-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`ca-sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
        {/* ── Brand / club ── */}
        <div className="ca-sidebar-top">
          <div className="ca-sidebar-brand">
            <div className="ca-sidebar-club-badge">{clubInfo?.badge ?? '—'}</div>
            {!collapsed && clubInfo && (
              <div className="ca-sidebar-club-info">
                <span className="ca-sidebar-club-name">{clubInfo.name}</span>
                {clubInfo.league && <span className="ca-sidebar-club-meta">{clubInfo.league}</span>}
              </div>
            )}
          </div>
          <button type="button" className="ca-sidebar-close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* ── Role badge ── */}
        {!collapsed && current && (
          <div style={{ padding: '0 12px 4px' }}>
            <span className="ca-sidebar-role-badge">{roleLabel}</span>
          </div>
        )}

        {/* ── Assignment switcher ── */}
        {!collapsed && entitlements.length > 1 && (
          <div className="ca-sidebar-switcher-wrap">
            <button
              type="button"
              className="ca-sidebar-switch"
              onClick={() => setSwitcherOpen(v => !v)}
              aria-expanded={switcherOpen}
            >
              Switch Club <FiChevronDown style={{ marginLeft: 'auto', transform: switcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {switcherOpen && (
              <div className="ca-switcher-dropdown">
                {entitlements.map(e => {
                  const info = getClubInfo(e, realClub);
                  const role = ROLE_LABELS[e.workspace_role ?? ''] ?? e.workspace_role ?? '—';
                  const isActive = e.id === (current?.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`ca-switcher-item${isActive ? ' active' : ''}`}
                      onClick={() => handleSwitch(e.id)}
                    >
                      <div className="ca-switcher-badge">{info.badge}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{info.name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{role}</p>
                      </div>
                      {isActive && <FiCheck style={{ color: '#22c55e', fontSize: '0.9rem', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="ca-sidebar-nav" aria-label="Club Admin">
          {NAV_ITEMS.map((item) => {
            const allowed = canAccess(item.permission);
            if (!allowed) {
              return (
                <div
                  key={item.route}
                  className="ca-sidebar-link ca-sidebar-link-locked"
                  title={`${item.label} — access restricted`}
                >
                  <span className="ca-sidebar-link-icon"><item.icon /></span>
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      <FiLock className="ca-sidebar-lock-icon" />
                    </>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.route}
                to={item.route}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) => `ca-sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="ca-sidebar-link-icon"><item.icon /></span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="ca-sidebar-bottom">
          <button type="button" className="ca-sidebar-logout" onClick={logout}>
            <FiLogOut />
            {!collapsed && <span>Log Out</span>}
          </button>
          <button
            type="button"
            className="ca-sidebar-collapse"
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <FiChevronRight /> : <><FiChevronLeft /><span>Collapse Menu</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
