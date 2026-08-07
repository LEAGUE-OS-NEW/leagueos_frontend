// import { Box, Tabs, Tab } from '@mui/material';
// import { useState } from 'react';
// import { ResultVerificationQueue } from './ResultVerificationQueue';
// import { DisputeReviewPage } from './DisputeReviewPage';
// import { SettlementBlockedPage } from './SettlementBlockedPage';
// import { tokens } from '../../../theme/theme';

// type ViewKey = 'queue' | 'dispute' | 'blocked';

// export function ResultsPage() {
//   const [view, setView] = useState<ViewKey>('queue');

//   return (
//     <Box>
//       <Tabs
//         value={view}
//         onChange={(_, v) => setView(v)}
//         sx={{
//           mb: 3,
//           minHeight: 36,
//           '& .MuiTab-root': {
//             textTransform: 'none',
//             fontSize: 13,
//             fontWeight: 700,
//             minHeight: 36,
//             color: tokens.textSecondary,
//           },
//           '& .Mui-selected': { color: `${tokens.violet} !important` },
//           '& .MuiTabs-indicator': { background: tokens.violet, height: 2 },
//         }}
//       >
//         <Tab value="queue" label="Verification Queue" />
//         <Tab value="dispute" label="Dispute Review (DIS-0021)" />
//         <Tab value="blocked" label="Settlement Blocked Example" />
//       </Tabs>

//       {view === 'queue' && <ResultVerificationQueue />}
//       {view === 'dispute' && <DisputeReviewPage />}
//       {view === 'blocked' && <SettlementBlockedPage />}
//     </Box>
//   );
// }