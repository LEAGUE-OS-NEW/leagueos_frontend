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
import ArticleDetail from "./pages/landing/news-page/ArticleDetail";
import AboutUs from "./pages/landing/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";
import ClubProfile from './pages/clubs/profile/ClubProfile';
import PlayerProfile from './pages/clubs/profile/PlayerProfile';
import FanOnboarding from "./pages/fan/onboarding/FanOnboarding";
import FanDashboard from './pages/fan/sections/FanDashboard';
import FanProfile from './pages/fan/profile/FanProfile';
import FanSettings from './pages/fan/settings/FanSettings';
import FanWallet from './pages/fan/wallet/FanWallet';
import MyPositions from './pages/fan/positions/MyPositions';
import Markets from './pages/markets/Markets';
import MarketDetailPage from './pages/markets/MarketDetailPage';
import Fantasy from './pages/fantasy/Fantasy';
import Register from "./pages/auth/registration/Register";
import Login from "./pages/auth/login/Login";
import ForgotPassword from "./pages/auth/forgotpassword/ForgotPassword";
import VerifyEmail from "./pages/auth/emailVerification/VerifyEmail";
import Tickets from "./pages/landing/tickets/TicketsLandingPage";
import TicketCheckoutPage from "./pages/landing/tickets/TicketCheckoutPage";
import Store from "./pages/landing/store/Store";
import FixturesPage from './pages/fixtures/FixturesPage';
import MatchCentre from './pages/matchcentre/MatchCentre';
import AdminDashboard from './pages/admin/AdminDashboard';
import MarketsListPage from './pages/admin/markets/MarketsListPage';
import CreateMarketWizard from './pages/admin/markets/CreateMarketWizard';
import AdminMarketDetailPage from './pages/admin/markets/MarketDetailPage';
import ResultVerificationPage from './pages/admin/verification/ResultVerificationPage';
import DisputesPage from './pages/admin/disputes/DisputesPage';
import AdminUsersPage from './pages/admin/users/AdminUsersPage';
import RolesPermissionsPage from './pages/admin/roles/RolesPermissionsPage';
import NotificationsPage from './pages/admin/notifications/NotificationsPage';
import ReportsPage from './pages/admin/reports/ReportsPage';
import SystemSettingsPage from './pages/admin/settings/SystemSettingsPage';
import ComplianceAdmin from './pages/generaladmin/compliance/ComplianceAdmin';
import FinanceAdmin from "./pages/generaladmin/financeadmin/FinanceAdmin";
import LegalPolicy from './pages/landing/leagueospolicies/LegalPolicy';
import TermsConditions from './pages/landing/leagueospolicies/TermsConditions';

import SportsDataAdmin from './pages/generaladmin/sportsdata/SportsDataAdmin';
import CustomerSupportAdmin from './pages/generaladmin/support/CustomerSupportAdmin';

import SearchPage from './pages/search/SearchPage';

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
        <Route path="/news/:storyId" element={<ArticleDetail />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/:clubSlug" element={<ClubProfile />} />
        <Route path="/clubs/:clubSlug/players/:playerId" element={<PlayerProfile />} />
         <Route path="/tickets" element={<Tickets />} />
         <Route path="/privacy-policy" element={<LegalPolicy />} />
         <Route path="/terms-and-conditions" element={<TermsConditions />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/tickets/:matchId/checkout" element={<TicketCheckoutPage />} />
        <Route path="/store" element={<Store />} />
        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/matches/:fixtureId" element={<MatchCentre />} />

          {/* Fan Section*/ }
         <Route path="/fan/onboarding" element={<FanOnboarding />}/>
        <Route path="/dashboard/fan" element={<FanDashboard />} />
        <Route path="/fandashboard" element={<Navigate to="/dashboard/fan" replace />} />
        <Route path="/profile" element={<FanProfile />} />
        <Route path="/settings" element={<FanSettings />} />
        <Route path="/wallet" element={<FanWallet />} />
        <Route path="/positions" element={<MyPositions />} />

        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:marketId" element={<MarketDetailPage />} />
        <Route path="/fantasy" element={<Fantasy />} />
        <Route path="/search" element={<SearchPage />} />

        {/* authentication routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Shared admin shell — Super Admin + every specialist role */}
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/admin/markets" element={<MarketsListPage />} />
        <Route path="/dashboard/admin/markets/create" element={<CreateMarketWizard />} />
        <Route path="/dashboard/admin/markets/:marketId" element={<AdminMarketDetailPage />} />
        <Route path="/dashboard/admin/verification" element={<ResultVerificationPage />} />
        <Route path="/dashboard/admin/disputes" element={<DisputesPage />} />
        <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
        <Route path="/dashboard/admin/roles-permissions" element={<RolesPermissionsPage />} />
        <Route path="/dashboard/admin/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard/admin/reports" element={<ReportsPage />} />
        <Route path="/dashboard/admin/settings" element={<SystemSettingsPage />} />
        <Route path="/dashboard/admin/sports-data" element={<SportsDataAdmin />} />
        <Route path="/dashboard/admin/compliance" element={<ComplianceAdmin />} />
        <Route path="/dashboard/admin/payments" element={<FinanceAdmin />} />
        <Route path="/dashboard/admin/payouts" element={<FinanceAdmin />} />
        <Route path="/dashboard/admin/support" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/admin/support/case-queues" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/admin/support/my-cases" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/admin/support/escalations" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/admin/support/sla" element={<CustomerSupportAdmin />} />
        <Route path="/dashboard/admin/support/resolved" element={<CustomerSupportAdmin />} />

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
