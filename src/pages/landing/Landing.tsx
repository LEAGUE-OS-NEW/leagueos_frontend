import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import Hero from './sections/Hero';
import FeaturedMarkets from './sections/FeaturedMarkets';
import LiveScores from './sections/LiveScores';
import FantasyLeagues from './sections/FantasyLeagues';
import FeaturedClubs from './sections/FeaturedClubs';
import HowItWorks from './sections/HowItWorks';
import './Landing.css';

function Landing() {
  return (
    <div className="landing-shell">
      <Navbar />
      <main className="landing">
        <Hero />
        <div className="stadium-backdrop">
          <FeaturedMarkets />
          <LiveScores />
          <FantasyLeagues />
          <FeaturedClubs />
          <HowItWorks />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
