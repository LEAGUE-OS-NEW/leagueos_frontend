import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiClipboard,
  FiDollarSign,
  FiFlag,
  FiHeadphones,
  FiShield,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import './SpecialistModulesGrid.css';

type Accent = 'purple' | 'orange' | 'blue';

type CountBadge = { kind: 'count'; icon: IconType; count: number; label: string };
type TextBadge = { kind: 'text'; text: string };

type ModuleCard = {
  label: string;
  icon: IconType;
  accent: Accent;
  value: string;
  subLabel: string;
  badge: CountBadge | TextBadge;
  actionLabel: string;
  route: string;
};

const MODULES: ModuleCard[] = [
  {
    label: 'Sports Data & Statistics',
    icon: FiZap,
    accent: 'purple',
    value: '24',
    subLabel: 'Fixture Mapping Issues',
    badge: { kind: 'count', icon: FiFlag, count: 7, label: 'High Priority' },
    actionLabel: 'Review Issues',
    route: '/dashboard/general-admin/sports-data',
  },
  {
    label: 'Market Operations',
    icon: FiBarChart2,
    accent: 'orange',
    value: '124',
    subLabel: 'Markets Live',
    badge: { kind: 'count', icon: FiShield, count: 12, label: 'Suspended' },
    actionLabel: 'Manage Markets',
    route: '/dashboard/general-admin/markets',
  },
  {
    label: 'Market Approval',
    icon: FiShield,
    accent: 'purple',
    value: '36',
    subLabel: 'Pending Approvals',
    badge: { kind: 'count', icon: FiUser, count: 8, label: 'High Value' },
    actionLabel: 'Review Queue',
    route: '/dashboard/general-admin/market-proposals',
  },
  {
    label: 'Result Verification',
    icon: GiTrophyCup,
    accent: 'blue',
    value: '17',
    subLabel: 'Disputed Results',
    badge: { kind: 'count', icon: FiAlertTriangle, count: 5, label: 'Critical' },
    actionLabel: 'Review Results',
    route: '/dashboard/general-admin/results',
  },
  {
    label: 'Fantasy Admin',
    icon: FiUsers,
    accent: 'purple',
    value: '28',
    subLabel: 'Scoring Exceptions',
    badge: { kind: 'count', icon: FiCheckCircle, count: 4, label: 'Auto-resolved' },
    actionLabel: 'Review Exceptions',
    route: '/dashboard/general-admin/fantasy',
  },
  {
    label: 'Compliance',
    icon: FiShield,
    accent: 'orange',
    value: '72',
    subLabel: 'KYC Reviews',
    badge: { kind: 'count', icon: FiFlag, count: 15, label: 'High Risk' },
    actionLabel: 'View Reviews',
    route: '/dashboard/general-admin/compliance',
  },
  {
    label: 'Finance & Reconciliation',
    icon: FiDollarSign,
    accent: 'blue',
    value: '6',
    subLabel: 'Settlement Batches',
    badge: { kind: 'text', text: 'UGX 2.45B Pending Settlement' },
    actionLabel: 'Reconcile Now',
    route: '/dashboard/general-admin/finance',
  },
  {
    label: 'Customer Support',
    icon: FiHeadphones,
    accent: 'purple',
    value: '143',
    subLabel: 'Open Support Cases',
    badge: { kind: 'count', icon: FiClipboard, count: 32, label: 'Overdue' },
    actionLabel: 'View Tickets',
    route: '/dashboard/general-admin/support',
  },
];

function SpecialistModulesGrid() {
  return (
    <section className="specialist-modules" aria-label="Specialist modules">
      <h2 className="specialist-modules-heading">Specialist Modules</h2>

      <div className="specialist-modules-grid">
        {MODULES.map((module) => (
          <article className={`specialist-module-card specialist-module-card--${module.accent}`} key={module.label}>
            <div className="specialist-module-top">
              <span className={`specialist-module-icon specialist-module-icon--${module.accent}`}>
                <module.icon aria-hidden="true" />
              </span>
              <span className="specialist-module-label">{module.label}</span>
            </div>

            <span className="specialist-module-value">{module.value}</span>
            <span className="specialist-module-sublabel">{module.subLabel}</span>

            {module.badge.kind === 'count' ? (
              <span className="specialist-module-badge">
                <module.badge.icon aria-hidden="true" />
                <b>{module.badge.count}</b> {module.badge.label}
              </span>
            ) : (
              <span className="specialist-module-badge specialist-module-badge--text">{module.badge.text}</span>
            )}

            <a href={module.route} className={`specialist-module-btn specialist-module-btn--${module.accent}`}>
              {module.actionLabel} <FiArrowRight />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SpecialistModulesGrid;
