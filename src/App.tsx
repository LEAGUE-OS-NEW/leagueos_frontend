import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/landing/Landing';
import NewsPage from "./pages/news-page/NewsPage";
import AboutUs from "./pages/aboutus/Aboutus";
import ClubsPage from "./pages/clubs/ClubsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/clubs" element={<ClubsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
