import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/landing/Landing';

function NormalizeSlash() {
  const { pathname, search, hash } = useLocation();
  if (pathname !== '/' && pathname.startsWith('//')) {
    return <Navigate to={pathname.replace(/^\/+/, '/') + search + hash} replace />;
  }
  return null;
}
import NewsPage from "./pages/landing/news-page/NewsPage";
import AboutUs from "./pages/landing/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";
import ClubProfile from './pages/clubs/profile/ClubProfile';
import PlayerProfile from './pages/clubs/profile/PlayerProfile';
import FanOnboarding from "./pages/fan/onboarding/FanOnboarding";
import FanDashboard from './pages/fan/sections/FanDashboard';
import FanProfile from './pages/fan/profile/FanProfile';
import FanSettings from './pages/fan/settings/FanSettings';
import Markets from './pages/markets/Markets';
import Fantasy from './pages/fantasy/Fantasy';
import Register from "./pages/auth/registration/Register";
import Login from "./pages/auth/login/Login";
import ForgotPassword from "./pages/auth/forgotpassword/ForgotPassword";
import VerifyEmail from "./pages/auth/emailVerification/VerifyEmail";
import Tickets from "./pages/landing/tickets/TicketsLandingPage";
import Store from "./pages/landing/store/Store";
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import GeneralAdminDashboard from './pages/generaladmin/GeneralAdminDashboard';
import ComplianceAdmin from './pages/generaladmin/compliance/ComplianceAdmin';
import FinanceAdmin from "./pages/generaladmin/financeadmin/FinanceAdmin";
import LegalPolicy from './pages/landing/leagueospolicies/LegalPolicy';
import TermsConditions from './pages/landing/leagueospolicies/TermsConditions';

import SportsDataAdmin from './pages/generaladmin/sportsdata/SportsDataAdmin';
import MarketOperationsAdmin from './pages/generaladmin/marketoperations/MarketOperationsAdmin';
import MarketApprovalAdmin from './pages/generaladmin/marketapproval/MarketApprovalAdmin';
import CustomerSupportAdmin from './pages/generaladmin/support/CustomerSupportAdmin';

import HelpCenter from './pages/support/HelpCenter';
import HowItWorks from './pages/support/HowItWorks';
import Safety from './pages/support/Safety';
import ContactUs from './pages/support/ContactUs';
import Community from './pages/support/Community';
// import Personalize from "./pages/personalize/Personalize";

function App() {
  return (
    <Router>
      <NormalizeSlash />
      <Routes>
        {/* Landing section */ }
        <Route path="/" element={<Landing />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/:clubSlug" element={<ClubProfile />} />
        <Route path="/clubs/:clubSlug/players/:playerId" element={<PlayerProfile />} />
         <Route path="/tickets" element={<Tickets />} />
         <Route path="/privacy-policy" element={<LegalPolicy />} />
         <Route path="/terms-and-conditions" element={<TermsConditions />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/store" element={<Store />} />

          {/* Fan Section*/ }
         <Route path="/fan/onboarding" element={<FanOnboarding />}/>
        <Route path="/fandashboard" element={<FanDashboard />} />
        <Route path="/profile" element={<FanProfile />} />
        <Route path="/settings" element={<FanSettings />} />

        <Route path="/markets" element={<Markets />} />
        <Route path="/fantasy" element={<Fantasy />} />

        {/* authentication routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Super Admin dashboard */}
        <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />

        {/* General Admin dashboard */}
        <Route path="/dashboard/general-admin" element={<GeneralAdminDashboard />} />
        <Route path="/dashboard/general-admin/compliance" element={<ComplianceAdmin />}/>
        <Route path="/dashboard/general-admin/finance" element={<FinanceAdmin />} />
        <Route path="/dashboard/general-admin/sports-data" element={<SportsDataAdmin />}/>
        <Route path="/dashboard/general-admin/markets" element={<MarketOperationsAdmin />}/>
        <Route path="/dashboard/general-admin/market-proposals" element={<MarketApprovalAdmin />}/>
        <Route path="/dashboard/general-admin/support" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/general-admin/support/case-queues" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/general-admin/support/my-cases" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/general-admin/support/escalations" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/general-admin/support/sla" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/general-admin/support/resolved" element={<CustomerSupportAdmin />} />

        {/* Support pages */}
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/community" element={<Community />} />

        {/* <Route path="/personalize" element={<Personalize />} /> */}

      </Routes>
    </Router>
  );
}

export default App;
