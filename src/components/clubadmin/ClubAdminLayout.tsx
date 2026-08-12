import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import ClubAdminSidebar from './ClubAdminSidebar';
import { DEMO_ENTITLEMENTS } from './clubAdminData';
import ClubAdminTopbar from './ClubAdminTopbar';
import { useAuthStore } from '../../store/authStore';
import { useClubWorkspaceStore } from '../../store/clubWorkspaceStore';
import './ClubAdminLayout.css';

function NoAssignmentState() {
  return (
    <div className="ca-no-assignment">
      <div className="ca-no-assignment-inner">
        <div className="ca-no-assignment-icon"><FiAlertCircle /></div>
        <h2 className="ca-no-assignment-title">No Club Assignment</h2>
        <p className="ca-no-assignment-body">
          Your account is not currently assigned to any club workspace. Contact your League OS administrator to be assigned to a club.
        </p>
        <div className="ca-no-assignment-actions">
          <Link to="/dashboard/fan" className="ca-btn ca-btn-secondary">
            Go to Fan Dashboard
          </Link>
          <a href="mailto:support@leagueos.ug" className="ca-btn ca-btn-primary">
            Contact Support <FiArrowRight />
          </a>
        </div>
      </div>
    </div>
  );
}

export function AccessDenied({ label }: { label?: string }) {
  return (
    <div className="ca-access-denied">
      <div className="ca-access-denied-icon"><FiAlertCircle /></div>
      <h2 className="ca-access-denied-title">Access Restricted</h2>
      <p className="ca-access-denied-body">
        {label
          ? `You don't have permission to access ${label}.`
          : "You don't have permission to access this section."}
        {' '}Contact your Club Admin to request access.
      </p>
      <Link to="/club-admin" className="ca-btn ca-btn-secondary" style={{ marginTop: 12 }}>
        Return to Dashboard
      </Link>
    </div>
  );
}

export default function ClubAdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();

  // Gather real club entitlements — guard in ClubAdminRoute ensures we
  // only reach here when the user is authenticated with a CLUB_ADMIN
  // entitlement, so the DEMO fallback is only used in local dev/Storybook.
  const isDev = import.meta.env.DEV;
  const rawEntitlements = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const entitlements = rawEntitlements.length > 0 ? rawEntitlements : (isDev ? DEMO_ENTITLEMENTS : []);

  // No-assignment: authenticated user with no club entitlements (production).
  const hasNoAssignment = !isDev && user !== null && rawEntitlements.length === 0;

  const currentEntitlement = entitlements.find(e => e.id === selectedEntitlementId) ?? entitlements[0] ?? null;

  if (hasNoAssignment || (!currentEntitlement && entitlements.length === 0)) {
    return (
      <div className="ca-layout">
        <main className="ca-layout-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <NoAssignmentState />
        </main>
      </div>
    );
  }

  return (
    <div className="ca-layout">
      <ClubAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="ca-layout-main">
        <ClubAdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="ca-layout-content">{children}</main>
      </div>
    </div>
  );
}
