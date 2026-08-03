import { FiChevronDown } from 'react-icons/fi';
import './AdminActivityFeedPanel.css';

type ActivityAccent = 'purple' | 'blue' | 'orange' | 'red';

type ActivityEntry = {
  time: string;
  actor: string;
  initials: string;
  accent: ActivityAccent;
  action: string;
  detail: string;
};

const ACTIVITY: ActivityEntry[] = [
  {
    time: '16:28',
    actor: 'Sarah K.',
    initials: 'SK',
    accent: 'purple',
    action: 'approved 8 markets',
    detail: 'Vipers SC vs Express FC • UGX 1.24M exposure',
  },
  {
    time: '16:10',
    actor: 'David O.',
    initials: 'DO',
    accent: 'blue',
    action: 'resolved result dispute',
    detail: 'BUL FC vs SC Villa • Result confirmed',
  },
  {
    time: '15:52',
    actor: 'Nancy A.',
    initials: 'NA',
    accent: 'orange',
    action: 'updated fixture mapping',
    detail: 'KCCA FC vs URA FC • Mapped to 25 May 18:30',
  },
  {
    time: '15:31',
    actor: 'Moses B.',
    initials: 'MB',
    accent: 'red',
    action: 'escalated KYC review',
    detail: 'ID: UPL-09871 • High risk • Requires verification',
  },
  {
    time: '15:05',
    actor: 'Irene N.',
    initials: 'IN',
    accent: 'purple',
    action: 'adjusted fantasy scores',
    detail: 'Steven Mukwala • +12.5 pts • Manual adjustment',
  },
];

function AdminActivityFeedPanel() {
  return (
    <div className="admin-panel activity-feed-panel">
      <div className="admin-panel-heading">
        <h2>Admin Activity Feed</h2>
        <label className="activity-feed-select">
          All Activities <FiChevronDown aria-hidden="true" />
        </label>
      </div>

      <ul className="activity-feed-list">
        {ACTIVITY.map((entry) => (
          <li key={`${entry.time}-${entry.actor}`}>
            <span className="activity-feed-time">{entry.time}</span>
            <span className={`activity-feed-avatar activity-feed-avatar--${entry.accent}`}>{entry.initials}</span>
            <span className="activity-feed-copy">
              <b>
                {entry.actor} {entry.action}
              </b>
              <span>{entry.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <a href="/dashboard/general-admin/audit-logs" className="admin-panel-link admin-panel-link--center">
        View all activity &rarr;
      </a>
    </div>
  );
}

export default AdminActivityFeedPanel;
