// import { Box, Paper, Stack, Typography, Button } from '@mui/material';
// import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
// import CloseIcon from '@mui/icons-material/Close';
// import CheckIcon from '@mui/icons-material/Check';
// import RemoveIcon from '@mui/icons-material/Remove';
// import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
// import { blockingConditions } from '../data/mockData';
// import { tokens } from '../theme/theme';

// const iconFor = {
//   blocked: <CloseIcon sx={{ fontSize: 16, color: tokens.red }} />,
//   resolved: <CheckIcon sx={{ fontSize: 16, color: tokens.green }} />,
//   'n-a': <RemoveIcon sx={{ fontSize: 16, color: tokens.textMuted }} />,
// };

// export function SettlementBlockedPage() {
//   const outstanding = blockingConditions.filter((c) => c.status === 'blocked').length;

//   return (
//     <Box sx={{ maxWidth: 720 }}>
//       <Paper
//         sx={{
//           p: 2,
//           mb: 3,
//           borderRadius: 3,
//           borderColor: tokens.red + '66',
//           background: tokens.redSoft,
//         }}
//       >
//         <Stack direction="row" spacing={1.5} alignItems="flex-start">
//           <WarningAmberOutlinedIcon sx={{ color: tokens.red, mt: 0.25 }} />
//           <Box>
//             <Typography sx={{ fontWeight: 800, color: tokens.red, fontSize: 14 }}>
//               SETTLEMENT BLOCKED
//             </Typography>
//             <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 0.25 }}>
//               This result cannot be settled until all blocking conditions are resolved.
//             </Typography>
//           </Box>
//         </Stack>
//       </Paper>

//       <Paper sx={{ p: 2.5, borderRadius: 3 }}>
//         <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textMuted, letterSpacing: '0.05em', mb: 1.5 }}>
//           BLOCKING CONDITIONS
//         </Typography>
//         <Stack spacing={1.25}>
//           {blockingConditions.map((c) => (
//             <Stack key={c.label} direction="row" spacing={1.25} alignItems="flex-start">
//               {iconFor[c.status]}
//               <Typography
//                 sx={{
//                   fontSize: 13,
//                   color: c.status === 'n-a' ? tokens.textMuted : tokens.textPrimary,
//                   lineHeight: 1.5,
//                 }}
//               >
//                 {c.label}
//               </Typography>
//             </Stack>
//           ))}
//         </Stack>

//         <Typography sx={{ fontSize: 12, color: tokens.textMuted, mt: 2.5 }}>
//           All conditions must show resolved before the Settle action becomes available.
//         </Typography>

//         <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
//           <Button variant="contained" disabled startIcon={<LockOutlinedIcon />}>
//             Settle Result
//           </Button>
//           <Typography sx={{ fontSize: 12, color: tokens.textMuted }}>
//             Blocked — {outstanding} conditions outstanding
//           </Typography>
//         </Stack>
//       </Paper>
//     </Box>
//   );
// }