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
// NOTE: these four already exist in src/pages/fan/markets/ (see the report
// on that folder) but were never imported/routed. Adjust the path below if
// they actually live somewhere else in the tree.
import FanMarkets from './pages/fan/markets/FanMarkets';
import MarketDetailOverview from './pages/fan/markets/MarketDetailOverview';
import MarketDetailChart from './pages/fan/markets/MarketDetailChart';
import PlaceOrder from './pages/fan/markets/PlaceOrder';
import ReviewOrder from './pages/fan/markets/ReviewOrder';
import OrderPlaced from './pages/fan/markets/OrderPlaced';
// NOTE: same story for these three — PositionDetail/SellPosition/
// SellConfirmation reference '../markets/Markets.css' via relative import,
// which implies they sit in src/pages/fan/positions/ alongside MyPositions.
import PositionDetail from './pages/fan/markets/PositionDetail';
import SellPosition from './pages/fan/markets/SellPosition';
import SellConfirmation from './pages/fan/markets/SellConfirmation';
// Rich landing page verified fans are redirected to after completing
// identity verification — wallet snapshot, live markets, categories, and
// an open-positions summary in one place.
import FanTradeHub from './pages/fan/markets/FanTradeHub';
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
import FantasyAdminPage from './pages/admin/fantasy/FantasyAdminPage';
import CustomerSupportAdmin from './pages/generaladmin/support/CustomerSupportAdmin';
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
import ClubMembershipsPage from './pages/clubadmin/memberships/ClubMembershipsPage';
import ClubTicketsAdminPage from './pages/clubadmin/tickets/ClubTicketsAdminPage';
import ClubStorePage from './pages/clubadmin/store/ClubStorePage';
import ClubAnalyticsPage from './pages/clubadmin/analytics/ClubAnalyticsPage';
import ClubStaffPage from './pages/clubadmin/staff/ClubStaffPage';
import ClubSponsorsPage from './pages/clubadmin/sponsors/ClubSponsorsPage';
import ClubOrdersPage from './pages/clubadmin/ClubOrdersPage';

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

        {/* Public marketing markets pages — logged-out browse, no trading */}
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:marketId" element={<PublicMarketDetailPage />} />

          {/* Fan Section*/ }
        <Route path="/fan/onboarding" element={<FanOnboarding />}/>
        <Route path="/dashboard/fan" element={<FanDashboard />} />
        <Route path="/fan" element={<Navigate to="/dashboard/fan" replace />} />
        <Route path="/fandashboard" element={<Navigate to="/dashboard/fan" replace />} />
        <Route path="/profile" element={<FanProfile />} />
        <Route path="/settings" element={<FanSettings />} />
        <Route path="/wallet" element={<FanWallet />} />
        <Route path="/positions" element={<MyPositions />} />
        <Route path="/memberships" element={<FanMembershipsPage />} />
        <Route path="/fan/clubs" element={<FanClubsPage />} />
        <Route path="/fan/clubs/:clubSlug" element={<FanClubProfile />} />
        <Route path="/fan/clubs/:clubSlug/players/:playerId" element={<FanPlayerProfile />} />
        <Route path="/fan/store" element={<FanStorePage />} />
        <Route path="/fan/store/category/:categorySlug" element={<FanStoreCategoryPage />} />
        <Route path="/fan/tickets" element={<FanTicketsPage />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:marketId" element={<PublicMarketDetailPage />} />

        {/* Authenticated fan markets/trading flow */}

        <Route path="/fan/markets" element={<FanMarkets />} />
        <Route path="/fan/markets/:marketId" element={<MarketDetailOverview />} />
        <Route path="/fan/markets/:marketId/chart" element={<MarketDetailChart />} />
        <Route path="/fan/markets/:marketId/trade" element={<PlaceOrder />} />
        <Route path="/fan/markets/:marketId/review" element={<ReviewOrder />} />
        <Route path="/fan/markets/:marketId/placed" element={<OrderPlaced />} />
        <Route path="/fan/verify" element={<FanVerification />} />
        {/* Rich full-access trading hub — where newly verified fans land */}
        <Route path="/fan/trade" element={<FanTradeHub />} />

        {/* Positions / sell flow */}
        <Route path="/fan/positions/:positionId" element={<PositionDetail />} />
        <Route path="/fan/positions/:positionId/sell" element={<SellPosition />} />
        <Route path="/fan/positions/:positionId/sell/confirm" element={<SellConfirmation />} />

        <Route path="/fantasy" element={<Fantasy />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/fan/fantasy" element={<FantasyCompetitions />} />
        <Route path="/fan/news" element={<FanNewsPage />} />
        <Route path="/fan/news/:storyId" element={<FanArticleDetailPage />} />

        {/* Club Admin */}
        <Route path="/club-admin" element={<ClubAdminDashboard />} />
        <Route path="/club-admin/profile" element={<ClubProfilePage />} />
        <Route path="/club-admin/fixtures" element={<ClubFixturesPage />} />
        <Route path="/club-admin/squad" element={<ClubSquadPage />} />
        <Route path="/club-admin/news" element={<ClubNewsPage />} />
        <Route path="/club-admin/memberships" element={<ClubMembershipsPage />} />
        <Route path="/club-admin/tickets" element={<ClubTicketsAdminPage />} />
        <Route path="/club-admin/store" element={<ClubStorePage />} />
        <Route path="/club-admin/orders" element={<ClubOrdersPage />} />
        <Route path="/club-admin/analytics" element={<ClubAnalyticsPage />} />
        <Route path="/club-admin/staff" element={<ClubStaffPage />} />
        <Route path="/club-admin/sponsors" element={<ClubSponsorsPage />} />

       


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
        <Route path="/dashboard/admin/fantasy" element={<FantasyAdminPage />} />
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

        
      </Routes>

      
    </Router>
  );
}

export default App;