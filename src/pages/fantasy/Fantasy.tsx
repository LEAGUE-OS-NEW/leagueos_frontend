import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import FantasyHero from './sections/FantasyHero';
import FeaturedLeagues from './sections/FeaturedLeagues';
import HowFantasyWorks from './sections/HowFantasyWorks';
import UpcomingGameweeks from './sections/UpcomingGameweeks';
import FeaturedLeaderboard from './sections/FeaturedLeaderboard';
import PrizesBanner from './sections/PrizesBanner';
import TipsStats from './sections/TipsStats';
import InviteFriendsBanner from './sections/InviteFriendsBanner';
import './Fantasy.css';

function Fantasy() {
  return (
    <div className="fantasy-page">
      <Navbar />

      <main className="fantasy-main">
        <div className="fantasy-main-inner">
          <FantasyHero />
          <FeaturedLeagues />

          <div className="fantasy-two-col">
            <HowFantasyWorks />
            <UpcomingGameweeks />
          </div>

          <div className="fantasy-two-col">
            <FeaturedLeaderboard />
            <PrizesBanner />
          </div>

          <TipsStats />
          <InviteFriendsBanner />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Fantasy;
