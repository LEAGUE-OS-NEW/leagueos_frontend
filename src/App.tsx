import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<div>Landing Page Coming Soon</div>} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
