// import { Box, Typography, Stack, Paper, Button } from '@mui/material';
// import { useNavigate } from 'react-router-dom';
// import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
// import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
// import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
// import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
// import { StatCard } from '../../../components/generaladmin/ResultsVerificationAdmin/StatCard';
// import { tokens } from '../../../theme/theme';

// export function OverviewPage() {
//   const navigate = useNavigate();

//   return (
//     <Box>
//       <Typography variant="h1" sx={{ fontSize: 30 }}>
//         Verification Overview
//       </Typography>
//       <Typography sx={{ color: tokens.textSecondary, fontSize: 13.5, mt: 0.5, mb: 3 }}>
//         Welcome back, Nalubega. Here's what needs your review today.
//       </Typography>

//       <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
//         <StatCard icon={<AccessTimeOutlinedIcon fontSize="small" />} value={38} label="Awaiting Result" caption="Fixtures completed, no result imported" accent="amber" delta="+8" onClick={() => navigate('/results')} />
//         <StatCard icon={<DescriptionOutlinedIcon fontSize="small" />} value={21} label="Evidence Pending" caption="Awaiting source/document upload" accent="blue" delta="+5" onClick={() => navigate('/results')} />
//         <StatCard icon={<SearchOutlinedIcon fontSize="small" />} value={174} label="Pending Verification" caption="Requires reviewer comparison" accent="violet" delta="+23" onClick={() => navigate('/results')} />
//         <StatCard icon={<WarningAmberOutlinedIcon fontSize="small" />} value={17} label="Disputed" caption="5 Critical / escalation required" accent="red" delta="-3" onClick={() => navigate('/results')} />
//       </Stack>

//       <Paper sx={{ p: 3, borderRadius: 3 }}>
//         <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Jump into review</Typography>
//         <Typography sx={{ fontSize: 13, color: tokens.textSecondary, mb: 2 }}>
//           Open the results workspace to compare source data, market rules, and proposed outcomes,
//           or resolve an open dispute with a fully evidenced decision.
//         </Typography>
//         <Stack direction="row" spacing={1.5}>
//           <Button variant="contained" onClick={() => navigate('/results')}>
//             Go to Verification Queue
//           </Button>
//           <Button variant="outlined" onClick={() => navigate('/audit-trail')}>
//             View Audit Trail
//           </Button>
//         </Stack>
//       </Paper>
//     </Box>
//   );
// }