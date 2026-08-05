import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from '../../../components/generaladmin/Sidebar';
import DashboardTopbar from '../sections/Topbar';
import './CustomerSupportAdmin.css';

/* ============================================================
   TYPES
   ============================================================ */

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
type CaseStatus = 'Unassigned' | 'Open' | 'Pending Customer' | 'Escalated' | 'SLA Breach' | 'Resolved' | 'Reopened';
type IssueCategory = 'Account Access' | 'Payment' | 'Market Dispute' | 'Fantasy' | 'KYC' | 'Tickets' | 'General';

interface ConversationMessage {
  id: string;
  sender: 'customer' | 'agent';
  senderName: string;
  body: string;
  sentAt: string;
}

interface InternalNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

interface EscalationRecord {
  id: string;
  escalatedTo: string;
  reason: string;
  escalatedAt: string;
  resolved: boolean;
}

interface SupportCase {
  id: string;
  customer: {
    name: string;
    emailMasked: string;
    emailFull: string;
    phoneMasked: string;
    phoneFull: string;
    accountId: string;
    tier: 'Standard' | 'Premium' | 'VIP';
    joinDate: string;
  };
  category: IssueCategory;
  priority: Priority;
  status: CaseStatus;
  assignedTo: string | null;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaBreached: boolean;
  conversation: ConversationMessage[];
  internalNotes: InternalNote[];
  escalations: EscalationRecord[];
}

/* ============================================================
   MOCK DATA
   ============================================================ */

const MOCK_CASES: SupportCase[] = [
  {
    id: 'CS-2026-0041',
    customer: { name: 'Samuel Ouma', emailMasked: 's***@gmail.com', emailFull: 'samuel.ouma@gmail.com', phoneMasked: '+256 7** *** 102', phoneFull: '+256 700 123 102', accountId: 'ACC-10041', tier: 'Standard', joinDate: '2025-08-14' },
    category: 'Account Access',
    priority: 'High',
    status: 'Open',
    assignedTo: 'Nalubega Grace',
    subject: 'Cannot log in — account says locked',
    description: 'User reports being unable to access their account since yesterday evening. Receives an "account locked" error message on both app and web.',
    createdAt: '2026-08-03T08:14:00Z',
    updatedAt: '2026-08-03T09:30:00Z',
    slaDeadline: '2026-08-03T20:14:00Z',
    slaBreached: false,
    conversation: [
      { id: 'M-1', sender: 'customer', senderName: 'Samuel Ouma', body: 'My account is locked. I have not done anything wrong. Please help me get back in.', sentAt: '2026-08-03T08:14:00Z' },
      { id: 'M-2', sender: 'agent', senderName: 'Nalubega Grace', body: 'Hi Samuel, thank you for reaching out. I can see your account was flagged by our automated system. I am investigating now and will update you shortly.', sentAt: '2026-08-03T09:30:00Z' },
    ],
    internalNotes: [
      { id: 'N-1', author: 'Nalubega Grace', body: 'Account was auto-locked due to 5 failed login attempts. Reviewed — no other suspicious activity. Safe to unlock after identity confirmation.', createdAt: '2026-08-03T09:32:00Z' },
    ],
    escalations: [],
  },
  {
    id: 'CS-2026-0038',
    customer: { name: 'Fatuma Nakato', emailMasked: 'f***@yahoo.com', emailFull: 'fatuma.nakato@yahoo.com', phoneMasked: '+256 7** *** 085', phoneFull: '+256 772 345 085', accountId: 'ACC-10038', tier: 'Premium', joinDate: '2025-03-22' },
    category: 'Payment',
    priority: 'Critical',
    status: 'Escalated',
    assignedTo: 'Kato Brian',
    subject: 'MTN deposit of UGX 200,000 not reflected in wallet',
    description: 'Customer made an MTN Mobile Money deposit 18 hours ago. Transaction shows complete on MTN side but balance has not updated on League OS.',
    createdAt: '2026-08-02T14:30:00Z',
    updatedAt: '2026-08-03T07:00:00Z',
    slaDeadline: '2026-08-03T02:30:00Z',
    slaBreached: true,
    conversation: [
      { id: 'M-3', sender: 'customer', senderName: 'Fatuma Nakato', body: 'I sent 200,000 UGX yesterday afternoon using MTN MoMo. The money left my phone but it is not in my League OS wallet. This is urgent!', sentAt: '2026-08-02T14:30:00Z' },
      { id: 'M-4', sender: 'agent', senderName: 'Kato Brian', body: 'Thank you for contacting us Fatuma. I have located your transaction reference. I am now escalating this to our Finance team for a manual reconciliation check.', sentAt: '2026-08-02T16:00:00Z' },
      { id: 'M-5', sender: 'customer', senderName: 'Fatuma Nakato', body: 'It has been over 12 hours now. This is unacceptable. When will it be sorted?', sentAt: '2026-08-03T06:50:00Z' },
    ],
    internalNotes: [
      { id: 'N-2', author: 'Kato Brian', body: 'Escalated to Finance team (Ticket FIN-0088). MTN transaction ref: MOM20260802-789. Waiting for reconciliation confirmation.', createdAt: '2026-08-02T16:02:00Z' },
    ],
    escalations: [
      { id: 'ESC-1', escalatedTo: 'Finance & Reconciliation', reason: 'Missing deposit not auto-reconciled after 12 hours', escalatedAt: '2026-08-02T16:02:00Z', resolved: false },
    ],
  },
  {
    id: 'CS-2026-0035',
    customer: { name: 'Richard Ssebunya', emailMasked: 'r***@outlook.com', emailFull: 'r.ssebunya@outlook.com', phoneMasked: '+256 7** *** 211', phoneFull: '+256 756 789 211', accountId: 'ACC-10035', tier: 'Standard', joinDate: '2026-01-10' },
    category: 'Market Dispute',
    priority: 'Medium',
    status: 'Pending Customer',
    assignedTo: 'Nalubega Grace',
    subject: 'Market result incorrect — Vipers vs KCCA',
    description: 'Customer believes the result for the Vipers SC vs KCCA FC match (2 Aug) was settled incorrectly. Claims Vipers won 2-1 but market was settled as a draw.',
    createdAt: '2026-08-02T19:00:00Z',
    updatedAt: '2026-08-03T08:00:00Z',
    slaDeadline: '2026-08-04T19:00:00Z',
    slaBreached: false,
    conversation: [
      { id: 'M-6', sender: 'customer', senderName: 'Richard Ssebunya', body: 'The Vipers vs KCCA market was settled as a draw but Vipers won 2-1. I lost my stake because of this wrong result. Please correct it.', sentAt: '2026-08-02T19:00:00Z' },
      { id: 'M-7', sender: 'agent', senderName: 'Nalubega Grace', body: 'Hello Richard, thank you for bringing this to our attention. Our Sports Data team is reviewing the official result. Could you share any reference or evidence of the correct result? A photo, video clip, or official match report would help.', sentAt: '2026-08-03T08:00:00Z' },
    ],
    internalNotes: [],
    escalations: [],
  },
  {
    id: 'CS-2026-0031',
    customer: { name: 'Annet Namukasa', emailMasked: 'a***@gmail.com', emailFull: 'annet.namukasa@gmail.com', phoneMasked: '+256 7** *** 344', phoneFull: '+256 704 567 344', accountId: 'ACC-10031', tier: 'VIP', joinDate: '2024-11-05' },
    category: 'Fantasy',
    priority: 'Low',
    status: 'Resolved',
    assignedTo: 'Kato Brian',
    subject: 'Fantasy points not updated after Kobs Rugby match',
    description: 'VIP customer reports that her fantasy team points were not updated after the Kobs vs Pirates match on 1 August. Score still shows 0 for two of her players.',
    createdAt: '2026-08-01T22:00:00Z',
    updatedAt: '2026-08-02T11:00:00Z',
    slaDeadline: '2026-08-02T22:00:00Z',
    slaBreached: false,
    conversation: [
      { id: 'M-8', sender: 'customer', senderName: 'Annet Namukasa', body: 'My fantasy points for the Kobs match have not been updated. Kapambwe scored a try and Baluku made 10 tackles but both show 0 points.', sentAt: '2026-08-01T22:00:00Z' },
      { id: 'M-9', sender: 'agent', senderName: 'Kato Brian', body: 'Good evening Annet! I can see the delay in the points sync. Our Sports Data team has been notified and will process the updates within 2 hours. I will confirm once done.', sentAt: '2026-08-01T23:00:00Z' },
      { id: 'M-10', sender: 'agent', senderName: 'Kato Brian', body: 'Hi Annet, your fantasy points have now been updated. Kapambwe: 14 pts (try + extras), Baluku: 8 pts (tackles). Your total is now 87. Apologies for the delay!', sentAt: '2026-08-02T11:00:00Z' },
    ],
    internalNotes: [
      { id: 'N-3', author: 'Kato Brian', body: 'Sports data sync was delayed due to API timeout from Rugby Africa feed. Points manually recalculated and applied. Root cause logged in SDA-0077.', createdAt: '2026-08-02T11:02:00Z' },
    ],
    escalations: [],
  },
  {
    id: 'CS-2026-0028',
    customer: { name: 'Moses Egwang', emailMasked: 'm***@proton.me', emailFull: 'moses.egwang@proton.me', phoneMasked: '+256 7** *** 019', phoneFull: '+256 782 901 019', accountId: 'ACC-10028', tier: 'Standard', joinDate: '2026-04-18' },
    category: 'KYC',
    priority: 'Medium',
    status: 'Unassigned',
    assignedTo: null,
    subject: 'KYC documents submitted 5 days ago — no response',
    description: 'Customer submitted Tier 2 KYC documents (national ID + proof of address) five days ago and has not received any update on their verification status.',
    createdAt: '2026-08-03T10:00:00Z',
    updatedAt: '2026-08-03T10:00:00Z',
    slaDeadline: '2026-08-04T10:00:00Z',
    slaBreached: false,
    conversation: [
      { id: 'M-11', sender: 'customer', senderName: 'Moses Egwang', body: 'I uploaded my national ID and utility bill for Tier 2 verification five days ago. Still showing as pending. When will it be approved?', sentAt: '2026-08-03T10:00:00Z' },
    ],
    internalNotes: [],
    escalations: [],
  },
  {
    id: 'CS-2026-0022',
    customer: { name: 'Christine Ayot', emailMasked: 'c***@gmail.com', emailFull: 'christine.ayot@gmail.com', phoneMasked: '+256 7** *** 561', phoneFull: '+256 701 234 561', accountId: 'ACC-10022', tier: 'Premium', joinDate: '2025-06-30' },
    category: 'Tickets',
    priority: 'High',
    status: 'Reopened',
    assignedTo: 'Nalubega Grace',
    subject: 'City Oilers ticket QR code not scanning at gate',
    description: 'Customer purchased a ticket for the City Oilers vs UCU Canons match. The QR code on her ticket was rejected at the gate and she was denied entry.',
    createdAt: '2026-07-31T18:00:00Z',
    updatedAt: '2026-08-03T09:00:00Z',
    slaDeadline: '2026-07-31T22:00:00Z',
    slaBreached: true,
    conversation: [
      { id: 'M-12', sender: 'customer', senderName: 'Christine Ayot', body: 'I was standing at the gate for 30 minutes. Your QR code does not work. I missed the first quarter of the game. I need a refund or compensation.', sentAt: '2026-07-31T18:00:00Z' },
      { id: 'M-13', sender: 'agent', senderName: 'Nalubega Grace', body: 'Christine, I am extremely sorry for this experience. We are investigating the QR issue and will follow up with full details and a resolution within 24 hours.', sentAt: '2026-07-31T18:30:00Z' },
      { id: 'M-14', sender: 'agent', senderName: 'Nalubega Grace', body: 'We have issued a 50% ticket credit to your account as compensation. The QR failure was caused by a sync issue on our gate system (now fixed).', sentAt: '2026-08-01T14:00:00Z' },
      { id: 'M-15', sender: 'customer', senderName: 'Christine Ayot', body: 'A 50% credit is not enough. I missed the most important part of the game and had to argue with your staff for 30 minutes. I want a full refund.', sentAt: '2026-08-03T09:00:00Z' },
    ],
    internalNotes: [
      { id: 'N-4', author: 'Nalubega Grace', body: 'Customer reopened after partial resolution. Requesting escalation to determine if full refund is warranted. Gate system logs confirm QR failure was platform-side.', createdAt: '2026-08-03T09:05:00Z' },
    ],
    escalations: [],
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function slaRemaining(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Breached';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function priorityClass(p: Priority) {
  return `priority-badge priority-${p.toLowerCase()}`;
}

function statusClass(s: CaseStatus) {
  const map: Record<CaseStatus, string> = {
    'Unassigned': 'status-pill status-unassigned',
    'Open': 'status-pill status-open',
    'Pending Customer': 'status-pill status-pending',
    'Escalated': 'status-pill status-escalated',
    'SLA Breach': 'status-pill status-sla-breach',
    'Resolved': 'status-pill status-resolved',
    'Reopened': 'status-pill status-reopened',
  };
  return map[s];
}

const QUEUE_TABS: { label: string; status: CaseStatus | 'All' | 'My Cases' }[] = [
  { label: 'Unassigned', status: 'Unassigned' },
  { label: 'My Cases', status: 'My Cases' },
  { label: 'Open', status: 'Open' },
  { label: 'Pending Customer', status: 'Pending Customer' },
  { label: 'Escalated', status: 'Escalated' },
  { label: 'SLA Breaches', status: 'SLA Breach' },
  { label: 'Resolved', status: 'Resolved' },
  { label: 'Reopened', status: 'Reopened' },
];

const SECTION_TABS = ['Overview', 'Case Queues', 'My Cases', 'Escalations', 'SLA Monitoring', 'Resolved Cases'];

const CASE_DETAIL_TABS = ['Conversation', 'Customer Context', 'Product Context', 'Internal Notes', 'Attachments', 'Timeline', 'Escalations'];

const CURRENT_AGENT = 'Nalubega Grace';

const PATH_TO_SECTION: Record<string, string> = {
  '/dashboard/general-admin/support/case-queues': 'Case Queues',
  '/dashboard/general-admin/support/my-cases': 'My Cases',
  '/dashboard/general-admin/support/escalations': 'Escalations',
  '/dashboard/general-admin/support/sla': 'SLA Monitoring',
  '/dashboard/general-admin/support/resolved': 'Resolved Cases',
};

const SECTION_TO_PATH: Record<string, string> = {
  'Overview': '/dashboard/general-admin/support',
  'Case Queues': '/dashboard/general-admin/support/case-queues',
  'My Cases': '/dashboard/general-admin/support/my-cases',
  'Escalations': '/dashboard/general-admin/support/escalations',
  'SLA Monitoring': '/dashboard/general-admin/support/sla',
  'Resolved Cases': '/dashboard/general-admin/support/resolved',
};

/* ============================================================
   MODALS
   ============================================================ */

function AssignCaseModal({ onClose, onAssign }: { onClose: () => void; onAssign: (agent: string) => void }) {
  const [agent, setAgent] = useState('');
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Assign Case</h3>
        <p>Select an agent to assign this support case to.</p>
        <div className="cs-field">
          <label>Assign to</label>
          <select value={agent} onChange={e => setAgent(e.target.value)}>
            <option value="">— Select agent —</option>
            <option>Nalubega Grace</option>
            <option>Kato Brian</option>
            <option>Ssali David</option>
            <option>Apio Faith</option>
          </select>
        </div>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-primary" disabled={!agent} onClick={() => { onAssign(agent); onClose(); }}>Assign</button>
        </div>
      </div>
    </div>
  );
}

function SendReplyModal({ onClose, onSend }: { onClose: () => void; onSend: (msg: string) => void }) {
  const [msg, setMsg] = useState('');
  const [template, setTemplate] = useState('');
  const templates: Record<string, string> = {
    'greeting': 'Hello, thank you for contacting League OS Support. My name is ' + CURRENT_AGENT + ' and I will be assisting you today.',
    'followup': 'I am following up on your recent case. Could you please provide any additional information that may help us resolve this faster?',
    'resolved': 'Your issue has been resolved. Please let us know if there is anything else we can help with. Thank you for your patience!',
  };
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Send Reply</h3>
        <div className="cs-field">
          <label>Response template</label>
          <select value={template} onChange={e => { setTemplate(e.target.value); if (e.target.value) setMsg(templates[e.target.value]); }}>
            <option value="">— None —</option>
            <option value="greeting">Greeting</option>
            <option value="followup">Follow-up Request</option>
            <option value="resolved">Case Resolved</option>
          </select>
        </div>
        <div className="cs-field">
          <label>Message</label>
          <textarea rows={5} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type your reply…" />
        </div>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-primary" disabled={!msg.trim()} onClick={() => { onSend(msg); onClose(); }}>Send Reply</button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ onClose, onAdd }: { onClose: () => void; onAdd: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Add Internal Note</h3>
        <p>Notes are visible to support agents only — not to the customer.</p>
        <div className="cs-field">
          <label>Note</label>
          <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Add context, findings, or next steps…" />
        </div>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-primary" disabled={!note.trim()} onClick={() => { onAdd(note); onClose(); }}>Add Note</button>
        </div>
      </div>
    </div>
  );
}

function EscalateCaseModal({ onClose, onEscalate }: { onClose: () => void; onEscalate: (queue: string, reason: string) => void }) {
  const [queue, setQueue] = useState('');
  const [reason, setReason] = useState('');
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Escalate Case</h3>
        <p>Support cannot approve KYC, modify balances, or decide market results. Use escalation to route to the correct specialist queue.</p>
        <div className="cs-field">
          <label>Escalate to</label>
          <select value={queue} onChange={e => setQueue(e.target.value)}>
            <option value="">— Select queue —</option>
            <option>Finance &amp; Reconciliation</option>
            <option>Compliance &amp; Trust</option>
            <option>Market Operations</option>
            <option>Sports Data</option>
            <option>Senior Support</option>
          </select>
        </div>
        <div className="cs-field">
          <label>Reason</label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this case needs escalation…" />
        </div>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-danger" disabled={!queue || !reason.trim()} onClick={() => { onEscalate(queue, reason); onClose(); }}>Escalate</button>
        </div>
      </div>
    </div>
  );
}

function RevealDataModal({ onClose, onReveal }: { onClose: () => void; onReveal: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Reveal Masked Data</h3>
        <div className="reveal-warning">
          Support receives minimum necessary data. Revealing full contact details is logged and audited. Only reveal when strictly necessary for case resolution.
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.84rem', color: 'var(--text-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2 }} />
          I confirm this reveal is necessary to resolve the support case.
        </label>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-primary" disabled={!checked} onClick={() => { onReveal(); onClose(); }}>Reveal Data</button>
        </div>
      </div>
    </div>
  );
}

function PriorityModal({ sc, onClose, onSave }: { sc: SupportCase; onClose: () => void; onSave: (p: Priority) => void }) {
  const [p, setP] = useState<Priority>(sc.priority);
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <h3>Change Priority — {sc.id}</h3>
        <div className="cs-field">
          <label>Priority</label>
          <select value={p} onChange={e => setP(e.target.value as Priority)}>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
        </div>
        <div className="cs-modal__footer">
          <button className="cs-btn cs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cs-btn cs-btn-primary" onClick={() => { onSave(p); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CASE DETAIL DRAWER (CS-02)
   ============================================================ */

function CaseDetailDrawer({
  sc, cases, setCases, onClose,
}: {
  sc: SupportCase;
  cases: SupportCase[];
  setCases: (c: SupportCase[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('Conversation');
  const [revealed, setRevealed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const mutate = (updated: SupportCase) => {
    setCases(cases.map(c => c.id === updated.id ? updated : c));
  };

  const addReply = (body: string) => {
    const msg: ConversationMessage = {
      id: `M-${Date.now()}`, sender: 'agent', senderName: CURRENT_AGENT, body, sentAt: new Date().toISOString(),
    };
    mutate({ ...sc, conversation: [...sc.conversation, msg], updatedAt: new Date().toISOString() });
  };

  const addNote = (body: string) => {
    const note: InternalNote = { id: `N-${Date.now()}`, author: CURRENT_AGENT, body, createdAt: new Date().toISOString() };
    mutate({ ...sc, internalNotes: [...sc.internalNotes, note] });
  };

  const doEscalate = (queue: string, reason: string) => {
    const esc: EscalationRecord = { id: `ESC-${Date.now()}`, escalatedTo: queue, reason, escalatedAt: new Date().toISOString(), resolved: false };
    mutate({ ...sc, status: 'Escalated', escalations: [...sc.escalations, esc] });
  };

  const caseData = cases.find(c => c.id === sc.id) ?? sc;

  return (
    <>
      <div className="cs-drawer-overlay" onClick={onClose}>
        <div className="cs-drawer cs-drawer--wide" onClick={e => e.stopPropagation()}>
          <div className="cs-drawer__header">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <h2>{caseData.id}</h2>
                <span className={priorityClass(caseData.priority)}>{caseData.priority}</span>
                <span className={statusClass(caseData.status)}>{caseData.status}</span>
              </div>
              <p>{caseData.subject}</p>
            </div>
            <button className="cs-drawer__close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="cs-drawer__tabs">
            {CASE_DETAIL_TABS.map(t => (
              <button key={t} className={`cs-drawer__tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          <div className="cs-drawer__body">
            {tab === 'Conversation' && (
              <div className="cs-section">
                <div className="conv-thread">
                  {caseData.conversation.map(m => (
                    <div key={m.id} className={`conv-msg conv-msg--${m.sender}`}>
                      <div className="conv-bubble">{m.body}</div>
                      <div className="conv-meta"><span>{m.senderName}</span><span>{fmt(m.sentAt)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'Customer Context' && (
              <div className="cs-section">
                <h3>Customer Profile</h3>
                <div className="kv-grid">
                  <div className="kv-item"><span className="k">Name</span><span className="v">{caseData.customer.name}</span></div>
                  <div className="kv-item"><span className="k">Account</span><span className="v">{caseData.customer.accountId}</span></div>
                  <div className="kv-item">
                    <span className="k">Email</span>
                    <span className={`v cell-masked${revealed ? ' revealed' : ''}`}>{revealed ? caseData.customer.emailFull : caseData.customer.emailMasked}</span>
                  </div>
                  <div className="kv-item">
                    <span className="k">Phone</span>
                    <span className={`v cell-masked${revealed ? ' revealed' : ''}`}>{revealed ? caseData.customer.phoneFull : caseData.customer.phoneMasked}</span>
                  </div>
                  <div className="kv-item"><span className="k">Tier</span><span className="v">{caseData.customer.tier}</span></div>
                  <div className="kv-item"><span className="k">Joined</span><span className="v">{caseData.customer.joinDate}</span></div>
                </div>
                {!revealed && (
                  <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => setShowReveal(true)}>
                    Reveal full contact details
                  </button>
                )}
                <div style={{ marginTop: 4, padding: '10px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Support cannot approve KYC, modify balances, or decide market results. Sensitive values are masked by default.
                </div>
              </div>
            )}

            {tab === 'Product Context' && (
              <div className="cs-section">
                <h3>Issue Details</h3>
                <div className="kv-grid">
                  <div className="kv-item"><span className="k">Category</span><span className="v">{caseData.category}</span></div>
                  <div className="kv-item"><span className="k">Priority</span><span className="v">{caseData.priority}</span></div>
                  <div className="kv-item"><span className="k">Status</span><span className="v">{caseData.status}</span></div>
                  <div className="kv-item"><span className="k">Assigned to</span><span className="v">{caseData.assignedTo ?? 'Unassigned'}</span></div>
                  <div className="kv-item"><span className="k">Created</span><span className="v">{fmt(caseData.createdAt)}</span></div>
                  <div className="kv-item"><span className="k">SLA deadline</span><span className="v">{fmt(caseData.slaDeadline)}</span></div>
                </div>
                <div className="cs-section" style={{ marginTop: 8 }}>
                  <h3>Description</h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{caseData.description}</p>
                </div>
              </div>
            )}

            {tab === 'Internal Notes' && (
              <div className="cs-section">
                {caseData.internalNotes.length === 0 && <p className="cs-empty">No internal notes yet.</p>}
                {caseData.internalNotes.map(n => (
                  <div key={n.id} className="cs-note">
                    <div className="cs-note__meta">{n.author} · {fmt(n.createdAt)}</div>
                    <div className="cs-note__body">{n.body}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'Attachments' && (
              <div className="cs-empty">No attachments uploaded for this case.</div>
            )}

            {tab === 'Timeline' && (
              <div className="cs-section">
                <div className="cs-timeline">
                  <div className="cs-timeline-item">
                    <div className="cs-timeline-dot" />
                    <div className="cs-timeline-content">
                      <div className="cs-timeline-title">Case created</div>
                      <div className="cs-timeline-meta">{fmt(caseData.createdAt)}</div>
                    </div>
                  </div>
                  {caseData.conversation.map(m => (
                    <div key={m.id} className="cs-timeline-item">
                      <div className="cs-timeline-dot" />
                      <div className="cs-timeline-content">
                        <div className="cs-timeline-title">{m.sender === 'agent' ? 'Agent reply' : 'Customer message'} — {m.senderName}</div>
                        <div className="cs-timeline-meta">{fmt(m.sentAt)}</div>
                      </div>
                    </div>
                  ))}
                  {caseData.escalations.map(e => (
                    <div key={e.id} className="cs-timeline-item">
                      <div className="cs-timeline-dot" style={{ background: 'var(--orange)' }} />
                      <div className="cs-timeline-content">
                        <div className="cs-timeline-title">Escalated to {e.escalatedTo}</div>
                        <div className="cs-timeline-meta">{fmt(e.escalatedAt)} · {e.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'Escalations' && (
              <div className="cs-section">
                {caseData.escalations.length === 0 && <p className="cs-empty">No escalations on this case.</p>}
                {caseData.escalations.map(e => (
                  <div key={e.id} className="esc-card">
                    <div className="esc-card__left">
                      <div className="esc-card__subject">Escalated to {e.escalatedTo}</div>
                      <div className="esc-card__meta">{fmt(e.escalatedAt)} · {e.reason}</div>
                    </div>
                    <span className={e.resolved ? 'status-pill status-resolved' : 'status-pill status-escalated'}>
                      {e.resolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cs-drawer__footer">
            <button className="cs-btn cs-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
            <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => setShowNote(true)}>+ Note</button>
            <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => setShowEscalate(true)}>Escalate</button>
            <button className="cs-btn cs-btn-primary" style={{ flex: 1 }} onClick={() => setShowReply(true)}>Send Reply</button>
          </div>
        </div>
      </div>

      {showReply    && <SendReplyModal onClose={() => setShowReply(false)} onSend={addReply} />}
      {showNote     && <AddNoteModal onClose={() => setShowNote(false)} onAdd={addNote} />}
      {showEscalate && <EscalateCaseModal onClose={() => setShowEscalate(false)} onEscalate={doEscalate} />}
      {showReveal   && <RevealDataModal onClose={() => setShowReveal(false)} onReveal={() => setRevealed(true)} />}
    </>
  );
}

/* ============================================================
   CASE QUICK VIEW DRAWER
   ============================================================ */

function CaseQuickView({
  sc, onClose, onOpenFull, onAssign,
}: {
  sc: SupportCase;
  onClose: () => void;
  onOpenFull: () => void;
  onAssign: (agent: string) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);

  return (
    <>
      <div className="cs-drawer-overlay" onClick={onClose}>
        <div className="cs-drawer" onClick={e => e.stopPropagation()}>
          <div className="cs-drawer__header">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <h2>{sc.id}</h2>
                <span className={priorityClass(sc.priority)}>{sc.priority}</span>
              </div>
              <p>{sc.subject}</p>
            </div>
            <button className="cs-drawer__close" onClick={onClose}>✕</button>
          </div>

          <div className="cs-drawer__body">
            <div className="kv-grid">
              <div className="kv-item"><span className="k">Status</span><span className="v">{sc.status}</span></div>
              <div className="kv-item"><span className="k">Category</span><span className="v">{sc.category}</span></div>
              <div className="kv-item"><span className="k">Assigned</span><span className="v">{sc.assignedTo ?? '—'}</span></div>
              <div className="kv-item"><span className="k">Customer</span><span className="v">{sc.customer.name} ({sc.customer.tier})</span></div>
              <div className="kv-item"><span className="k">Created</span><span className="v">{fmt(sc.createdAt)}</span></div>
              <div className="kv-item">
                <span className="k">SLA</span>
                <span className={`v ${sc.slaBreached ? 'sla-breach' : 'sla-ok'}`}>{sc.slaBreached ? 'BREACHED' : slaRemaining(sc.slaDeadline)}</span>
              </div>
            </div>

            <div className="cs-section">
              <h3>Description</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{sc.description}</p>
            </div>

            <div className="cs-section">
              <h3>Latest Message</h3>
              {sc.conversation.length > 0 ? (
                <div className={`conv-msg conv-msg--${sc.conversation[sc.conversation.length - 1].sender}`}>
                  <div className="conv-bubble">{sc.conversation[sc.conversation.length - 1].body}</div>
                  <div className="conv-meta">
                    <span>{sc.conversation[sc.conversation.length - 1].senderName}</span>
                    <span>{fmt(sc.conversation[sc.conversation.length - 1].sentAt)}</span>
                  </div>
                </div>
              ) : <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>No messages yet.</p>}
            </div>
          </div>

          <div className="cs-drawer__footer">
            <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => setShowAssign(true)}>Assign</button>
            <button className="cs-btn cs-btn-primary" style={{ flex: 1 }} onClick={onOpenFull}>Open Full Case</button>
          </div>
        </div>
      </div>

      {showAssign && <AssignCaseModal onClose={() => setShowAssign(false)} onAssign={onAssign} />}
    </>
  );
}

/* ============================================================
   CS-03 — ESCALATIONS & SLA VIEW
   ============================================================ */

function EscalationsView({ cases }: { cases: SupportCase[] }) {
  const [tab, setTab] = useState('All Escalations');
  const esc3Tabs = ['All Escalations', 'Finance', 'Compliance', 'Market Operations', 'Sports Data', 'SLA Performance', 'Resolution Reports'];

  const escalated = cases.filter(c => c.escalations.length > 0);
  const slaBreached = cases.filter(c => c.slaBreached);

  const filterByQueue = (q: string) => escalated.filter(c => c.escalations.some(e => e.escalatedTo.includes(q)));

  const displayEscalations =
    tab === 'All Escalations' ? escalated :
    tab === 'Finance' ? filterByQueue('Finance') :
    tab === 'Compliance' ? filterByQueue('Compliance') :
    tab === 'Market Operations' ? filterByQueue('Market') :
    tab === 'Sports Data' ? filterByQueue('Sports') : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="cs-queue-tabs">
        {esc3Tabs.map(t => (
          <button key={t} className={`cs-queue-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {(tab === 'SLA Performance') && (
        <div className="cs-panel">
          <div className="cs-panel__header">
            <div><h2>SLA Performance</h2><p>Cases with SLA breaches or at risk</p></div>
          </div>
          <div className="cs-table-wrap">
            <table className="sla-table">
              <thead>
                <tr><th>Case ID</th><th>Subject</th><th>Priority</th><th>SLA Deadline</th><th>Status</th></tr>
              </thead>
              <tbody>
                {slaBreached.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.id}</td>
                    <td>{c.subject}</td>
                    <td><span className={priorityClass(c.priority)}>{c.priority}</span></td>
                    <td className="sla-breach">{fmt(c.slaDeadline)}</td>
                    <td><span className={statusClass(c.status)}>{c.status}</span></td>
                  </tr>
                ))}
                {slaBreached.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0' }}>No SLA breaches. Great work!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'Resolution Reports') && (
        <div className="cs-panel">
          <div className="cs-panel__header">
            <div><h2>Resolution Reports</h2><p>Summary of resolved cases and resolution times</p></div>
            <div className="cs-panel__actions">
              <button className="cs-btn cs-btn-ghost cs-btn-sm">Export Report</button>
            </div>
          </div>
          <div className="cs-stats" style={{ padding: '16px 20px' }}>
            <div className="cs-stat cs-stat--green"><div className="cs-stat__label">Resolved This Week</div><div className="cs-stat__value">{cases.filter(c => c.status === 'Resolved').length}</div></div>
            <div className="cs-stat cs-stat--red"><div className="cs-stat__label">SLA Breaches</div><div className="cs-stat__value">{slaBreached.length}</div></div>
            <div className="cs-stat cs-stat--purple"><div className="cs-stat__label">Avg First Response</div><div className="cs-stat__value">1.4h</div></div>
            <div className="cs-stat"><div className="cs-stat__label">CSAT Score</div><div className="cs-stat__value">4.2/5</div></div>
          </div>
        </div>
      )}

      {!['SLA Performance', 'Resolution Reports'].includes(tab) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayEscalations.length === 0 && <div className="cs-empty">No escalations in this queue.</div>}
          {displayEscalations.map(c => (
            <div key={c.id} className="esc-card">
              <div className="esc-card__left">
                <div className="esc-card__id">{c.id} · {c.category}</div>
                <div className="esc-card__subject">{c.subject}</div>
                <div className="esc-card__meta">
                  {c.customer.name} · Assigned to {c.assignedTo ?? 'Unassigned'} · {fmt(c.updatedAt)}
                </div>
                {c.escalations.map(e => (
                  <div key={e.id} style={{ fontSize: '0.76rem', color: 'var(--orange)', marginTop: 4 }}>
                    → {e.escalatedTo}: {e.reason}
                  </div>
                ))}
              </div>
              <div className="esc-card__actions">
                <span className={priorityClass(c.priority)}>{c.priority}</span>
                <span className={statusClass(c.status)}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function CustomerSupportAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cases, setCases] = useState<SupportCase[]>(MOCK_CASES);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickViewCase, setQuickViewCase] = useState<SupportCase | null>(null);
  const [detailCase, setDetailCase] = useState<SupportCase | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showPriority, setShowPriority] = useState(false);

  const activeSection = PATH_TO_SECTION[location.pathname] ?? 'Overview';
  const [queueTab, setQueueTab] = useState<CaseStatus | 'My Cases'>('Unassigned');
  const [page, setPage] = useState(1);
  const [prevSection, setPrevSection] = useState(activeSection);
  if (prevSection !== activeSection) {
    setPrevSection(activeSection);
    setPage(1);
  }
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<IssueCategory | 'All'>('All');
  const PAGE_SIZE = 8;

  const filteredCases = useMemo(() => {
    let c = [...cases];
    if (activeSection === 'Resolved Cases' || (activeSection === 'Case Queues' && queueTab === 'Resolved')) {
      c = c.filter(x => x.status === 'Resolved');
    } else if (activeSection === 'My Cases' || (activeSection === 'Case Queues' && queueTab === 'My Cases')) {
      c = c.filter(x => x.assignedTo === CURRENT_AGENT);
    } else if (activeSection === 'Case Queues') {
      c = c.filter(x => x.status === queueTab);
    } else if (activeSection === 'Overview') {
      c = c.filter(x => x.status !== 'Resolved');
    }
    if (filterPriority !== 'All') c = c.filter(x => x.priority === filterPriority);
    if (filterCategory !== 'All') c = c.filter(x => x.category === filterCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      c = c.filter(x => x.id.toLowerCase().includes(q) || x.customer.name.toLowerCase().includes(q) || x.subject.toLowerCase().includes(q));
    }
    return c;
  }, [cases, activeSection, queueTab, search, filterPriority, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const pageItems = filteredCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const mutateCase = (updated: SupportCase) => {
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (quickViewCase?.id === updated.id) setQuickViewCase(updated);
    if (detailCase?.id === updated.id) setDetailCase(updated);
  };

  const stats = {
    open: cases.filter(c => c.status === 'Open' || c.status === 'Unassigned').length,
    escalated: cases.filter(c => c.status === 'Escalated').length,
    slaBreached: cases.filter(c => c.slaBreached).length,
    resolved: cases.filter(c => c.status === 'Resolved').length,
    myCases: cases.filter(c => c.assignedTo === CURRENT_AGENT).length,
    reopened: cases.filter(c => c.status === 'Reopened').length,
  };

  const tabCounts: Record<string, number> = {
    'Unassigned': cases.filter(c => c.status === 'Unassigned').length,
    'My Cases': stats.myCases,
    'Open': cases.filter(c => c.status === 'Open').length,
    'Pending Customer': cases.filter(c => c.status === 'Pending Customer').length,
    'Escalated': stats.escalated,
    'SLA Breaches': stats.slaBreached,
    'Resolved': stats.resolved,
    'Reopened': stats.reopened,
  };

  return (
    <div className="cs-root">
      <div className="cs-shell">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="cs-main">
          <DashboardTopbar onMenuClick={() => setSidebarOpen(true)} />

          <div className="cs-content">
            {/* Header */}
            <div className="cs-header">
              <div>
                <div className="cs-header__eyebrow">General Admin · Support</div>
                <h1>Customer Support</h1>
                <p className="cs-header__sub">
                  Support has read-only access to minimum necessary context. Cannot approve KYC, modify balances, or decide market results.
                </p>
              </div>
              <div className="cs-header__actions">
                <span className="live-dot"><span className="live-dot__pulse" />Live</span>
                <button className="cs-btn cs-btn-ghost">Export</button>
              </div>
            </div>

            {/* Stats */}
            <div className="cs-stats">
              <div className={`cs-stat${stats.open > 0 ? ' cs-stat--purple' : ''}`}>
                <div className="cs-stat__label">Open / Unassigned</div>
                <div className="cs-stat__value">{stats.open}</div>
                <div className="cs-stat__sub">Needs attention</div>
              </div>
              <div className={`cs-stat${stats.escalated > 0 ? ' cs-stat--yellow' : ''}`}>
                <div className="cs-stat__label">Escalated</div>
                <div className="cs-stat__value">{stats.escalated}</div>
                <div className="cs-stat__sub">Pending specialist</div>
              </div>
              <div className={`cs-stat${stats.slaBreached > 0 ? ' cs-stat--red' : ' cs-stat--green'}`}>
                <div className="cs-stat__label">SLA Breaches</div>
                <div className="cs-stat__value">{stats.slaBreached}</div>
                <div className="cs-stat__sub">{stats.slaBreached === 0 ? 'All on time' : 'Overdue'}</div>
              </div>
              <div className="cs-stat cs-stat--green">
                <div className="cs-stat__label">Resolved</div>
                <div className="cs-stat__value">{stats.resolved}</div>
                <div className="cs-stat__sub">This week</div>
              </div>
              <div className="cs-stat">
                <div className="cs-stat__label">My Cases</div>
                <div className="cs-stat__value">{stats.myCases}</div>
                <div className="cs-stat__sub">{CURRENT_AGENT}</div>
              </div>
              <div className={`cs-stat${stats.reopened > 0 ? ' cs-stat--yellow' : ''}`}>
                <div className="cs-stat__label">Reopened</div>
                <div className="cs-stat__value">{stats.reopened}</div>
                <div className="cs-stat__sub">Need follow-up</div>
              </div>
            </div>

            {/* Section tabs */}
            <div className="cs-section-tabs">
              {SECTION_TABS.map(s => (
                <button key={s} className={`cs-section-tab${activeSection === s ? ' active' : ''}`} onClick={() => navigate(SECTION_TO_PATH[s] ?? '/dashboard/general-admin/support')}>{s}</button>
              ))}
            </div>

            {/* Escalations / SLA view (CS-03) */}
            {(activeSection === 'Escalations' || activeSection === 'SLA Monitoring') && (
              <EscalationsView cases={cases} />
            )}

            {/* Case queue view (CS-01) */}
            {activeSection !== 'Escalations' && activeSection !== 'SLA Monitoring' && (
              <div className="cs-panel">
                <div className="cs-panel__header">
                  <div>
                    <h2>{activeSection === 'Resolved Cases' ? 'Resolved Cases' : activeSection === 'My Cases' ? 'My Cases' : 'Case Queue'}</h2>
                    <p>{filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} shown</p>
                  </div>
                  <div className="cs-panel__actions">
                    <button className="cs-btn cs-btn-ghost cs-btn-sm">Export</button>
                  </div>
                </div>

                {activeSection === 'Case Queues' && (
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div className="cs-queue-tabs">
                      {QUEUE_TABS.map(qt => (
                        <button
                          key={qt.label}
                          className={`cs-queue-tab${queueTab === qt.status ? ' active' : ''}`}
                          onClick={() => { setQueueTab(qt.status as CaseStatus | 'My Cases'); setPage(1); }}
                        >
                          {qt.label}
                          {tabCounts[qt.label] > 0 && <span className="cs-queue-tab__count">{tabCounts[qt.label]}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cs-filters">
                  <input
                    type="text"
                    placeholder="Search case ID, name, or subject…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                  />
                  <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value as Priority | 'All'); setPage(1); }}>
                    <option value="All">All priorities</option>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                  <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value as IssueCategory | 'All'); setPage(1); }}>
                    <option value="All">All categories</option>
                    <option>Account Access</option><option>Payment</option><option>Market Dispute</option>
                    <option>Fantasy</option><option>KYC</option><option>Tickets</option><option>General</option>
                  </select>
                </div>

                <div className="cs-table-wrap">
                  <table className="cs-table">
                    <thead>
                      <tr>
                        <th>Case ID</th>
                        <th>Customer</th>
                        <th>Category</th>
                        <th>Subject</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>SLA</th>
                        <th>Assigned</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map(c => (
                        <tr key={c.id} onClick={() => setQuickViewCase(c)}>
                          <td>{c.id}</td>
                          <td>
                            <div className="cell-name">{c.customer.name}</div>
                            <div className="cell-email">{c.customer.tier}</div>
                          </td>
                          <td>{c.category}</td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</td>
                          <td><span className={priorityClass(c.priority)}>{c.priority}</span></td>
                          <td><span className={statusClass(c.status)}>{c.status}</span></td>
                          <td>
                            <span className={c.slaBreached ? 'sla-breach' : 'sla-ok'}>
                              {c.slaBreached ? 'BREACHED' : slaRemaining(c.slaDeadline)}
                            </span>
                          </td>
                          <td>{c.assignedTo ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                          <td>
                            <button
                              className="cs-btn cs-btn-ghost cs-btn-sm"
                              onClick={e => { e.stopPropagation(); setQuickViewCase(c); }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pageItems.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                            No cases match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cs-pagination">
                  <span>
                    Showing {pageItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCases.length)} of {filteredCases.length}
                  </span>
                  <div className="cs-pagination__controls">
                    <button className="cs-btn cs-btn-ghost cs-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                    <button className="cs-btn cs-btn-ghost cs-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Drawer */}
      {quickViewCase && !detailCase && (
        <CaseQuickView
          sc={quickViewCase}
          onClose={() => setQuickViewCase(null)}
          onOpenFull={() => { setDetailCase(quickViewCase); setQuickViewCase(null); }}
          onAssign={agent => mutateCase({ ...quickViewCase, assignedTo: agent })}
        />
      )}

      {/* Full Case Detail Drawer (CS-02) */}
      {detailCase && (
        <CaseDetailDrawer
          sc={detailCase}
          cases={cases}
          setCases={setCases}
          onClose={() => setDetailCase(null)}
        />
      )}

      {showAssign && quickViewCase && (
        <AssignCaseModal
          onClose={() => setShowAssign(false)}
          onAssign={agent => mutateCase({ ...quickViewCase, assignedTo: agent })}
        />
      )}

      {showPriority && quickViewCase && (
        <PriorityModal
          sc={quickViewCase}
          onClose={() => setShowPriority(false)}
          onSave={p => mutateCase({ ...quickViewCase, priority: p })}
        />
      )}
    </div>
  );
}
