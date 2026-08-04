import { FiAlertTriangle, FiSliders, FiLock, FiShield, FiPhone, FiMail } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './SupportPages.css';
import './Safety.css';

const TOOLS = [
  { icon: <FiSliders />, title: 'Deposit Limits', desc: 'Set daily, weekly, or monthly caps on how much you can deposit. Limits take effect immediately and can only be lowered, not raised, for 48 hours.' },
  { icon: <FiAlertTriangle />, title: 'Cool-Off Period', desc: 'Take a break for 24 hours, 7 days, or up to 6 weeks. During a cool-off your account is restricted to viewing only — no deposits or predictions.' },
  { icon: <FiLock />, title: 'Self-Exclusion', desc: 'Permanently close your account. This cannot be reversed. If you are struggling with gambling, please use this option or contact the helpline below.' },
];

const SECURITY = [
  { icon: <FiShield />, title: 'Encrypted Wallets', desc: 'All wallet balances and transaction data are encrypted at rest and in transit using AES-256 and TLS 1.3.' },
  { icon: <FiLock />, title: 'Two-Factor Authentication', desc: 'Enable 2FA via SMS OTP or an authenticator app. We strongly recommend 2FA for all accounts with a wallet balance.' },
  { icon: <FiAlertTriangle />, title: 'Fraud Monitoring', desc: 'Our system monitors accounts 24/7 for unusual activity. Suspicious transactions are flagged and may be frozen pending verification.' },
  { icon: <FiShield />, title: 'KYC Verification', desc: 'Identity verification prevents fraudulent accounts and protects the integrity of markets. Verified users also benefit from faster withdrawal processing.' },
];

function Safety() {
  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-hero">
        <span className="sp-hero__badge">Safety</span>
        <h1 className="sp-hero__title">Play safe.<br /><span>Stay in control.</span></h1>
        <p className="sp-hero__sub">League OS is committed to responsible gaming, account security, and protecting your personal data.</p>
      </div>

      {/* 18+ Banner */}
      <div className="safety-18-banner">
        <FiAlertTriangle className="safety-18-icon" />
        <div>
          <strong>18+ Only.</strong> Prediction markets and wagering features on League OS are strictly for adults aged 18 and above. Age verification is required during registration. If you are under 18, please do not use these features.
        </div>
      </div>

      {/* Responsible Gaming */}
      <section className="sp-section">
        <h2 className="sp-section__title">Responsible Gaming</h2>
        <p className="sp-section__sub">
          Sports predictions should be fun. If it stops feeling fun, we have tools to help you stay in control.
        </p>
        <div className="sp-grid sp-grid--3">
          {TOOLS.map((t, i) => (
            <div key={i} className="sp-card">
              <div className="sp-card__icon">{t.icon}</div>
              <h3 className="sp-card__title">{t.title}</h3>
              <p className="sp-card__text">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="safety-signs">
          <h3 className="safety-signs__title">Signs you may need to take a break</h3>
          <ul className="safety-signs__list">
            <li>You are spending more than you can afford to lose.</li>
            <li>You are chasing losses by placing bigger stakes.</li>
            <li>Predictions are affecting your relationships or work.</li>
            <li>You feel anxious or irritable when not predicting.</li>
            <li>You are borrowing money to deposit on the platform.</li>
          </ul>
          <p className="safety-signs__note">If any of these apply to you, please use our cool-off or self-exclusion tools, or call the helpline: <strong>0800 210 xxx</strong> (free, confidential).</p>
        </div>
      </section>

      <hr className="sp-divider" />

      {/* Account Security */}
      <section className="sp-section">
        <h2 className="sp-section__title">Account Security</h2>
        <p className="sp-section__sub">Your funds and personal data are protected by multiple layers of security.</p>
        <div className="sp-grid sp-grid--2">
          {SECURITY.map((s, i) => (
            <div key={i} className="sp-card">
              <div className="sp-card__icon">{s.icon}</div>
              <h3 className="sp-card__title">{s.title}</h3>
              <p className="sp-card__text">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="safety-tips">
          <h3>Keep your account safe</h3>
          <ul>
            <li>Never share your PIN, password, or OTP with anyone — including League OS staff.</li>
            <li>Log out of shared or public devices after each session.</li>
            <li>Use a unique password not shared with any other service.</li>
            <li>Enable 2FA in Profile → Settings → Security.</li>
            <li>Report any suspicious messages claiming to be from League OS.</li>
          </ul>
        </div>
      </section>

      <hr className="sp-divider" />

      {/* Privacy */}
      <section className="sp-section">
        <h2 className="sp-section__title">Your Data & Privacy</h2>
        <p className="sp-section__sub">We collect only what we need and never sell your personal data to third parties.</p>
        <div className="safety-privacy-grid">
          <div className="safety-privacy-item">
            <h4>What we collect</h4>
            <p>Name, email, phone number, national ID (KYC only), transaction history, and device information for fraud prevention.</p>
          </div>
          <div className="safety-privacy-item">
            <h4>What we never do</h4>
            <p>We do not sell your data to advertisers. We do not share your personal details with third parties without your consent, except as required by law.</p>
          </div>
          <div className="safety-privacy-item">
            <h4>Your rights</h4>
            <p>You can request a full export of your personal data or request deletion of your account and data by emailing privacy@leagueos.ug.</p>
          </div>
        </div>
      </section>

      {/* Get Help */}
      <div className="safety-help-banner">
        <h2>Need help right now?</h2>
        <p>Our team is available daily from 8 AM to 10 PM (EAT). For urgent safety concerns, contact us immediately.</p>
        <div className="safety-help-contacts">
          <a href="tel:+256800210000" className="safety-contact-card">
            <FiPhone />
            <span>Call: 0800 210 000</span>
            <small>Free from all networks</small>
          </a>
          <a href="mailto:safety@leagueos.ug" className="safety-contact-card">
            <FiMail />
            <span>safety@leagueos.ug</span>
            <small>Response within 2 hours</small>
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Safety;
