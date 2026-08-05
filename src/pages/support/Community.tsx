import { FiMessageCircle, FiUsers, FiAward, FiCalendar, FiStar, FiTrendingUp } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './SupportPages.css';
import './Community.css';

const CHANNELS = [
  { icon: <FiMessageCircle />, name: 'WhatsApp Groups', desc: 'Join club-specific WhatsApp groups for live match reactions, fixture alerts, and fan banter. Groups for Vipers, KCCA, SC Villa, Express, and more.', cta: 'Join WhatsApp', color: '#25D366' },
  { icon: <FiUsers />, name: 'Discord Server', desc: 'Our main hub. Channels for every league, sport, fantasy tips, and predictions. 24/7 active community with weekly voice events and watch parties.', cta: 'Join Discord', color: '#5865F2' },
  { icon: <FiMessageCircle />, name: 'Telegram Channel', desc: 'Get real-time score alerts, market movements, injury updates, and exclusive community announcements straight to your Telegram.', cta: 'Join Telegram', color: '#229ED9' },
  { icon: <FiUsers />, name: 'Facebook Group', desc: 'The League OS Uganda Facebook community — share match highlights, debate results, and connect with fans across the country.', cta: 'Join Group', color: '#1877F2' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Kizza Patrick', club: 'Vipers SC', pts: 12840, badge: '🏆' },
  { rank: 2, name: 'Nabukenya Aisha', club: 'KCCA FC', pts: 11590, badge: '🥈' },
  { rank: 3, name: 'Mugisha Ronald', club: 'SC Villa', pts: 10320, badge: '🥉' },
  { rank: 4, name: 'Atim Grace', club: 'Express FC', pts: 9870, badge: '' },
  { rank: 5, name: 'Ssebulime Brian', club: 'Vipers SC', pts: 9210, badge: '' },
];

const EVENTS = [
  { icon: <FiCalendar />, title: 'Weekly Prediction Challenge', desc: 'Every Monday at 12 PM, a new community prediction challenge drops. Top 3 winners share a UGX 200,000 prize pool.' },
  { icon: <FiStar />, title: 'Fan of the Month', desc: 'The most active, insightful, and supportive community member is recognised each month with a League OS badge, store voucher, and match tickets.' },
  { icon: <FiTrendingUp />, title: 'Fantasy Premier League Africa', desc: 'Join our sister community league tracking African fans in the English Premier League FPL. Mini-leagues with monthly prizes.' },
  { icon: <FiAward />, title: 'Club Fan Awards', desc: 'At the end of every UPL season we host the League OS Fan Awards — voted entirely by the community. Celebrates the best moments, players, and fans of the year.' },
];

function Community() {
  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-hero">
        <span className="sp-hero__badge">Community</span>
        <h1 className="sp-hero__title">Your tribe.<br /><span>Your stadium.</span></h1>
        <p className="sp-hero__sub">Connect with thousands of Ugandan sports fans. Share predictions, celebrate wins, and follow every kick of the ball — together.</p>
        <div className="comm-hero-stats">
          <div className="comm-hero-stat"><strong>12,000+</strong><span>Active fans</span></div>
          <div className="comm-hero-stat"><strong>48</strong><span>Active clubs followed</span></div>
          <div className="comm-hero-stat"><strong>4</strong><span>Community channels</span></div>
        </div>
      </div>

      {/* Join channels */}
      <section className="sp-section">
        <h2 className="sp-section__title">Join the conversation</h2>
        <p className="sp-section__sub">Pick your platform and connect with the League OS community today.</p>
        <div className="sp-grid sp-grid--2">
          {CHANNELS.map((ch, i) => (
            <div key={i} className="comm-channel-card">
              <div className="comm-channel-icon" style={{ color: ch.color, background: `${ch.color}18` }}>{ch.icon}</div>
              <div className="comm-channel-body">
                <h3 className="comm-channel-name">{ch.name}</h3>
                <p className="comm-channel-desc">{ch.desc}</p>
                <button className="sp-btn sp-btn--ghost comm-channel-btn" style={{ borderColor: `${ch.color}44`, color: ch.color }}>
                  {ch.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="sp-divider" />

      {/* Fan leaderboard */}
      <section className="sp-section">
        <h2 className="sp-section__title">Fan Leaderboard</h2>
        <p className="sp-section__sub">Top community members ranked by engagement, predictions, and contributions this season.</p>
        <div className="comm-leaderboard">
          <div className="comm-lb-header">
            <span>#</span>
            <span>Fan</span>
            <span>Club</span>
            <span>Points</span>
          </div>
          {LEADERBOARD.map(row => (
            <div key={row.rank} className={`comm-lb-row${row.rank <= 3 ? ' top' : ''}`}>
              <span className="comm-lb-rank">{row.badge || row.rank}</span>
              <span className="comm-lb-name">{row.name}</span>
              <span className="comm-lb-club">{row.club}</span>
              <span className="comm-lb-pts">{row.pts.toLocaleString()} pts</span>
            </div>
          ))}
          <p className="comm-lb-note">Leaderboard resets at the start of each UPL season. Points are earned through predictions, fantasy performance, and community activity.</p>
        </div>
      </section>

      <hr className="sp-divider" />

      {/* Community events */}
      <section className="sp-section">
        <h2 className="sp-section__title">Community Events</h2>
        <p className="sp-section__sub">Competitions, recognition, and celebrations — all driven by fans, for fans.</p>
        <div className="sp-grid sp-grid--2">
          {EVENTS.map((ev, i) => (
            <div key={i} className="sp-card">
              <div className="sp-card__icon">{ev.icon}</div>
              <h3 className="sp-card__title">{ev.title}</h3>
              <p className="sp-card__text">{ev.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Join CTA */}
      <div className="comm-cta">
        <h2>Ready to join the League OS community?</h2>
        <p>Create your free account and connect with Ugandan sports fans across every platform.</p>
        <div className="comm-cta-actions">
          <a href="/register" className="sp-btn sp-btn--primary">Sign Up Free</a>
          <a href="/help" className="sp-btn sp-btn--ghost">Visit Help Center</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Community;
