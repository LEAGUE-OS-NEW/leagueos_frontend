// import { Box, Paper, Stack, Typography } from '@mui/material';
// import { tokens } from '../../../theme/theme';

// interface StatCardProps {
//   icon: React.ReactNode;
//   value: number | string;
//   label: string;
//   caption: string;
//   accent: 'amber' | 'blue' | 'violet' | 'red';
//   delta?: string;
//   active?: boolean;
//   onClick?: () => void;
// }

// const accentMap = {
//   amber: { color: tokens.amber, bg: tokens.amberSoft },
//   blue: { color: tokens.blue, bg: tokens.blueSoft },
//   violet: { color: tokens.violet, bg: tokens.violetSoft },
//   red: { color: tokens.red, bg: tokens.redSoft },
// };

// export function StatCard({ icon, value, label, caption, accent, delta, onClick }: StatCardProps) {
//   const c = accentMap[accent];
//   return (
//     <Paper
//       onClick={onClick}
//       sx={{
//         p: 2,
//         flex: 1,
//         borderRadius: 3,
//         cursor: onClick ? 'pointer' : 'default',
//         borderColor: c.color + '55',
//         transition: 'transform 0.15s ease, border-color 0.15s ease',
//         '&:hover': onClick ? { transform: 'translateY(-2px)', borderColor: c.color } : {},
//       }}
//     >
//       <Stack direction="row" spacing={1.5} alignItems="flex-start">
//         <Box
//           sx={{
//             width: 38,
//             height: 38,
//             borderRadius: 2,
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             background: c.bg,
//             color: c.color,
//             flexShrink: 0,
//           }}
//         >
//           {icon}
//         </Box>
//         <Box sx={{ minWidth: 0 }}>
//           <Stack direction="row" spacing={1} alignItems="baseline">
//             <Typography sx={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1 }}>
//               {value}
//             </Typography>
//             {delta && (
//               <Typography sx={{ fontSize: 11.5, color: tokens.textMuted, fontWeight: 600 }}>
//                 {delta}
//               </Typography>
//             )}
//           </Stack>
//           <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.textPrimary, mt: 0.5 }}>
//             {label}
//           </Typography>
//           <Typography sx={{ fontSize: 11, color: tokens.textMuted, mt: 0.25 }}>
//             {caption}
//           </Typography>
//         </Box>
//       </Stack>
//     </Paper>
//   );
// }