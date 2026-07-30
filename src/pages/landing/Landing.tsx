import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Hero from './sections/Hero';
import './Landing.css';

function Landing() {
  return (
    <>
      <Navbar />
      <main className="landing">
        <Hero />
      </main>
      <Footer />
    </>
  );
}

export default Landing;
