// import { Box, InputBase, Stack, Typography, Badge, Avatar, Chip } from '@mui/material';
// import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
// import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
// import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
// import { tokens } from '../../../theme/theme';

// export function TopBar() {
//   return (
//     <Box
//       sx={{
//         height: 64,
//         display: 'flex',
//         alignItems: 'center',
//         gap: 2,
//         px: 3,
//         borderBottom: `1px solid ${tokens.border}`,
//         background: tokens.bg,
//         position: 'sticky',
//         top: 0,
//         zIndex: 10,
//       }}
//     >
//       <Typography sx={{ color: tokens.textSecondary, fontSize: 13, fontWeight: 600 }}>
//         Administration
//       </Typography>

//       <Box
//         sx={{
//           flex: 1,
//           maxWidth: 480,
//           mx: 'auto',
//           display: 'flex',
//           alignItems: 'center',
//           gap: 1,
//           background: tokens.surfaceRaised,
//           border: `1px solid ${tokens.border}`,
//           borderRadius: 2,
//           px: 1.5,
//           py: 0.75,
//         }}
//       >
//         <SearchOutlinedIcon sx={{ fontSize: 18, color: tokens.textMuted }} />
//         <InputBase
//           placeholder="Search results, evidence, disputes..."
//           sx={{ flex: 1, fontSize: 13, color: tokens.textPrimary }}
//         />
//         <Typography sx={{ fontSize: 11, color: tokens.textMuted, border: `1px solid ${tokens.border}`, borderRadius: 1, px: 0.75 }}>
//           ⌘K
//         </Typography>
//       </Box>

//       <Stack direction="row" spacing={2} alignItems="center">
//         <Badge color="error" variant="dot">
//           <NotificationsNoneOutlinedIcon sx={{ color: tokens.textSecondary }} />
//         </Badge>

//         <Chip
//           icon={<VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} />}
//           label="Result Verification Admin"
//           size="small"
//           sx={{
//             background: tokens.violetSoft,
//             color: tokens.violet,
//             border: `1px solid ${tokens.violetBorder}`,
//             fontSize: 12,
//           }}
//         />

//         <Stack direction="row" spacing={1} alignItems="center">
//           <Avatar sx={{ width: 30, height: 30, bgcolor: tokens.violet, fontSize: 13 }}>N</Avatar>
//           <Box>
//             <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>
//               Nalubega
//             </Typography>
//             <Typography sx={{ fontSize: 10.5, color: tokens.textMuted, lineHeight: 1.2 }}>
//               Verifier
//             </Typography>
//           </Box>
//         </Stack>
//       </Stack>
//     </Box>
//   );
// }