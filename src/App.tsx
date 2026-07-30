import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<div>Landing Page Coming Soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;
