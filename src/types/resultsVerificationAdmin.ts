// export type SourceStatus =
//   | 'Feed Received'
//   | 'Awaiting Feed'
//   | 'Manual Upload'
//   | 'Evidence Pending';

// export type VerificationDecision =
//   | 'Verified'
//   | 'Returned to Proposer'
//   | 'Escalated'
//   | 'Void Candidate';

// export type QueueTabKey =
//   | 'awaiting-result'
//   | 'evidence-queue'
//   | 'pending-verification'
//   | 'disputed'
//   | 'resolved-today';

// export interface QueueItem {
//   id: string; // e.g. RS-M03
//   market: string; // e.g. Match Winner (3-Way)
//   fixture: string; // e.g. Vipers SC vs Express FC
//   sportLeague: string; // e.g. Football / UGX Premier League
//   sourceStatus: SourceStatus;
//   ruleReference: string; // e.g. Rule 4.2
//   proposedOutcome: string;
//   ageMinutes: number;
//   assignedTo: string;
// }

// export interface RulePanel {
//   ruleId: string;
//   ruleText: string;
//   applicable: string;
// }

// export interface SourcePanel {
//   sourceName: string;
//   scoreLine: string;
//   halfTime: string;
//   fullTime: string;
//   extraTime: string;
//   penalties: string;
//   receivedAt: string;
//   confidence: 'High' | 'Medium' | 'Low';
// }

// export interface ProposedOutcomePanel {
//   outcome: string;
//   submittedBy: string;
//   submittedAt: string;
//   matchesRuleLogic: boolean;
//   matchesSourceData: boolean;
// }

// export interface BlockingCondition {
//   label: string;
//   status: 'blocked' | 'resolved' | 'n-a';
// }

// export interface EvidenceItem {
//   type: string;
//   fileSource: string;
//   uploadedBy: string;
//   time: string;
//   status: 'Verified' | 'Pending' | 'Missing';
// }

// export interface ReviewerNote {
//   author: string;
//   time: string;
//   note: string;
// }

// export type ResolutionActionType =
//   | 'return-for-correction'
//   | 'escalate'
//   | 'correct-result'
//   | 'void-settlement';

// export interface DisputeCase {
//   id: string; // e.g. DIS-0021
//   market: string;
//   fixture: string;
//   ruleReference: string;
//   raisedAt: string;
//   submittedOutcome: string;
//   officialResult: string;
//   discrepancy: string;
//   evidence: EvidenceItem[];
//   reviewerNotes: ReviewerNote[];
// }

// export interface AuditEvent {
//   time: string;
//   title: string;
//   actor: string;
//   description: string;
//   tone: 'default' | 'success' | 'warning' | 'error' | 'info';
// }