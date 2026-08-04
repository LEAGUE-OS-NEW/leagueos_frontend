import { FiUserPlus, FiTrendingUp, FiStar, FiSmartphone, FiCheckCircle } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './SupportPages.css';
import './HowItWorks.css';

const STEPS = [
  {
    num: '01',
    icon: <FiUserPlus />,
    title: 'Create your free account',
    desc: 'Sign up with your name, phone number, and email. Verify via OTP and you are in — no credit card needed. Complete KYC to unlock full withdrawal limits.',
    detail: ['Free to register', 'Phone & email verification', 'KYC unlocks higher limits', '18+ only'],
  },
  {
    num: '02',
    icon: <FiTrendingUp />,
    title: 'Deposit via Mobile Money',
    desc: 'Top up your League OS wallet instantly using MTN Mobile Money or Airtel Money. Funds reflect within seconds — no waiting, no queues.',
    detail: ['MTN Mobile Money', 'Airtel Money', 'Instant deposits', 'Zero deposit fees'],
  },
  {
    num: '03',
    icon: <FiStar />,
    title: 'Predict, play & follow',
    desc: 'Place predictions on UPL, Cup, and international markets. Build your fantasy squad. Follow your clubs and never miss a match with live scores.',
    detail: ['Prediction markets', 'Fantasy sports', 'Live scores & stats', 'Club news & fixtures'],
  },
  {
    num: '04',
    icon: <FiSmartphone />,
    title: 'Withdraw your winnings',
    desc: 'Cash out back to Mobile Money at any time. Withdrawals are processed within 15 minutes during operating hours. Your money, your call.',
    detail: ['Instant withdrawal requests', 'MTN & Airtel supported', 'No withdrawal fees', 'Processed 8 AM – 8 PM daily'],
  },
];

const FEATURES = [
  { tag: 'Markets', title: 'Prediction Markets', desc: 'Buy YES or NO on outcomes like match winners, goal scorers, league champions, and more. Prices shift in real time based on the crowd.' },
  { tag: 'Fantasy', title: 'Fantasy Sports', desc: 'Pick a squad within a budget cap. Earn points from real player performances. Compete in public leagues or create private ones with friends.' },
  { tag: 'Clubs', title: 'Follow Your Club', desc: 'Get fixture alerts, live scores, squad news, and match highlights for Vipers, KCCA, SC Villa, Express, and every UPL club.' },
  { tag: 'Tickets', title: 'Match Tickets', desc: 'Book seats for UPL, Uganda Cup, and international matches. Pay via Mobile Money and get your QR ticket instantly on your phone.' },
  { tag: 'Store', title: 'Official Merch', desc: 'Shop official kits, scarves, and accessories from your favourite Ugandan clubs. Delivered to your door across Uganda.' },
  { tag: 'Community', title: 'Fan Community', desc: 'Join WhatsApp groups, Discord servers, and fan leagues. Climb the fan leaderboard and earn recognition as the top supporter.' },
];

function HowItWorks() {
  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-hero">
        <span className="sp-hero__badge">How It Works</span>
        <h1 className="sp-hero__title">Your game.<br /><span>Your platform.</span></h1>
        <p className="sp-hero__sub">League OS brings Ugandan sport to life. Here is everything you need to get started in four easy steps.</p>
      </div>

      {/* Steps */}
      <section className="sp-section hiw-steps-section">
        <div className="hiw-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="hiw-step">
              <div className="hiw-step__num">{step.num}</div>
              <div className="hiw-step__icon">{step.icon}</div>
              <div className="hiw-step__body">
                <h3 className="hiw-step__title">{step.title}</h3>
                <p className="hiw-step__desc">{step.desc}</p>
                <ul className="hiw-step__list">
                  {step.detail.map((d, j) => (
                    <li key={j}><FiCheckCircle className="hiw-check" />{d}</li>
                  ))}
                </ul>
              </div>
              {i < STEPS.length - 1 && <div className="hiw-step__connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <hr className="sp-divider" />

      {/* Features */}
      <section className="sp-section">
        <h2 className="sp-section__title">Everything on one platform</h2>
        <p className="sp-section__sub">Six powerful features, one account, zero hassle.</p>
        <div className="sp-grid sp-grid--3">
          {FEATURES.map((f, i) => (
            <div key={i} className="sp-card hiw-feature-card">
              <span className="hiw-feature-tag">{f.tag}</span>
              <h3 className="sp-card__title">{f.title}</h3>
              <p className="sp-card__text">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="hiw-cta">
        <h2>Ready to start?</h2>
        <p>Join thousands of Ugandan fans already on League OS.</p>
        <div className="hiw-cta-actions">
          <a href="/register" className="sp-btn sp-btn--primary">Create Free Account</a>
          <a href="/help" className="sp-btn sp-btn--ghost">Visit Help Center</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default HowItWorks;
