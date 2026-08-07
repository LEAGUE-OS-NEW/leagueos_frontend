// import { Box, Stack, Typography, Tooltip } from '@mui/material';
// import { NavLink } from 'react-router-dom';
// import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
// import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
// import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
// import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
// import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
// import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
// import { tokens } from '../theme/theme';

// // This is the ONLY navigation surface for the Result Verification Admin role.
// // It intentionally excludes Markets, Market Proposals, Finance, Fantasy, Clubs
// // and Configure Modules — those belong to Super Admin / other role navbars.
// // A verifier can read sports data and compliance context, but their only
// // actionable workspace is Results & Settlement (verification + disputes).

// interface NavItem {
//   label: string;
//   to: string;
//   icon: React.ReactNode;
//   disabled?: boolean;
// }

// const platformItems: NavItem[] = [
//   { label: 'Overview', to: '/', icon: <DashboardOutlinedIcon fontSize="small" /> },
// ];

// const platformSection: NavItem[] = [
//   {
//     label: 'Sports Data',
//     to: '/sports-data',
//     icon: <BarChartOutlinedIcon fontSize="small" />,
//     disabled: true,
//   },
//   {
//     label: 'Results & Settlement',
//     to: '/results',
//     icon: <FactCheckOutlinedIcon fontSize="small" />,
//   },
// ];

// const governanceSection: NavItem[] = [
//   {
//     label: 'Compliance',
//     to: '/compliance',
//     icon: <VerifiedUserOutlinedIcon fontSize="small" />,
//     disabled: true,
//   },
//   { label: 'Audit Logs', to: '/audit-trail', icon: <HistoryOutlinedIcon fontSize="small" /> },
// ];

// function SectionLabel({ children }: { children: React.ReactNode }) {
//   return (
//     <Typography
//       variant="caption"
//       sx={{
//         color: tokens.textMuted,
//         letterSpacing: '0.08em',
//         fontWeight: 700,
//         fontSize: 11,
//         px: 2,
//         mt: 2,
//         mb: 0.5,
//         display: 'block',
//       }}
//     >
//       {children}
//     </Typography>
//   );
// }

// function NavRow({ item }: { item: NavItem }) {
//   const content = (
//     <Box
//       sx={{
//         display: 'flex',
//         alignItems: 'center',
//         gap: 1.25,
//         px: 2,
//         py: 1,
//         mx: 1,
//         borderRadius: 1.5,
//         color: item.disabled ? tokens.textMuted : tokens.textSecondary,
//         opacity: item.disabled ? 0.5 : 1,
//         cursor: item.disabled ? 'not-allowed' : 'pointer',
//         fontSize: 14,
//         fontWeight: 600,
//         '&.active': {
//           background: tokens.violetSoft,
//           color: tokens.textPrimary,
//           border: `1px solid ${tokens.violetBorder}`,
//         },
//         '&:hover': item.disabled
//           ? {}
//           : {
//               background: 'rgba(255,255,255,0.03)',
//             },
//       }}
//       className={undefined}
//     >
//       {item.icon}
//       <Box component="span" sx={{ flex: 1 }}>
//         {item.label}
//       </Box>
//       {item.disabled && <LockOutlinedIcon sx={{ fontSize: 14, color: tokens.textMuted }} />}
//     </Box>
//   );

//   if (item.disabled) {
//     return (
//       <Tooltip title="Outside Result Verification Admin scope" placement="right">
//         <Box>{content}</Box>
//       </Tooltip>
//     );
//   }

//   return (
//     <NavLink to={item.to} style={{ textDecoration: 'none' }} end={item.to === '/'}>
//       {({ isActive }) => (
//         <Box
//           sx={{
//             display: 'flex',
//             alignItems: 'center',
//             gap: 1.25,
//             px: 2,
//             py: 1,
//             mx: 1,
//             borderRadius: 1.5,
//             color: isActive ? tokens.textPrimary : tokens.textSecondary,
//             background: isActive ? tokens.violetSoft : 'transparent',
//             border: isActive ? `1px solid ${tokens.violetBorder}` : '1px solid transparent',
//             fontSize: 14,
//             fontWeight: 600,
//             transition: 'background 0.15s ease',
//             '&:hover': { background: isActive ? tokens.violetSoft : 'rgba(255,255,255,0.03)' },
//           }}
//         >
//           {item.icon}
//           <Box component="span" sx={{ flex: 1 }}>
//             {item.label}
//           </Box>
//         </Box>
//       )}
//     </NavLink>
//   );
// }

// export function Sidebar() {
//   return (
//     <Box
//       component="nav"
//       aria-label="Result Verification Admin navigation"
//       sx={{
//         width: 232,
//         flexShrink: 0,
//         height: '100vh',
//         position: 'sticky',
//         top: 0,
//         display: 'flex',
//         flexDirection: 'column',
//         background: tokens.surface,
//         borderRight: `1px solid ${tokens.border}`,
//       }}
//     >
//       <Box sx={{ px: 2, py: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
//         <Box
//           sx={{
//             width: 30,
//             height: 30,
//             borderRadius: 1,
//             background:
//               'linear-gradient(135deg,#7c5cff 0%, #4fa3ff 35%, #3ddc97 65%, #f5a524 100%)',
//           }}
//         />
//         <Box>
//           <Typography sx={{ fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}>
//             LEAGUE OS
//           </Typography>
//           <Typography sx={{ fontSize: 9, color: tokens.textMuted, letterSpacing: '0.08em' }}>
//             COMPLETE. TRANSPARENT. TRUSTED.
//           </Typography>
//         </Box>
//       </Box>

//       <Stack sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
//         {platformItems.map((item) => (
//           <NavRow key={item.to} item={item} />
//         ))}

//         <SectionLabel>Platform</SectionLabel>
//         {platformSection.map((item) => (
//           <NavRow key={item.to} item={item} />
//         ))}

//         <SectionLabel>Governance</SectionLabel>
//         {governanceSection.map((item) => (
//           <NavRow key={item.to} item={item} />
//         ))}
//       </Stack>

//       <Box sx={{ p: 1.5 }}>
//         <Box
//           sx={{
//             borderRadius: 2,
//             border: `1px solid ${tokens.violetBorder}`,
//             background:
//               'linear-gradient(180deg, rgba(124,92,255,0.12) 0%, rgba(124,92,255,0.03) 100%)',
//             p: 1.75,
//           }}
//         >
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
//             <LockOutlinedIcon sx={{ fontSize: 16, color: tokens.violet }} />
//             <Typography sx={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>
//               VERIFIER CONSOLE
//             </Typography>
//           </Stack>
//           <Typography sx={{ fontSize: 11, color: tokens.textSecondary, lineHeight: 1.5 }}>
//             Independent review. Evidence-based decisions only. All actions audited.
//           </Typography>
//         </Box>
//       </Box>
//     </Box>
//   );
// }