// import { create } from 'zustand';
// import type { QueueTabKey } from '../types';
// import { queueItems } from '../data/results-verification-admin-data';

// interface VerificationState {
//   activeTab: QueueTabKey;
//   setActiveTab: (tab: QueueTabKey) => void;

//   verifyModalOpen: boolean;
//   activeResultId: string | null;
//   openVerifyModal: (resultId: string) => void;
//   closeVerifyModal: () => void;

//   counts: {
//     awaitingResult: number;
//     evidencePending: number;
//     pendingVerification: number;
//     disputed: number;
//     resolvedToday: number;
//   };
// }

// export const useVerificationStore = create<VerificationState>((set) => ({
//   activeTab: 'pending-verification',
//   setActiveTab: (tab) => set({ activeTab: tab }),

//   verifyModalOpen: false,
//   activeResultId: null,
//   openVerifyModal: (resultId) => set({ verifyModalOpen: true, activeResultId: resultId }),
//   closeVerifyModal: () => set({ verifyModalOpen: false, activeResultId: null }),

//   counts: {
//     awaitingResult: 38,
//     evidencePending: 21,
//     pendingVerification: queueItems.length + 169, // reflects "174" from reference with sample rows shown
//     disputed: 17,
//     resolvedToday: 52,
//   },
// }));