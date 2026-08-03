import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/landing/Landing';
import NewsPage from "./pages/landing/news-page/NewsPage";
import AboutUs from "./pages/landing/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";
import FanOnboarding from "./pages/fan/onboarding/FanOnboarding";
import FanDashboard from './pages/fan/sections/FanDashboard';
import Markets from './pages/markets/Markets';
import Fantasy from './pages/fantasy/Fantasy';
import Register from "./pages/auth/registration/Register";
import Login from "./pages/auth/login/Login";
import ForgotPassword from "./pages/auth/forgotpassword/ForgotPassword";
import VerifyEmail from "./pages/auth/emailVerification/VerifyEmail";
import Tickets from "./pages/landing/tickets/TicketsLandingPage";
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import GeneralAdminDashboard from './pages/generaladmin/GeneralAdminDashboard';
// import Personalize from "./pages/personalize/Personalize";

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing section */ }
        <Route path="/" element={<Landing />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/clubs" element={<ClubsPage />} />

         {/* Fan Section*/ }
         <Route path="/fan/onboarding" element={<FanOnboarding />}/>
        <Route path="/fandashboard" element={<FanDashboard />} />
        
        <Route path="/markets" element={<Markets />} />
        <Route path="/fantasy" element={<Fantasy />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/tickets" element={<Tickets />} />

        {/* Super Admin dashboard */}
        <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />

        {/* General Admin dashboard */}
        <Route path="/dashboard/general-admin" element={<GeneralAdminDashboard />} />
        {/* <Route path="/personalize" element={<Personalize />} /> */}

      </Routes>
    </Router>
  );
}

export default App;