import { useState } from 'react';
import './OperationalQueuesPanel.css';

type Priority = 'Medium' | 'High' | 'Critical';

type Task = {
  id: string;
  task: string;
  module: string;
  priority: Priority;
  age: string;
  assignedTo: string;
  action: string;
  slaBreach?: boolean;
};

const TASKS: Task[] = [
  {
    id: 't1',
    task: 'Approve market: Vipers SC vs Express FC – 1X2',
    module: 'Market Approval',
    priority: 'High',
    age: '1h 12m',
    assignedTo: 'Sarah K.',
    action: 'Review',
  },
  {
    id: 't2',
    task: 'Disputed result: City Oilers vs Patriots FC',
    module: 'Result Verification',
    priority: 'Critical',
    age: '2h 45m',
    assignedTo: 'David O.',
    action: 'Review',
    slaBreach: true,
  },
  {
    id: 't3',
    task: 'Fixture mapping issue: KCCA FC vs URA FC',
    module: 'Sports Data',
    priority: 'High',
    age: '3h 05m',
    assignedTo: 'Nancy A.',
    action: 'Resolve',
  },
  {
    id: 't4',
    task: 'KYC review: John T. (ID: UPL-11234)',
    module: 'Compliance',
    priority: 'Medium',
    age: '4h 20m',
    assignedTo: 'Moses B.',
    action: 'Review',
    slaBreach: true,
  },
  {
    id: 't5',
    task: 'Scoring exception: Steven Mukwala',
    module: 'Fantasy Admin',
    priority: 'Medium',
    age: '5h 10m',
    assignedTo: 'Irene N.',
    action: 'Review',
  },
];

type TabId = 'pending' | 'high-priority' | 'sla-breaches';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'pending', label: 'Pending Tasks', count: 42 },
  { id: 'high-priority', label: 'High Priority', count: 9 },
  { id: 'sla-breaches', label: 'SLA Breaches', count: 6 },
];

function priorityClass(priority: Priority) {
  if (priority === 'Critical') return 'critical';
  if (priority === 'High') return 'high';
  return 'medium';
}

function OperationalQueuesPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('pending');

  const visibleTasks = TASKS.filter((task) => {
    if (activeTab === 'high-priority') return task.priority === 'High' || task.priority === 'Critical';
    if (activeTab === 'sla-breaches') return task.slaBreach;
    return true;
  });

  return (
    <div className="admin-panel operational-queues-panel">
      <div className="admin-panel-heading">
        <h2>Operational Queues</h2>
      </div>

      <div className="operational-queues-tabs" role="tablist" aria-label="Operational queue filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`operational-queues-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} <span>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="operational-queues-table" role="table" aria-label="Operational task queue">
        <div className="operational-queues-row operational-queues-labels" role="row">
          <span>Task</span>
          <span>Module</span>
          <span>Priority</span>
          <span>Age</span>
          <span>Assigned To</span>
          <span>Action</span>
        </div>

        {visibleTasks.map((task) => (
          <div className="operational-queues-row" role="row" key={task.id}>
            <span role="cell" className="operational-queues-task">
              {task.task}
            </span>
            <span role="cell" className="operational-queues-module">
              {task.module}
            </span>
            <span role="cell">
              <span className={`operational-queues-priority operational-queues-priority--${priorityClass(task.priority)}`}>
                {task.priority}
              </span>
            </span>
            <span role="cell" className="operational-queues-age">
              {task.age}
            </span>
            <span role="cell" className="operational-queues-assignee">
              {task.assignedTo}
            </span>
            <span role="cell">
              <button type="button" className="operational-queues-action-btn">
                {task.action}
              </button>
            </span>
          </div>
        ))}

        {visibleTasks.length === 0 && <p className="operational-queues-empty">No tasks in this queue right now.</p>}
      </div>

      <a href="/dashboard/general-admin" className="admin-panel-link admin-panel-link--center">
        View all pending tasks &rarr;
      </a>
    </div>
  );
}

export default OperationalQueuesPanel;
