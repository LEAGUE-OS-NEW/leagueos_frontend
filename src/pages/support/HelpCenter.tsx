import { useState } from 'react';
import { FiSearch, FiChevronDown, FiUser, FiTrendingUp, FiStar, FiDollarSign, FiTag, FiShield } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './SupportPages.css';
import './HelpCenter.css';

type FAQ = { q: string; a: string };
type Category = { id: string; label: string; icon: React.ReactNode; faqs: FAQ[] };

const CATEGORIES: Category[] = [
  {
    id: 'account',
    label: 'Account & Profile',
    icon: <FiUser />,
    faqs: [
      { q: 'How do I create a League OS account?', a: 'Download the app or visit our website, tap "Sign Up", enter your name, email address, and phone number, then verify your account via the code sent to your phone. You must be 18 years or older to register.' },
      { q: 'I forgot my password. How do I reset it?', a: 'On the login screen tap "Forgot Password", enter your registered email or phone number, and we will send a reset link. Check your spam folder if you do not receive it within 2 minutes.' },
      { q: 'How do I complete KYC verification?', a: 'Go to Profile → Verify Identity. Upload a clear photo of your National ID, Passport, or Driving Permit, plus a selfie. Verification usually takes 24–48 hours. Verified accounts have higher withdrawal limits.' },
      { q: 'Can I change my phone number?', a: 'Yes. Go to Profile → Settings → Contact Info. You will need to verify both the old and new number via OTP codes for security.' },
    ],
  },
  {
    id: 'markets',
    label: 'Markets & Predictions',
    icon: <FiTrendingUp />,
    faqs: [
      { q: 'What are prediction markets?', a: 'Prediction markets let you buy YES or NO positions on the outcome of real sporting events — for example "Will Vipers SC win the UPL title?" Prices move based on crowd sentiment, and you profit when your prediction is correct.' },
      { q: 'How are market results decided?', a: 'Results are resolved by our Sports Data team using official league sources and independent data providers. All resolution decisions are logged and auditable. Disputed results can be escalated within 48 hours of settlement.' },
      { q: 'What is the minimum stake?', a: 'The minimum stake per market position is UGX 1,000. There is no fixed maximum, but large positions may require KYC verification.' },
      { q: 'Can I sell my position before the market closes?', a: 'Yes. You can exit your position at the current market price at any time while the market is open. Profit or loss is realised immediately on exit.' },
    ],
  },
  {
    id: 'fantasy',
    label: 'Fantasy Sports',
    icon: <FiStar />,
    faqs: [
      { q: 'How does Fantasy work on League OS?', a: 'Pick a squad of real players from upcoming fixtures within a budget cap. Players earn fantasy points based on their real-world performance (goals, assists, clean sheets, etc.). Compete in public or private leagues and climb the leaderboard.' },
      { q: 'When are fantasy points updated?', a: 'Points are updated live during matches and finalised within 2 hours of the final whistle once all official statistics have been confirmed.' },
      { q: 'Can I edit my team after the deadline?', a: 'No. Once the gameweek deadline passes you cannot change your squad. You can make transfers during the transfer window before the next gameweek deadline.' },
      { q: 'How do I create a private league?', a: 'Go to Fantasy → Leagues → Create League. Give your league a name, set a scoring format, and share the invite code with friends. Private leagues can hold up to 50 managers.' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Withdrawals',
    icon: <FiDollarSign />,
    faqs: [
      { q: 'What payment methods are supported?', a: 'We support MTN Mobile Money, Airtel Money, and bank transfers (Stanbic, DFCU, Equity). Card payments are coming soon. Deposits are instant for mobile money.' },
      { q: 'How long do withdrawals take?', a: 'MTN and Airtel Mobile Money withdrawals are processed within 15 minutes during business hours (8 AM – 8 PM). Bank transfers take 1–2 business days.' },
      { q: 'Is there a withdrawal fee?', a: 'League OS does not charge withdrawal fees. Standard mobile money operator charges may apply depending on your network provider.' },
      { q: 'My deposit is not reflecting. What do I do?', a: 'Wait up to 10 minutes for mobile money transactions to confirm. If funds are still missing, go to Help → My Transactions, copy the transaction ID, and contact support via live chat or email.' },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets & Store',
    icon: <FiTag />,
    faqs: [
      { q: 'How do I buy match tickets?', a: 'Go to Tickets, select your match and seat category, pay via mobile money, and your QR ticket is delivered instantly to your profile. Show it at the gate on your phone.' },
      { q: 'Can I get a refund on a ticket?', a: 'Refunds are available if a match is postponed or cancelled. For voluntary cancellations made 72+ hours before kick-off, a 90% refund is issued. After that window, tickets are non-refundable.' },
      { q: 'My QR code is not scanning at the gate. What do I do?', a: 'Ensure your phone screen brightness is at maximum. If the issue persists, show the gate marshal your order confirmation in the app. Contact our ticketing team on-site for urgent assistance.' },
      { q: 'Do you ship store merchandise outside Uganda?', a: 'Currently we ship within Uganda only. Regional shipping (Kenya, Tanzania, Rwanda) is planned for Q3 2026. Sign up for notifications in the Store.' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety & Security',
    icon: <FiShield />,
    faqs: [
      { q: 'Is my money safe on League OS?', a: 'Yes. Customer funds are held in segregated accounts separate from company operating funds. We are regulated and undergo regular third-party financial audits.' },
      { q: 'How do I report a suspicious transaction?', a: 'Go to Help → Report Issue → Suspicious Activity, or email security@leagueos.ug immediately. Do not share your PIN or OTP with anyone — our team will never ask for these.' },
      { q: 'What tools are available for responsible play?', a: 'You can set daily, weekly, or monthly deposit limits in Profile → Responsible Play. You can also activate a cool-off period (24 hours to 6 weeks) or self-exclude permanently if needed.' },
      { q: 'I think my account has been accessed by someone else. What should I do?', a: 'Immediately change your password, enable two-factor authentication in Settings → Security, and contact our support team via live chat. We will review your account activity and freeze any unauthorised actions.' },
    ],
  },
];

function AccordionItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`hc-faq-item${open ? ' open' : ''}`}>
      <button className="hc-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{faq.q}</span>
        <FiChevronDown className={`hc-faq-chevron${open ? ' open' : ''}`} />
      </button>
      {open && <p className="hc-faq-a">{faq.a}</p>}
    </div>
  );
}

function HelpCenter() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('account');

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory)!;
  const filtered = search.trim()
    ? CATEGORIES.flatMap(c => c.faqs.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      ))
    : currentCategory.faqs;

  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-hero">
        <span className="sp-hero__badge">Help Center</span>
        <h1 className="sp-hero__title">How can we <span>help you?</span></h1>
        <p className="sp-hero__sub">Search our knowledge base or browse by category below.</p>

        <div className="hc-search-wrap">
          <FiSearch className="hc-search-icon" />
          <input
            className="hc-search-input"
            type="search"
            placeholder="Search FAQs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <section className="sp-section hc-body">
        {!search.trim() && (
          <div className="hc-categories">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`hc-cat-btn${activeCategory === c.id ? ' active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                <span className="hc-cat-icon">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="hc-faqs">
          {search.trim() && <p className="hc-search-label">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>}
          {filtered.length === 0 && (
            <div className="hc-empty">
              <p>No FAQs match your search. Try different keywords or <a href="/contact">contact support</a>.</p>
            </div>
          )}
          {filtered.map((faq, i) => <AccordionItem key={i} faq={faq} />)}
        </div>
      </section>

      <div className="hc-still-stuck">
        <h2>Still need help?</h2>
        <p>Our support team is available every day from 8 AM to 10 PM (EAT).</p>
        <div className="hc-still-actions">
          <a href="/contact" className="sp-btn sp-btn--primary">Contact Support</a>
          <a href="/community" className="sp-btn sp-btn--ghost">Ask the Community</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default HelpCenter;
