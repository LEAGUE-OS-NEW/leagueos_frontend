// import type {
//   // QueueItem,
//   BlockingCondition,
//   DisputeCase,
//   AuditEvent,
// } from '../types';

// export const queueItems: QueueItem[] = [
//   {
//     id: 'RS-M03',
//     market: 'Match Winner (3-Way)',
//     fixture: 'Vipers SC vs Express FC',
//     sportLeague: 'Football / UGX Premier League',
//     sourceStatus: 'Feed Received',
//     ruleReference: 'Rule 4.2 — Match Winner',
//     proposedOutcome: 'Vipers SC (1)',
//     ageMinutes: 6,
//     assignedTo: 'Sarah K.',
//   },
//   {
//     id: 'RS-M07',
//     market: 'Total Goals',
//     fixture: 'KCCA FC vs Simba SC',
//     sportLeague: 'Football / CECAFA Cup',
//     sourceStatus: 'Awaiting Feed',
//     ruleReference: 'Rule 3.1 — Total Goals',
//     proposedOutcome: 'Over 2.5',
//     ageMinutes: 11,
//     assignedTo: 'Brian M.',
//   },
//   {
//     id: 'RS-M12',
//     market: 'Both Teams To Score',
//     fixture: 'SC Villa vs BUL FC',
//     sportLeague: 'Football / Uganda Cup',
//     sourceStatus: 'Feed Received',
//     ruleReference: 'Std 5.6 — BTTS Rule',
//     proposedOutcome: 'Yes',
//     ageMinutes: 14,
//     assignedTo: 'Moses B.',
//   },
//   {
//     id: 'RS-M15',
//     market: 'Match Winner (1X2)',
//     fixture: 'Express FC vs Kirinya',
//     sportLeague: 'Football / Uganda PL',
//     sourceStatus: 'Awaiting Feed',
//     ruleReference: 'Rule 4.2 — Match Winner',
//     proposedOutcome: 'Express FC (2)',
//     ageMinutes: 19,
//     assignedTo: 'Sarah K.',
//   },
//   {
//     id: 'RS-M21',
//     market: 'Total Cards',
//     fixture: 'Police FC vs NEC',
//     sportLeague: 'Football / Uganda PL',
//     sourceStatus: 'Evidence Pending',
//     ruleReference: 'Rule 7.4 — Cards',
//     proposedOutcome: 'Over 4.5',
//     ageMinutes: 23,
//     assignedTo: 'David O.',
//   },
// ];

// export const blockingConditions: BlockingCondition[] = [
//   { label: 'Evidence not yet uploaded for disputed outcome', status: 'blocked' },
//   { label: 'Source feed and manual submission mismatch (Outcome Mismatch)', status: 'blocked' },
//   { label: 'Market rule reference confirmed', status: 'resolved' },
//   {
//     label:
//       'Second-reviewer sign-off missing (dual control required — high exposure market, stake > UGX 20M)',
//     status: 'blocked',
//   },
//   { label: 'Correction pending Super Admin approval', status: 'n-a' },
// ];

// export const disputeCase: DisputeCase = {
//   id: 'DIS-0021',
//   market: '1X2 — Match Winner',
//   fixture: 'Vipers SC vs Express FC',
//   ruleReference: 'Rule 4.2',
//   raisedAt: '24 May 2026, 14:28 EAT',
//   submittedOutcome: 'Vipers SC (1)',
//   officialResult: 'Draw (X)',
//   discrepancy: 'Outcome Mismatch',
//   evidence: [
//     {
//       type: 'Official Report',
//       fileSource: 'Opta Match Report.pdf',
//       uploadedBy: 'Malcolm N.',
//       time: '24 May 2026, 14:20',
//       status: 'Verified',
//     },
//     {
//       type: 'Feed Screenshot',
//       fileSource: 'Scoreline Screenshot.png',
//       uploadedBy: 'Sarah K.',
//       time: '24 May 2026, 14:31',
//       status: 'Verified',
//     },
//     {
//       type: 'Referee Report',
//       fileSource: 'Referee Report.pdf',
//       uploadedBy: '—',
//       time: '24 May 2026, 15:02',
//       status: 'Pending',
//     },
//     {
//       type: 'Web Reference',
//       fileSource: 'Uganda Premier League Site',
//       uploadedBy: 'David O.',
//       time: '24 May 2026, 14:15',
//       status: 'Verified',
//     },
//   ],
//   reviewerNotes: [
//     {
//       author: 'David O.',
//       time: '15:05',
//       note: 'Cross-checked with FIFA live feed. Official source shows a draw. Discrepancy confirmed on final score.',
//     },
//     {
//       author: 'Sarah K.',
//       time: '14:52',
//       note: 'Submitted outcome based on match feed. Awaiting referee report.',
//     },
//   ],
// };

// export const auditTrail: AuditEvent[] = [
//   {
//     time: '24 May 2026 14:28',
//     title: 'Dispute Raised',
//     actor: 'David O.',
//     description: 'David O. raised a dispute on outcome mismatch',
//     tone: 'error',
//   },
//   {
//     time: '24 May 2026 14:52',
//     title: 'Evidence Requested',
//     actor: 'Sarah K.',
//     description: 'Sarah K. requested official source and referee report',
//     tone: 'info',
//   },
//   {
//     time: '24 May 2026 15:10',
//     title: 'Reviewer Note Added',
//     actor: 'Moses B.',
//     description: 'Moses B. added after source review',
//     tone: 'default',
//   },
//   {
//     time: '24 May 2026 15:40',
//     title: 'Escalated to Super Admin',
//     actor: 'System (Auto)',
//     description: 'Automatically escalated due to high exposure market',
//     tone: 'warning',
//   },
//   {
//     time: '24 May 2026 16:05',
//     title: 'Decision Recorded',
//     actor: 'Nalubega',
//     description: 'Void Settlement — Insufficient evidence',
//     tone: 'success',
//   },
// ];