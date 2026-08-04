import { useEffect, useRef } from 'react';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import './LegalPolicy.css';

const LegalPolicy = () => {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash) {
        const el = document.querySelector(window.location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    handleHash();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    }
  };

  const sections = [
    'introduction',
    'information-we-collect',
    'how-we-use-information',
    'payment-financial-data',
    'ticketing-policy',
    'membership-policy',
    'fan-conduct',
    'club-league-sponsor-data',
    'data-security',
    'user-rights',
    'cookies-tracking',
    'financial-compliance',
    'policy-updates',
    'contact',
  ];

  return (
    <div className="legal-policy">
      <Navbar />

      <div className="legal-policy__container">
        <header className="legal-policy__header">
          <h1 className="legal-policy__title">League OS Privacy Policy & Platform Terms</h1>
          <p className="legal-policy__subtitle">
            This document covers privacy, platform usage, payments, ticketing, memberships, and user
            responsibilities. By using League OS, you agree to these terms.
          </p>
          <div className="legal-policy__meta">
            <span className="legal-policy__badge">Version: v1.0</span>
            <span className="legal-policy__badge">Last Updated: August 2026</span>
          </div>
        </header>

        <div className="legal-policy__layout">
          <nav className="legal-policy__toc" aria-label="Table of contents">
            <h2 className="legal-policy__toc-title">Contents</h2>
            <ul className="legal-policy__toc-list">
              {sections.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="legal-policy__toc-link"
                    onClick={() => scrollTo(id)}
                  >
                    {id
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main className="legal-policy__content" ref={topRef}>
            <section id="introduction" className="legal-section">
              <h2>1. Introduction</h2>
              <p>
                League OS is a sports fan engagement and league management platform designed to
                connect fans, clubs, leagues, and sponsors through digital experiences including
                ticketing, memberships, fantasy competitions, live updates, and community tools.
              </p>
              <p>
                This Privacy Policy & Platform Terms document explains how we handle data, process
                payments, manage ticketing, and define user responsibilities. By accessing or using
                the platform, you accept these policies and agree to comply with them.
              </p>
            </section>

            <section id="information-we-collect" className="legal-section">
              <h2>2. Information We Collect</h2>
              <p>We collect information necessary to operate and improve the platform:</p>
              <ul>
                <li>Account information: name, email, phone, username, and authentication credentials.</li>
                <li>Fan profile information: preferences, interests, and profile details.</li>
                <li>Favorite clubs and sports preferences to personalize content.</li>
                <li>Ticketing and membership information including purchases, tiers, and status.</li>
                <li>Payment and transaction records linked to tickets, memberships, and other services.</li>
                <li>Device and usage information for analytics, performance, and security monitoring.</li>
              </ul>
            </section>

            <section id="how-we-use-information" className="legal-section">
              <h2>3. How We Use Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Provide and maintain platform services and core functionality.</li>
                <li>Personalize fan experiences including content, recommendations, and notifications.</li>
                <li>Process payments and manage ticket, membership, and order fulfillment.</li>
                <li>Improve services, interfaces, and platform reliability.</li>
                <li>Support security and fraud prevention mechanisms.</li>
                <li>Deliver communications, alerts, and service-related updates.</li>
              </ul>
            </section>

            <section id="payment-financial-data" className="legal-section">
              <h2>4. Payment & Financial Data Policy</h2>
              <p>
                Payments on League OS are processed through approved payment providers. We retain
                transaction records to support reconciliation, refunds, audits, and dispute
                resolution. Financial information is protected with appropriate security controls.
                Refunds are handled in accordance with the Ticketing and Membership policies.
              </p>
            </section>

            <section id="ticketing-policy" className="legal-section">
              <h2>5. Ticketing Policy</h2>
              <p>Tickets purchased through League OS are subject to the following rules:</p>
              <ul>
                <li>All ticket purchases are confirmed via platform records.</li>
                <li>Tickets include QR validation and entry verification at venue points.</li>
                <li>Refund and cancellation rules vary by event, club, and league settings.</li>
                <li>Resale or transfer rules may apply based on organizer terms.</li>
              </ul>
            </section>

            <section id="membership-policy" className="legal-section">
              <h2>6. Membership Policy</h2>
              <p>Club memberships on League OS may include:</p>
              <ul>
                <li>Tiered membership plans with different benefits and access levels.</li>
                <li>Auto-renewal options where explicitly selected by the user.</li>
                <li>Member benefits such as exclusive content, early access, and rewards.</li>
                <li>Usage restrictions as defined by the club or league.</li>
              </ul>
            </section>

            <section id="fan-conduct" className="legal-section">
              <h2>7. Fan Conduct Policy</h2>
              <p>Fans are expected to participate respectfully within the League OS community:</p>
              <ul>
                <li>Engage respectfully with other fans, clubs, and staff.</li>
                <li>Avoid abusive, offensive, or harmful content and behavior.</li>
                <li>Do not engage in fraud, manipulation, or unfair competitive practices.</li>
                <li>Participate fairly in polls, fantasy competitions, and other interactive features.</li>
              </ul>
            </section>

            <section id="club-league-sponsor-data" className="legal-section">
              <h2>8. Club, League and Sponsor Data Access</h2>
              <p>
                Clubs and leagues can manage their own information and view approved fan engagement
                data relevant to their operations. Sponsors receive approved analytics and
                performance insights. Personal data is never sold to third parties.
              </p>
            </section>

            <section id="data-security" className="legal-section">
              <h2>9. Data Security</h2>
              <p>We implement multiple security controls to protect user data:</p>
              <ul>
                <li>Secure authentication and credential management.</li>
                <li>Role-based access control aligned with user responsibilities.</li>
                <li>Audit logging of sensitive actions and administrative changes.</li>
                <li>Protection against unauthorized access through monitoring and incident response.</li>
              </ul>
            </section>

            <section id="user-rights" className="legal-section">
              <h2>10. User Rights</h2>
              <p>Users have the right to:</p>
              <ul>
                <li>View the information held in their account.</li>
                <li>Update or correct profile information.</li>
                <li>Request account deletion where permitted by law.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Manage communication and marketing preferences.</li>
              </ul>
            </section>

            <section id="cookies-tracking" className="legal-section">
              <h2>11. Cookies and Tracking</h2>
              <p>
                League OS uses cookies to support session management, security, analytics, and
                performance monitoring. Users can manage cookie preferences through browser
                settings where applicable.
              </p>
            </section>

            <section id="financial-compliance" className="legal-section">
              <h2>12. Financial Compliance & Responsible Operations</h2>
              <p>Our financial operations include controls designed to ensure integrity and trust:</p>
              <ul>
                <li>Transaction monitoring and anomaly detection.</li>
                <li>Fraud prevention through review workflows and risk controls.</li>
                <li>Reconciliation controls between payments, ticketing, and membership systems.</li>
                <li>Refund approval controls and audit trails for financial actions.</li>
              </ul>
            </section>

            <section id="policy-updates" className="legal-section">
              <h2>13. Policy Updates</h2>
              <p>
                League OS may update this policy to reflect changes in services, regulations, or
                platform features. Significant changes will be communicated to users through
                in-app notices, email, or platform announcements.
              </p>
            </section>

            <section id="contact" className="legal-section">
              <h2>14. Contact Information</h2>
              <p>For questions or requests related to this policy, contact:</p>
              <ul>
                <li>League OS Support Email: support@leagueos.example</li>
                <li>Privacy Contact: privacy@leagueos.example</li>
              </ul>
            </section>
          </main>
        </div>
      </div>

      <button
        type="button"
        className="legal-policy__back-to-top"
        onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        aria-label="Back to top"
      >
        ↑
      </button>

      <Footer />
    </div>
  );
};

export default LegalPolicy;