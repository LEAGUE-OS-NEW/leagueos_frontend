import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/landing/Landing';
import NewsPage from "./pages/landing/news-page/NewsPage";
import AboutUs from "./pages/landing/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";
import FanDashboard from './pages/fan/FanDashboard';
import FanOnboarding from "./pages/fan/onboarding/FanOnboarding";

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
        
      </Routes>
    </Router>
  );
}

export default App;
