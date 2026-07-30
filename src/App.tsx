import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>Landing Page Coming Soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;