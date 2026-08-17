import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
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
import FanMembershipsPage from './pages/fan/memberships/FanMembershipsPage';
import FanClubsPage from './pages/fan/clubs/FanClubsPage';
import FanClubProfile from './pages/fan/clubs/FanClubProfile';
import FanPlayerProfile from './pages/fan/clubs/FanPlayerProfile';
import FanStorePage from './pages/fan/store/FanStorePage';
import FanStoreCategoryPage from './pages/fan/store/FanStoreCategoryPage';
import FanTicketsPage from './pages/fan/tickets/FanTicketsPage';
import Markets from './pages/markets/Markets';
import PublicMarketDetailPage from './pages/markets/MarketDetailPage';
import FanVerification from './pages/fan/markets/FanVerification';

import FanMarkets from './pages/fan/markets/FanMarkets';
import MarketDetailOverview from './pages/fan/markets/MarketDetailOverview';
import MarketDetailChart from './pages/fan/markets/MarketDetailChart';
import PlaceOrder from './pages/fan/markets/PlaceOrder';
import ReviewOrder from './pages/fan/markets/ReviewOrder';
import OrderPlaced from './pages/fan/markets/OrderPlaced';


import PositionDetail from './pages/fan/markets/PositionDetail';
import SellPosition from './pages/fan/markets/SellPosition';
import SellConfirmation from './pages/fan/markets/SellConfirmation';

import FanTradeHub from './pages/fan/markets/FanTradeHub';

import Register from "./pages/auth/registration/Register";
import Login from "./pages/auth/login/Login";
import ForgotPassword from "./pages/auth/forgotpassword/ForgotPassword";
import VerifyEmail from "./pages/auth/emailVerification/VerifyEmail";
import AcceptInvite from "./pages/auth/acceptinvite/AcceptInvite";
import AcceptAdminInvite from "./pages/auth/acceptadmininvite/AcceptAdminInvite";
import Tickets from "./pages/landing/tickets/TicketsLandingPage";
import TicketCheckoutPage from "./pages/landing/tickets/TicketCheckoutPage";
import Store from "./pages/landing/store/Store";
import Fantasy from "./pages/landing/fantasy/Fantasy";
import FixturesPage from './pages/fixtures/FixturesPage';
import MatchCentre from './pages/matchcentre/MatchCentre';
import AdminRoute from './components/admin/AdminRoute';
import AuthSessionBootstrap from './components/auth/AuthSessionBootstrap';
import AuthenticatedRoute from './components/auth/AuthenticatedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import MarketsListPage from './pages/admin/markets/MarketsListPage';
import CreateMarketWizard from './pages/admin/markets/CreateMarketWizard';
import AdminMarketDetailPage from './pages/admin/markets/MarketDetailPage';
import ResultVerificationPage from './pages/admin/verification/ResultVerificationPage';
import DisputesPage from './pages/admin/disputes/DisputesPage';
import AdminUsersPage from './pages/admin/users/AdminUsersPage';
import FansPage from './pages/admin/fans/FansPage';
import PlatformMembershipPage from './pages/admin/membership/PlatformMembershipPage';
import RolesPermissionsPage from './pages/admin/roles/RolesPermissionsPage';
import AuditLogPage from './pages/admin/audit/AuditLogPage';
import NotificationsPage from './pages/admin/notifications/NotificationsPage';
import ReportsPage from './pages/admin/reports/ReportsPage';
import SystemSettingsPage from './pages/admin/settings/SystemSettingsPage';
import ComplianceAdmin from './pages/admin/compliance/ComplianceAdmin';
import FinanceAdmin from "./pages/admin/finance/FinanceAdmin";
import LegalPolicy from './pages/landing/leagueospolicies/LegalPolicy';
import TermsConditions from './pages/landing/leagueospolicies/TermsConditions';
import SportsDataAdmin from './pages/admin/sportsdata/SportsDataAdmin';
import FixturesAdmin from './pages/admin/sportsdata/FixturesAdmin';
import FantasyAdminPage from './pages/admin/fantasy/FantasyAdminPage';
import NewsAdmin from './pages/admin/news/NewsAdmin';
import CustomerSupportAdmin from './pages/admin/support/CustomerSupportAdmin';
import SearchPage from './pages/search/SearchPage';
import HelpCenter from './pages/support/HelpCenter';
import HowItWorks from './pages/support/HowItWorks';
import Safety from './pages/support/Safety';
import ContactUs from './pages/support/ContactUs';
import Community from './pages/support/Community';


import FantasyCompetitions from "./pages/fan/fantasy/FantasyCompetitions";
import FanNewsPage from './pages/fan/news/FanNewsPage';
import FanArticleDetailPage from './pages/fan/news/FanArticleDetailPage';
import ClubAdminDashboard from './pages/clubadmin/ClubAdminDashboard';
import ClubProfilePage from './pages/clubadmin/profile/ClubProfilePage';
import ClubFixturesPage from './pages/clubadmin/fixtures/ClubFixturesPage';
import ClubSquadPage from './pages/clubadmin/squad/ClubSquadPage';
import ClubNewsPage from './pages/clubadmin/news/ClubNewsPage';
import ClubTicketsAdminPage from './pages/clubadmin/tickets/ClubTicketsAdminPage';
import ClubStorePage from './pages/clubadmin/store/ClubStorePage';
import ClubAnalyticsPage from './pages/clubadmin/analytics/ClubAnalyticsPage';
import ClubStaffPage from './pages/clubadmin/staff/ClubStaffPage';
import ClubOrdersPage from './pages/clubadmin/ClubOrdersPage';
import ClubCompliancePage from './pages/clubadmin/compliance/ClubCompliancePage';
import ClubAdminRoute from './components/clubadmin/ClubAdminRoute';
import FanRoute from './components/fan/FanRoute';
import Unauthorized from './pages/auth/unauthorized/Unauthorized';

// import Personalize from "./pages/personalize/Personalize";

function App() {
  const admin = (page: ReactNode) => <AdminRoute>{page}</AdminRoute>;
  const authenticated = (page: ReactNode) => <AuthenticatedRoute>{page}</AuthenticatedRoute>;
  return (
    <Router>
      <AuthSessionBootstrap>
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
        <Route path="/tickets/:matchId/checkout" element={<TicketCheckoutPage />} />
        <Route path="/store" element={<Store />} />
        <Route path="/fantasy" element={<Fantasy />} />
        <Route path="/fantasy/:competitionId" element={<Fantasy />} />
        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/matches/:fixtureId" element={<MatchCentre />} />

        {/* Public marketing markets pages — logged-out browse, no trading */}
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:marketId" element={<PublicMarketDetailPage />} />

          {/* Fan Section*/ }
        <Route path="/fan/onboarding" element={<FanRoute><FanOnboarding /></FanRoute>} />
        <Route path="/dashboard/fan" element={authenticated(<FanDashboard />)} />
        <Route path="/fan" element={<Navigate to="/dashboard/fan" replace />} />
        <Route path="/fandashboard" element={<Navigate to="/dashboard/fan" replace />} />
        <Route path="/profile" element={authenticated(<FanProfile />)} />
        <Route path="/settings" element={authenticated(<FanSettings />)} />
        <Route path="/wallet" element={authenticated(<FanWallet />)} />
        <Route path="/positions" element={authenticated(<MyPositions />)} />
        <Route path="/memberships" element={<FanMembershipsPage />} />
        <Route path="/fan/clubs" element={<FanClubsPage />} />
        <Route path="/fan/clubs/:clubSlug" element={<FanClubProfile />} />
        <Route path="/fan/clubs/:clubSlug/players/:playerId" element={<FanPlayerProfile />} />
        <Route path="/fan/store" element={<FanStorePage />} />
        <Route path="/fan/store/category/:categorySlug" element={<FanStoreCategoryPage />} />
        <Route path="/fan/tickets" element={authenticated(<FanTicketsPage />)} />

        {/* Authenticated fan markets/trading flow */}

        <Route path="/fan/markets" element={<FanMarkets />} />
        <Route path="/fan/markets/:marketId" element={authenticated(<MarketDetailOverview />)} />
        <Route path="/fan/markets/:marketId/chart" element={authenticated(<MarketDetailChart />)} />
        <Route path="/fan/markets/:marketId/trade" element={authenticated(<PlaceOrder />)} />
        <Route path="/fan/markets/:marketId/review" element={authenticated(<ReviewOrder />)} />
        <Route path="/fan/markets/:marketId/placed" element={authenticated(<OrderPlaced />)} />
        <Route path="/fan/verify" element={authenticated(<FanVerification />)} />
        <Route path="/fan/trade" element={authenticated(<FanTradeHub />)} />
        <Route path="/notifications" element={<Navigate to="/settings?tab=notifications" replace />} />

        {/* Positions / sell flow */}
        <Route path="/fan/positions/:positionId" element={authenticated(<PositionDetail />)} />
        <Route path="/fan/positions/:positionId/sell" element={authenticated(<SellPosition />)} />
        <Route path="/fan/positions/:positionId/sell/confirm" element={authenticated(<SellConfirmation />)} />

        {/* Fantasy section */ }
        <Route path="/search" element={<SearchPage />} />
        {/* Fantasy Home — Step 2 entry point into the Fantasy flow */}
        <Route path="/fan/fantasy" element={<FantasyCompetitions />} />
        
        <Route path="/fan/news" element={<FanNewsPage />} />
        <Route path="/fan/news/:storyId" element={<FanArticleDetailPage />} />

        {/* Club Admin — requires CLUB_ADMIN entitlement */}
        <Route path="/dashboard/club-admin" element={<Navigate to="/club-admin" replace />} />
        <Route path="/club-admin" element={<ClubAdminRoute><ClubAdminDashboard /></ClubAdminRoute>} />
        <Route path="/club-admin/profile" element={<ClubAdminRoute><ClubProfilePage /></ClubAdminRoute>} />
        <Route path="/club-admin/fixtures" element={<ClubAdminRoute><ClubFixturesPage /></ClubAdminRoute>} />
        <Route path="/club-admin/squad" element={<ClubAdminRoute><ClubSquadPage /></ClubAdminRoute>} />
        <Route path="/club-admin/news" element={<ClubAdminRoute><ClubNewsPage /></ClubAdminRoute>} />
        <Route path="/club-admin/tickets" element={<ClubAdminRoute><ClubTicketsAdminPage /></ClubAdminRoute>} />
        <Route path="/club-admin/store" element={<ClubAdminRoute><ClubStorePage /></ClubAdminRoute>} />
        <Route path="/club-admin/orders" element={<ClubAdminRoute><ClubOrdersPage /></ClubAdminRoute>} />
        <Route path="/club-admin/analytics" element={<ClubAdminRoute><ClubAnalyticsPage /></ClubAdminRoute>} />
        <Route path="/club-admin/staff" element={<ClubAdminRoute><ClubStaffPage /></ClubAdminRoute>} />
        <Route path="/club-admin/compliance" element={<ClubAdminRoute><ClubCompliancePage /></ClubAdminRoute>} />

        {/* Access denied */}
        <Route path="/unauthorized" element={<Unauthorized />} />

       

        {/* authentication routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/accept-admin-invite" element={<AcceptAdminInvite />} />

        {/* Shared admin shell — Super Admin + every specialist role */}
        <Route path="/dashboard/admin" element={admin(<AdminDashboard />)} />
        <Route path="/dashboard/admin/markets" element={admin(<MarketsListPage />)} />
        <Route path="/dashboard/admin/markets/create" element={admin(<CreateMarketWizard />)} />
        <Route path="/dashboard/admin/markets/:marketId" element={admin(<AdminMarketDetailPage />)} />
        <Route path="/dashboard/admin/verification" element={admin(<ResultVerificationPage />)} />
        <Route path="/dashboard/admin/disputes" element={admin(<DisputesPage />)} />
        <Route path="/dashboard/admin/users" element={admin(<AdminUsersPage />)} />
        <Route path="/dashboard/admin/fans" element={admin(<FansPage />)} />
        <Route path="/dashboard/admin/membership" element={admin(<PlatformMembershipPage />)} />
        <Route path="/dashboard/admin/roles-permissions" element={admin(<RolesPermissionsPage />)} />
        <Route path="/dashboard/admin/audit" element={admin(<AuditLogPage />)} />
        <Route path="/dashboard/admin/notifications" element={admin(<NotificationsPage />)} />
        <Route path="/dashboard/admin/reports" element={admin(<ReportsPage />)} />
        <Route path="/dashboard/admin/settings" element={admin(<SystemSettingsPage />)} />
        <Route path="/dashboard/admin/sports-data" element={admin(<SportsDataAdmin />)} />
        <Route path="/dashboard/admin/fixtures" element={admin(<FixturesAdmin />)} />
        <Route path="/dashboard/admin/fantasy" element={admin(<FantasyAdminPage />)} />
        <Route path="/dashboard/admin/news" element={admin(<NewsAdmin />)} />
        <Route path="/dashboard/admin/compliance" element={admin(<ComplianceAdmin />)} />
        <Route path="/dashboard/admin/payments" element={admin(<FinanceAdmin />)} />
        <Route path="/dashboard/admin/payouts" element={admin(<FinanceAdmin initialQueue="withdrawals" />)} />
        <Route path="/dashboard/admin/support" element={admin(<CustomerSupportAdmin />)} />
        <Route path="/dashboard/admin/support/case-queues" element={admin(<CustomerSupportAdmin />)} />
        <Route path="/dashboard/admin/support/my-cases" element={admin(<CustomerSupportAdmin />)} />
        <Route path="/dashboard/admin/support/escalations" element={admin(<CustomerSupportAdmin />)} />
        <Route path="/dashboard/admin/support/sla" element={admin(<CustomerSupportAdmin />)} />
        <Route path="/dashboard/admin/support/resolved" element={admin(<CustomerSupportAdmin />)} />

        {/* Support pages */}
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/community" element={<Community />} />

        <Route path="*" element={<Navigate to="/" replace />} />

        
      </Routes>
      </AuthSessionBootstrap>

      
    </Router>
  );
}

export default App;
