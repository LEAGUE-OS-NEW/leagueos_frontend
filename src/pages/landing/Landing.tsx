import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import Hero from './sections/Hero';
import FeaturedMarkets from './sections/FeaturedMarkets';
import LiveScores from './sections/LiveScores';
import './Landing.css';

function Landing() {
  return (
    <>
      <Navbar />
      <main className="landing">
        <Hero />
        <FeaturedMarkets />
        <LiveScores />
      </main>
      <Footer />
    </>
  );
}

export default Landing;
