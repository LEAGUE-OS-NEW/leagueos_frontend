import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/landing/Landing';
import NewsPage from "./pages/landing/news-page/NewsPage";
import AboutUs from "./pages/landing/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";
import FanDashboard from './pages/fan/sections/FanDashboard';
import Markets from './pages/markets/Markets';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/fandashboard" element={<FanDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
