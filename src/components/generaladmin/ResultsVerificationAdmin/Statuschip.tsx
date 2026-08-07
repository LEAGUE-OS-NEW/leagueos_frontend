// import { Chip } from '@mui/material';
// import { tokens } from '../../../theme/theme';

// const map: Record<string, { color: string; bg: string }> = {
//   'Feed Received': { color: tokens.green, bg: tokens.greenSoft },
//   'Awaiting Feed': { color: tokens.amber, bg: tokens.amberSoft },
//   'Manual Upload': { color: tokens.blue, bg: tokens.blueSoft },
//   'Evidence Pending': { color: tokens.amber, bg: tokens.amberSoft },
//   Verified: { color: tokens.green, bg: tokens.greenSoft },
//   Pending: { color: tokens.amber, bg: tokens.amberSoft },
//   Missing: { color: tokens.red, bg: tokens.redSoft },
//   Disputed: { color: tokens.red, bg: tokens.redSoft },
//   'Pending Verification': { color: tokens.amber, bg: tokens.amberSoft },
// };

// export function StatusChip({ label }: { label: string }) {
//   const c = map[label] ?? { color: tokens.textSecondary, bg: 'rgba(255,255,255,0.06)' };
//   return (
//     <Chip
//       size="small"
//       label={label}
//       sx={{
//         color: c.color,
//         background: c.bg,
//         border: `1px solid ${c.color}55`,
//         fontSize: 11.5,
//         height: 22,
//       }}
//     />
//   );
// }