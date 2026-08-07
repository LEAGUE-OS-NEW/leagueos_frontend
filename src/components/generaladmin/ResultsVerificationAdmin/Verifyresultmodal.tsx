// import {
//   Dialog,
//   Box,
//   Typography,
//   Stack,
//   Paper,
//   IconButton,
//   Select,
//   MenuItem,
//   TextField,
//   Button,
//   Divider,
// } from '@mui/material';
// import { useState } from 'react';
// import CloseIcon from '@mui/icons-material/Close';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import CheckIcon from '@mui/icons-material/Check';
// import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
// import { useVerificationStore } from '../../../store/resultsVerificationAdminStore';
// import { StatusChip } from './Statuschip';
// import { tokens } from '../../../theme/theme';

// const decisionOptions = ['Verified', 'Returned to Proposer', 'Escalated', 'Void Candidate'];

// export function VerifyResultModal() {
//   const { verifyModalOpen, closeVerifyModal, activeResultId } = useVerificationStore();
//   const [decision, setDecision] = useState('');
//   const [evidence, setEvidence] = useState('');
//   const [note, setNote] = useState('');

//   if (!activeResultId) return null;

//   return (
//     <Dialog
//       open={verifyModalOpen}
//       onClose={closeVerifyModal}
//       maxWidth="lg"
//       fullWidth
//       PaperProps={{ sx: { borderRadius: 3, background: tokens.surface } }}
//     >
//       <Box sx={{ p: 3 }}>
//         <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
//           <Stack direction="row" spacing={1.5} alignItems="center">
//             <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
//               {activeResultId} — Verify Result
//             </Typography>
//             <StatusChip label="Pending Verification" />
//             <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: tokens.textSecondary, fontSize: 12.5 }}>
//               <SportsSoccerIcon sx={{ fontSize: 15 }} /> Football
//             </Stack>
//           </Stack>
//           <IconButton size="small" onClick={closeVerifyModal}>
//             <CloseIcon fontSize="small" />
//           </IconButton>
//         </Stack>

//         <Typography sx={{ fontSize: 12.5, color: tokens.textMuted, mb: 2.5 }}>
//           Market: Match Winner (3-Way) &nbsp;·&nbsp; Event: Vipers SC vs Express FC &nbsp;·&nbsp;
//           Competition: UGX Premier League &nbsp;·&nbsp; Played At: 24 May 2026, 16:00 EAT
//         </Typography>

//         {/* Three-column comparison: rule vs source vs proposed outcome */}
//         <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
//           <ComparisonColumn
//             headerLabel="Market Rule"
//             headerColor={tokens.blue}
//           >
//             <Field label="Rule ID" value="STD-MW-4.2" />
//             <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1, lineHeight: 1.6 }}>
//               Winner determined by full-time score. Extra time / penalties apply only if
//               competition round is knockout.
//             </Typography>
//             <Field label="Applicable" value="Yes (League Stage, No ET/Pens)" mt />
//             <Button size="small" sx={{ mt: 1, px: 0, fontSize: 12 }}>
//               View Full Rule →
//             </Button>
//           </ComparisonColumn>

//           <Connector icon={<CheckIcon sx={{ fontSize: 16 }} />} good />

//           <ComparisonColumn headerLabel="Source Data (Official Feed)" headerColor={tokens.green}>
//             <Field label="Opta Feed" value="" mono={false} />
//             <Typography sx={{ fontSize: 15, fontWeight: 800, mt: 0.5 }}>
//               Vipers SC 2 – 1 Express FC
//             </Typography>
//             <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
//               <Field label="Half Time" value="1 – 0" />
//               <Field label="Full Time" value="2 – 1" />
//             </Stack>
//             <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
//               <Field label="ET" value="–" />
//               <Field label="Pens" value="–" />
//             </Stack>
//             <Field label="Received At" value="16:22 EAT" mt />
//             <Field label="Confidence" value="High (Single Source)" mt />
//           </ComparisonColumn>

//           <Connector icon={<CheckIcon sx={{ fontSize: 16 }} />} good />

//           <ComparisonColumn headerLabel="Proposed Outcome" headerColor={tokens.violet} last>
//             <Typography sx={{ fontSize: 11, color: tokens.textMuted }}>
//               Submitted by Sarah K.
//             </Typography>
//             <Typography sx={{ fontSize: 16, fontWeight: 800, mt: 0.5 }}>
//               Vipers SC (1) — Winner
//             </Typography>
//             <Field label="Submitted At" value="16:21 EAT" mt />
//             <Stack spacing={0.5} sx={{ mt: 1 }}>
//               <Stack direction="row" spacing={0.5} alignItems="center">
//                 <CheckCircleIcon sx={{ fontSize: 14, color: tokens.green }} />
//                 <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
//                   Matches Rule Logic
//                 </Typography>
//               </Stack>
//               <Stack direction="row" spacing={0.5} alignItems="center">
//                 <CheckCircleIcon sx={{ fontSize: 14, color: tokens.green }} />
//                 <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
//                   Matches Source Data
//                 </Typography>
//               </Stack>
//             </Stack>
//           </ComparisonColumn>
//         </Box>

//         <Divider sx={{ my: 2.5, borderColor: tokens.border }} />

//         <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textMuted, letterSpacing: '0.05em', mb: 1.5 }}>
//           VERIFICATION DECISION
//         </Typography>
//         <Stack direction="row" spacing={2}>
//           <Box sx={{ flex: 1 }}>
//             <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
//               Decision *
//             </Typography>
//             <Select
//               fullWidth
//               size="small"
//               displayEmpty
//               value={decision}
//               onChange={(e) => setDecision(e.target.value)}
//             >
//               <MenuItem value="">
//                 <em style={{ color: tokens.textMuted }}>Select decision...</em>
//               </MenuItem>
//               {decisionOptions.map((d) => (
//                 <MenuItem key={d} value={d}>
//                   {d}
//                 </MenuItem>
//               ))}
//             </Select>
//           </Box>
//           <Box sx={{ flex: 1 }}>
//             <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
//               Evidence Reference (at least one required) *
//             </Typography>
//             <TextField
//               fullWidth
//               size="small"
//               placeholder="Add source or upload evidence"
//               value={evidence}
//               onChange={(e) => setEvidence(e.target.value)}
//             />
//           </Box>
//         </Stack>

//         <Box sx={{ mt: 2 }}>
//           <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
//             Verification Note (optional)
//           </Typography>
//           <TextField
//             fullWidth
//             size="small"
//             multiline
//             minRows={2}
//             placeholder="Add notes or observations..."
//             value={note}
//             onChange={(e) => setNote(e.target.value.slice(0, 500))}
//             helperText={`${note.length}/500`}
//             FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
//           />
//         </Box>

//         <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2.5 }}>
//           <Button variant="outlined" onClick={closeVerifyModal}>
//             Cancel
//           </Button>
//           <Button variant="outlined" color="inherit">
//             Return to Proposer
//           </Button>
//           <Button variant="outlined" color="warning">
//             Escalate
//           </Button>
//           <Button
//             variant="contained"
//             disabled={!decision || !evidence}
//             onClick={closeVerifyModal}
//           >
//             Confirm Verified
//           </Button>
//         </Stack>
//       </Box>
//     </Dialog>
//   );
// }

// function ComparisonColumn({
//   headerLabel,
//   headerColor,
//   children,
//   last,
// }: {
//   headerLabel: string;
//   headerColor: string;
//   children: React.ReactNode;
//   last?: boolean;
// }) {
//   return (
//     <Paper
//       sx={{
//         flex: 1,
//         p: 2,
//         borderRadius: last ? 2 : 2,
//         borderColor: headerColor + '55',
//         background: tokens.surfaceRaised,
//       }}
//     >
//       <Box
//         sx={{
//           display: 'inline-block',
//           fontSize: 11,
//           fontWeight: 700,
//           letterSpacing: '0.04em',
//           color: headerColor,
//           background: headerColor + '1f',
//           border: `1px solid ${headerColor}55`,
//           borderRadius: 1,
//           px: 1,
//           py: 0.25,
//           mb: 1.5,
//         }}
//       >
//         {headerLabel.toUpperCase()}
//       </Box>
//       {children}
//     </Paper>
//   );
// }

// function Connector({ icon, good }: { icon: React.ReactNode; good?: boolean }) {
//   return (
//     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40 }}>
//       <Box
//         sx={{
//           width: 26,
//           height: 26,
//           borderRadius: '50%',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           color: good ? tokens.green : tokens.red,
//           background: good ? tokens.greenSoft : tokens.redSoft,
//           border: `1px solid ${good ? tokens.green : tokens.red}55`,
//         }}
//       >
//         {icon}
//       </Box>
//     </Box>
//   );
// }

// function Field({ label, value, mt, mono }: { label: string; value: string; mt?: boolean; mono?: boolean }) {
//   return (
//     <Box sx={{ mt: mt ? 1 : 0 }}>
//       <Typography sx={{ fontSize: 10.5, color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
//         {label}
//       </Typography>
//       {value && (
//         <Typography sx={{ fontSize: mono ? 12.5 : 13, fontWeight: 600, color: tokens.textPrimary }}>
//           {value}
//         </Typography>
//       )}
//     </Box>
//   );
// }