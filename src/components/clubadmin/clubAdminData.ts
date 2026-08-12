import type { DashboardEntitlement } from '../../types/dashboardAccess';

export const DEMO_ENTITLEMENTS: DashboardEntitlement[] = [
  {
    id: 'demo-kcca',
    dashboard: 'CLUB_ADMIN',
    route: '/club-admin',
    scope_type: 'CLUB',
    scope_id: 1,
    workspace_role: 'CLUB_ADMIN',
    permissions: [
      'club.profile.view', 'club.profile.edit', 'club.squad.manage',
      'club.members.manage', 'club.ticketing.manage', 'club.events.manage',
      'club.matches.manage', 'club.reports.view', 'club.finance.view',
      'club.finance.manage', 'club.admin.manage', 'club.settings.manage',
      'club.sponsorship.view', 'club.sponsorship.manage', 'club.communications.manage',
    ],
  },
  {
    id: 'demo-villa',
    dashboard: 'CLUB_ADMIN',
    route: '/club-admin',
    scope_type: 'CLUB',
    scope_id: 2,
    workspace_role: 'CONTENT_MANAGER',
    permissions: ['club.profile.view', 'club.communications.manage'],
  },
];

export const CLUB_REGISTRY: Record<string | number, { name: string; league: string; season: string; badge: string }> = {
  1: { name: 'KCCA FC',   league: 'Uganda Premier League', season: 'Season 2025/26', badge: 'KC' },
  2: { name: 'SC Villa',  league: 'Uganda Premier League', season: 'Season 2025/26', badge: 'SV' },
  3: { name: 'Vipers SC', league: 'Uganda Premier League', season: 'Season 2025/26', badge: 'VS' },
};

export const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Club Admin',
  CLUB_OWNER: 'Club Owner',
  CONTENT_MANAGER: 'Content Manager',
  MEMBERSHIP_MANAGER: 'Membership Manager',
  TEAM_MANAGER: 'Team Manager',
  TICKETING_OFFICER: 'Ticketing Officer',
  STORE_MANAGER: 'Store Manager',
  ANALYST: 'Analyst',
  CLUB_SPECIALIST_STAFF: 'Staff',
};
