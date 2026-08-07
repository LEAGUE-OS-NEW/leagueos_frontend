// import {
//   Box,
//   Stack,
//   Typography,
//   Tabs,
//   Tab,
//   Paper,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   Button,
//   Pagination,
// } from '@mui/material';
// import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
// import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
// import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
// import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
// import { StatCard } from '../components/StatCard';
// import { StatusChip } from '../components/StatusChip';
// import { VerifyResultModal } from '../components/VerifyResultModal';
// import { useVerificationStore } from '../store/verificationStore';
// import { queueItems } from '../data/mockData';
// import { tokens } from '../theme/theme';
// import type { QueueTabKey } from '../types';

// const tabs: { key: QueueTabKey; label: string; count: number }[] = [
//   { key: 'awaiting-result', label: 'Awaiting Result', count: 38 },
//   { key: 'evidence-queue', label: 'Evidence Queue', count: 21 },
//   { key: 'pending-verification', label: 'Pending Verification', count: 174 },
//   { key: 'disputed', label: 'Disputed', count: 17 },
//   { key: 'resolved-today', label: 'Resolved Today', count: 52 },
// ];

// export function ResultVerificationQueue() {
//   const { activeTab, setActiveTab, counts, openVerifyModal } = useVerificationStore();

//   return (
//     <Box>
//       <Typography variant="h1" sx={{ fontSize: 30 }}>
//         Result Verification Queue
//       </Typography>
//       <Typography sx={{ color: tokens.textSecondary, fontSize: 13.5, mt: 0.5, mb: 3 }}>
//         Independent review of proposed outcomes, evidence, and disputes prior to settlement.
//       </Typography>

//       <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
//         <StatCard
//           icon={<AccessTimeOutlinedIcon fontSize="small" />}
//           value={counts.awaitingResult}
//           label="Awaiting Result"
//           caption="Fixtures completed, no result imported"
//           accent="amber"
//           delta="+8"
//           onClick={() => setActiveTab('awaiting-result')}
//         />
//         <StatCard
//           icon={<DescriptionOutlinedIcon fontSize="small" />}
//           value={counts.evidencePending}
//           label="Evidence Pending"
//           caption="Awaiting source/document upload"
//           accent="blue"
//           delta="+5"
//           onClick={() => setActiveTab('evidence-queue')}
//         />
//         <StatCard
//           icon={<SearchOutlinedIcon fontSize="small" />}
//           value={174}
//           label="Pending Verification"
//           caption="Requires reviewer comparison"
//           accent="violet"
//           delta="+23"
//           onClick={() => setActiveTab('pending-verification')}
//         />
//         <StatCard
//           icon={<WarningAmberOutlinedIcon fontSize="small" />}
//           value={counts.disputed}
//           label="Disputed"
//           caption="5 Critical / escalation required"
//           accent="red"
//           delta="-3"
//           onClick={() => setActiveTab('disputed')}
//         />
//       </Stack>

//       <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
//         <Tabs
//           value={activeTab}
//           onChange={(_, val) => setActiveTab(val)}
//           sx={{
//             borderBottom: `1px solid ${tokens.border}`,
//             px: 2,
//             minHeight: 48,
//             '& .MuiTab-root': {
//               textTransform: 'none',
//               fontSize: 13,
//               fontWeight: 600,
//               minHeight: 48,
//               color: tokens.textSecondary,
//             },
//             '& .Mui-selected': { color: `${tokens.violet} !important` },
//             '& .MuiTabs-indicator': { background: tokens.violet, height: 3, borderRadius: 3 },
//           }}
//         >
//           {tabs.map((t) => (
//             <Tab key={t.key} value={t.key} label={`${t.label} (${t.count})`} />
//           ))}
//         </Tabs>

//         <Table size="small">
//           <TableHead>
//             <TableRow>
//               {['Result ID', 'Market', 'Fixture', 'Sport / League', 'Source Status', 'Rule Reference', 'Proposed Outcome', 'Age', 'Assigned To', ''].map(
//                 (h) => (
//                   <TableCell key={h} sx={{ color: tokens.textMuted, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>
//                     {h}
//                   </TableCell>
//                 ),
//               )}
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {queueItems.map((row) => (
//               <TableRow key={row.id} hover>
//                 <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.violet }}>{row.id}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5 }}>{row.market}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{row.fixture}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{row.sportLeague}</TableCell>
//                 <TableCell>
//                   <StatusChip label={row.sourceStatus} />
//                 </TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{row.ruleReference}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.proposedOutcome}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{row.ageMinutes}m</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{row.assignedTo}</TableCell>
//                 <TableCell>
//                   <Button size="small" variant="outlined" onClick={() => openVerifyModal(row.id)}>
//                     Review
//                   </Button>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>

//         <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
//           <Typography sx={{ fontSize: 12, color: tokens.textMuted }}>
//             Showing 1 to {queueItems.length} of 174 results
//           </Typography>
//           <Pagination count={7} size="small" shape="rounded" />
//         </Stack>
//       </Paper>

//       <VerifyResultModal />
//     </Box>
//   );
// }