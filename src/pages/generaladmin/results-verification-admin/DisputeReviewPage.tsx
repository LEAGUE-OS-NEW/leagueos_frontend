// import {
//   Box,
//   Paper,
//   Stack,
//   Typography,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   Button,
//   Select,
//   MenuItem,
//   TextField,
//   Avatar,
// } from '@mui/material';
// import { useState } from 'react';
// import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
// import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
// import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
// import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
// import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
// import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
// import { disputeCase } from '../data/mockData';
// import { StatusChip } from '../components/StatusChip';
// import { tokens } from '../theme/theme';
// import type { ResolutionActionType } from '../types';

// const reasons = [
//   'Official source correction',
//   'Insufficient evidence',
//   'Rule misapplication',
//   'Provider data conflict',
// ];

// const actions: {
//   key: ResolutionActionType;
//   label: string;
//   desc: string;
//   icon: React.ReactNode;
//   color: string;
// }[] = [
//   {
//     key: 'return-for-correction',
//     label: 'Return for Correction',
//     desc: 'Send back to proposer with notes',
//     icon: <UndoOutlinedIcon fontSize="small" />,
//     color: tokens.textSecondary,
//   },
//   {
//     key: 'escalate',
//     label: 'Escalate',
//     desc: 'Send to Super Admin for override decision',
//     icon: <CampaignOutlinedIcon fontSize="small" />,
//     color: tokens.amber,
//   },
//   {
//     key: 'correct-result',
//     label: 'Correct Result',
//     desc: 'Propose corrected outcome (requires evidence + approval)',
//     icon: <FactCheckOutlinedIcon fontSize="small" />,
//     color: tokens.green,
//   },
//   {
//     key: 'void-settlement',
//     label: 'Void Settlement',
//     desc: 'Cancel market, refund all stakes',
//     icon: <BlockOutlinedIcon fontSize="small" />,
//     color: tokens.red,
//   },
// ];

// export function DisputeReviewPage() {
//   const [selectedAction, setSelectedAction] = useState<ResolutionActionType | null>(null);
//   const [reason, setReason] = useState('');
//   const [note, setNote] = useState('');
//   const canSubmit = Boolean(selectedAction && reason && note && disputeCase.evidence.some((e) => e.status === 'Verified'));

//   return (
//     <Box sx={{ maxWidth: 960 }}>
//       <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
//         <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
//           {disputeCase.id} — Disputed Result Review
//         </Typography>
//         <StatusChip label="Disputed" />
//       </Stack>
//       <Typography sx={{ fontSize: 12, color: tokens.textMuted, mb: 2 }}>
//         Raised {disputeCase.raisedAt}
//       </Typography>

//       <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 2.5 }}>
//         Market: {disputeCase.market} &nbsp;·&nbsp; Event: {disputeCase.fixture} &nbsp;·&nbsp; Rule:{' '}
//         <Box component="span" sx={{ color: tokens.violet, fontWeight: 600 }}>
//           {disputeCase.ruleReference} — View Rule
//         </Box>
//       </Typography>

//       {/* Comparison strip */}
//       <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
//         <MiniCard label="Submitted Outcome" value={disputeCase.submittedOutcome} color={tokens.violet} />
//         <ArrowForwardIcon sx={{ color: tokens.textMuted }} />
//         <MiniCard label="Official Source Result" value={disputeCase.officialResult} color={tokens.green} />
//         <ArrowForwardIcon sx={{ color: tokens.textMuted }} />
//         <MiniCard label="Discrepancy" value={disputeCase.discrepancy} color={tokens.red} />
//       </Stack>

//       <Paper sx={{ p: 2, borderRadius: 3, mb: 2.5 }}>
//         <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textMuted, mb: 1 }}>
//           EVIDENCE & SOURCE LINKS
//         </Typography>
//         <Table size="small">
//           <TableHead>
//             <TableRow>
//               {['Type', 'File / Source', 'Uploaded By', 'Time', 'Status'].map((h) => (
//                 <TableCell key={h} sx={{ fontSize: 11, color: tokens.textMuted, fontWeight: 700 }}>
//                   {h}
//                 </TableCell>
//               ))}
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {disputeCase.evidence.map((e) => (
//               <TableRow key={e.type}>
//                 <TableCell sx={{ fontSize: 12.5 }}>{e.type}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{e.fileSource}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{e.uploadedBy}</TableCell>
//                 <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{e.time}</TableCell>
//                 <TableCell>
//                   <StatusChip label={e.status} />
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </Paper>

//       <Paper sx={{ p: 2, borderRadius: 3, mb: 2.5 }}>
//         <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textMuted, mb: 1.5 }}>
//           REVIEWER NOTES
//         </Typography>
//         <Stack spacing={1.5}>
//           {disputeCase.reviewerNotes.map((n, i) => (
//             <Stack key={i} direction="row" spacing={1.25}>
//               <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: tokens.violet }}>
//                 {n.author[0]}
//               </Avatar>
//               <Box>
//                 <Typography sx={{ fontSize: 12.5 }}>
//                   <b>{n.author}</b>{' '}
//                   <Box component="span" sx={{ color: tokens.textMuted }}>
//                     ({n.time})
//                   </Box>{' '}
//                   — {n.note}
//                 </Typography>
//               </Box>
//             </Stack>
//           ))}
//         </Stack>
//       </Paper>

//       <Paper sx={{ p: 2, borderRadius: 3 }}>
//         <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textMuted, mb: 1.5 }}>
//           RESOLUTION ACTIONS
//         </Typography>
//         <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
//           {actions.map((a) => (
//             <Paper
//               key={a.key}
//               onClick={() => setSelectedAction(a.key)}
//               sx={{
//                 flex: 1,
//                 p: 1.5,
//                 cursor: 'pointer',
//                 borderColor: selectedAction === a.key ? a.color : tokens.border,
//                 background: selectedAction === a.key ? a.color + '14' : tokens.surfaceRaised,
//               }}
//             >
//               <Stack direction="row" spacing={1} alignItems="center" sx={{ color: a.color, mb: 0.5 }}>
//                 {a.icon}
//                 <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.textPrimary }}>
//                   {a.label}
//                 </Typography>
//               </Stack>
//               <Typography sx={{ fontSize: 11.5, color: tokens.textMuted }}>{a.desc}</Typography>
//             </Paper>
//           ))}
//         </Stack>

//         <Stack direction="row" spacing={2}>
//           <Box sx={{ flex: 1 }}>
//             <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
//               Decision Reason *
//             </Typography>
//             <Select fullWidth size="small" displayEmpty value={reason} onChange={(e) => setReason(e.target.value)}>
//               <MenuItem value="">
//                 <em style={{ color: tokens.textMuted }}>Select reason...</em>
//               </MenuItem>
//               {reasons.map((r) => (
//                 <MenuItem key={r} value={r}>
//                   {r}
//                 </MenuItem>
//               ))}
//             </Select>
//           </Box>
//           <Box sx={{ flex: 1 }}>
//             <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
//               Decision Note *
//             </Typography>
//             <TextField
//               fullWidth
//               size="small"
//               placeholder="Provide detailed reason and evidence..."
//               value={note}
//               onChange={(e) => setNote(e.target.value.slice(0, 500))}
//             />
//           </Box>
//         </Stack>

//         <Stack
//           direction="row"
//           spacing={1}
//           alignItems="center"
//           sx={{
//             mt: 2,
//             p: 1.25,
//             borderRadius: 1.5,
//             background: tokens.amberSoft,
//             border: `1px solid ${tokens.amber}55`,
//           }}
//         >
//           <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: tokens.amber }} />
//           <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
//             A reason and at least one evidence reference are required to submit this decision —
//             this will be recorded in the audit log.
//           </Typography>
//         </Stack>

//         <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
//           <Button variant="outlined">Cancel</Button>
//           <Button variant="contained" disabled={!canSubmit}>
//             Submit Decision
//           </Button>
//         </Stack>
//       </Paper>
//     </Box>
//   );
// }

// function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
//   return (
//     <Paper sx={{ px: 2, py: 1.25, borderColor: color + '55', minWidth: 170 }}>
//       <Typography sx={{ fontSize: 10.5, color: tokens.textMuted }}>{label}</Typography>
//       <Typography sx={{ fontSize: 14, fontWeight: 800, color }}>{value}</Typography>
//     </Paper>
//   );
// }