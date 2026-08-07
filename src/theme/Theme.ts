// import { createTheme } from '@mui/material/styles';

// // League OS — Result Verification Admin design tokens
// // Background layers run darkest (page) -> lighter (cards) -> lighter still (nested surfaces)
// export const tokens = {
//   bg: '#0a0b12',
//   surface: '#12131e',
//   surfaceRaised: '#171827',
//   surfaceNested: '#1c1d2e',
//   border: 'rgba(140, 120, 220, 0.14)',
//   borderStrong: 'rgba(140, 120, 220, 0.28)',
//   violet: '#7c5cff',
//   violetSoft: 'rgba(124, 92, 255, 0.14)',
//   violetBorder: 'rgba(124, 92, 255, 0.4)',
//   green: '#3ddc97',
//   greenSoft: 'rgba(61, 220, 151, 0.12)',
//   amber: '#f5a524',
//   amberSoft: 'rgba(245, 165, 36, 0.12)',
//   red: '#f5527a',
//   redSoft: 'rgba(245, 82, 122, 0.12)',
//   blue: '#4fa3ff',
//   blueSoft: 'rgba(79, 163, 255, 0.12)',
//   textPrimary: '#f2f1f8',
//   textSecondary: '#9b97b3',
//   textMuted: '#6b6785',
// };

// export const theme = createTheme({
//   palette: {
//     mode: 'dark',
//     background: {
//       default: tokens.bg,
//       paper: tokens.surface,
//     },
//     primary: {
//       main: tokens.violet,
//       contrastText: '#fff',
//     },
//     success: { main: tokens.green },
//     warning: { main: tokens.amber },
//     error: { main: tokens.red },
//     info: { main: tokens.blue },
//     text: {
//       primary: tokens.textPrimary,
//       secondary: tokens.textSecondary,
//     },
//     divider: tokens.border,
//   },
//   typography: {
//     fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
//     h1: { fontWeight: 800, letterSpacing: '-0.02em', fontStyle: 'italic', textTransform: 'uppercase' },
//     h2: { fontWeight: 800, letterSpacing: '-0.02em' },
//     button: { textTransform: 'none', fontWeight: 600 },
//   },
//   shape: {
//     borderRadius: 10,
//   },
//   components: {
//     MuiPaper: {
//       styleOverrides: {
//         root: {
//           backgroundImage: 'none',
//           border: `1px solid ${tokens.border}`,
//         },
//       },
//     },
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 8,
//           fontWeight: 600,
//         },
//       },
//     },
//     MuiChip: {
//       styleOverrides: {
//         root: {
//           fontWeight: 600,
//           borderRadius: 6,
//         },
//       },
//     },
//     MuiTableCell: {
//       styleOverrides: {
//         root: {
//           borderColor: tokens.border,
//         },
//       },
//     },
//   },
// });