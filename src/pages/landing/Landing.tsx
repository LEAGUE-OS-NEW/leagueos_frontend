import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import Hero from './sections/Hero';
import FeaturedMarkets from './sections/FeaturedMarkets';
import LiveScores from './sections/LiveScores';
import FantasyLeagues from './sections/FantasyLeagues';
import FeaturedClubs from './sections/FeaturedClubs';
import HowItWorks from './sections/HowItWorks';
import BuiltInUganda from './sections/BuiltInUganda';
import './Landing.css';

function Landing() {
  return (
    <>
      <Navbar />
      <main className="landing">
        <Hero />
        <FeaturedMarkets />
        <LiveScores />
        <FantasyLeagues />
        <FeaturedClubs />
        <HowItWorks />
        <BuiltInUganda />
      </main>
      <Footer />
    </>
  );
}

export default Landing;
