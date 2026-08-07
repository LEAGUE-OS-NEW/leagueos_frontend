// import { Box, Paper, Stack, Typography } from '@mui/material';
// import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
// import { auditTrail, disputeCase } from '../../../data/results-verification-admin-data';
// import { tokens } from '../../../theme/theme';

// const toneColor: Record<string, string> = {
//   default: tokens.textMuted,
//   success: tokens.green,
//   warning: tokens.amber,
//   error: tokens.red,
//   info: tokens.blue,
// };

// export function AuditTrailPage() {
//   return (
//     <Box sx={{ maxWidth: 640 }}>
//       <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.25 }}>
//         Audit Trail — {disputeCase.id}
//       </Typography>
//       <Typography sx={{ fontSize: 12.5, color: tokens.textMuted, mb: 3 }}>
//         Complete decision history for this result verification.
//       </Typography>

//       <Paper sx={{ p: 3, borderRadius: 3 }}>
//         <Stack spacing={0}>
//           {auditTrail.map((event, i) => (
//             <Stack
//               key={i}
//               direction="row"
//               spacing={2}
//               sx={{ position: 'relative', pb: i === auditTrail.length - 1 ? 0 : 3 }}
//             >
//               <Stack alignItems="center" sx={{ position: 'relative' }}>
//                 <FiberManualRecordIcon
//                   sx={{ fontSize: 14, color: toneColor[event.tone], zIndex: 1 }}
//                 />
//                 {i !== auditTrail.length - 1 ? (
//                   <Box
//                     sx={{
//                       position: 'absolute',
//                       top: 14,
//                       width: 1.5,
//                       height: '100%',
//                       background: tokens.border,
//                     }}
//                   />
//                 ) : null}
//               </Stack>
//               <Box sx={{ pb: 1 }}>
//                 <Typography sx={{ fontSize: 12, color: tokens.textMuted }}>{event.time}</Typography>
//                 <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{event.title}</Typography>
//                 <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 0.25 }}>
//                   {event.description}
//                 </Typography>
//               </Box>
//             </Stack>
//           ))}
//         </Stack>

//         <Box
//           sx={{
//             mt: 1,
//             p: 1.5,
//             borderRadius: 2,
//             background: tokens.violetSoft,
//             border: `1px solid ${tokens.violetBorder}`,
//           }}
//         >
//           <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
//             Every verification and dispute decision is permanently logged with reviewer identity,
//             reason, and linked evidence.
//           </Typography>
//         </Box>
//       </Paper>
//     </Box>
//   );
// }