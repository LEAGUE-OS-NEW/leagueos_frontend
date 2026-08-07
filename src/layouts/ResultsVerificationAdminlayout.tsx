// import { Box } from '@mui/material';
// import { Outlet } from 'react-router-dom';
// import { Sidebar } from '../components/generaladmin/ResultsVerificationAdmin/Sidebar';
// import { TopBar } from '../Topbar';
// import { tokens } from '../theme/theme';

// export function AdminLayout() {
//   return (
//     <Box sx={{ display: 'flex', minHeight: '100vh', background: tokens.bg }}>
//       <Sidebar />
//       <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
//         <TopBar />
//         <Box sx={{ flex: 1, p: 3 }}>
//           <Outlet />
//         </Box>
//         <Box
//           component="footer"
//           sx={{
//             textAlign: 'center',
//             py: 2,
//             fontSize: 11.5,
//             color: tokens.textMuted,
//             borderTop: `1px solid ${tokens.border}`,
//           }}
//         >
//           All verification decisions are evidence-linked and audit logged. © 2025 League OS.
//         </Box>
//       </Box>
//     </Box>
//   );
// }