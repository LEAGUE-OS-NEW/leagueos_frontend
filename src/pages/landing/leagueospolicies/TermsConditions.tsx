import { useEffect, useRef } from 'react';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import './TermsConditions.css';

const TermsConditions = () => {
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
    'acceptance-of-terms',
    'eligibility-and-account-registration',
    'user-account-responsibilities',
    'acceptable-use-policy',
    'fan-community-and-engagement-rules',
    'ticketing-terms',
    'membership-terms',
    'payments-and-transactions',
    'refund-policy',
    'fantasy-league-and-competition-rules',
    'club-league-and-sponsor-responsibilities',
    'platform-availability',
    'intellectual-property-rights',
    'account-suspension-and-termination',
    'limitation-of-liability',
    'policy-changes',
    'governing-law',
    'contact-information',
  ];

  return (
    <div className="terms-conditions">
      <Navbar />

      <div className="terms-conditions__container">
        <header className="terms-conditions__header">
          <h1 className="terms-conditions__title">League OS Terms & Conditions</h1>
          <p className="terms-conditions__subtitle">
            This document governs your use of the League OS platform, including fan engagement,
            ticketing, memberships, fantasy competitions, and community features.
          </p>
          <div className="terms-conditions__meta">
            <span className="terms-conditions__badge">Version: v1.0</span>
            <span className="terms-conditions__badge">Last Updated: August 2026</span>
          </div>
        </header>

        <div className="terms-conditions__layout">
          <nav className="terms-conditions__toc" aria-label="Table of contents">
            <h2 className="terms-conditions__toc-title">Contents</h2>
            <ul className="terms-conditions__toc-list">
              {sections.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="terms-conditions__toc-link"
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

          <main className="terms-conditions__content" ref={topRef}>
            <section id="introduction" className="legal-section">
              <h2>1. Introduction</h2>
              <p>
                League OS is a comprehensive sports fan engagement and league management platform
                designed to connect fans, clubs, leagues, and sponsors through digital experiences.
                The platform provides ticketing, memberships, fantasy competitions, live updates,
                community tools, and related services.
              </p>
              <p>
                These Terms & Conditions outline the rules, rights, and responsibilities governing
                your access to and use of League OS. By creating an account or using any part of
                the platform, you agree to be bound by these terms.
              </p>
            </section>

            <section id="acceptance-of-terms" className="legal-section">
              <h2>2. Acceptance of Terms</h2>
              <p>
                By accessing or using League OS, you confirm that you have read, understood, and
                agree to comply with these Terms & Conditions. If you do not agree with any part
                of these terms, you must discontinue use of the platform immediately.
              </p>
              <p>
                We reserve the right to update, modify, or replace these terms at any time.
                Continued use of the platform following any changes constitutes acceptance of the
                revised terms.
              </p>
            </section>

            <section id="eligibility-and-account-registration" className="legal-section">
              <h2>3. Eligibility and Account Registration</h2>
              <p>
                To use League OS, you must meet the following eligibility requirements:
              </p>
              <ul>
                <li>Be at least 13 years of age, or the minimum legal age in your jurisdiction.</li>
                <li>Have the legal capacity to enter into a binding agreement.</li>
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain and update your account information to keep it accurate.</li>
                <li>Not be prohibited from using the platform under applicable law.</li>
                <li>Register for only one account unless explicitly permitted by League OS.</li>
              </ul>
            </section>

            <section id="user-account-responsibilities" className="legal-section">
              <h2>4. User Account Responsibilities</h2>
              <p>
                You are responsible for safeguarding your account credentials and for all activity
                that occurs under your account. You agree to:
              </p>
              <ul>
                <li>Keep your username and password confidential and secure.</li>
                <li>Notify League OS immediately of any unauthorized access or security breach.</li>
                <li>Accept full responsibility for all activities conducted through your account.</li>
                <li>Ensure that your account information remains accurate and up to date.</li>
                <li>Not share, transfer, or sell your account to any third party.</li>
                <li>Use strong passwords and enable available security features.</li>
              </ul>
            </section>

            <section id="acceptable-use-policy" className="legal-section">
              <h2>5. Acceptable Use Policy</h2>
              <p>
                You agree not to use League OS for any unlawful, harmful, or abusive purpose.
                Prohibited activities include, but are not limited to:
              </p>
              <ul>
                <li>Violating any applicable laws, regulations, or third-party rights.</li>
                <li>Impersonating any person, entity, or official representative.</li>
                <li>Distributing malware, viruses, or harmful code through the platform.</li>
                <li>Attempting to gain unauthorized access to any portion of the platform.</li>
                <li>Interfering with or disrupting platform servers, networks, or services.</li>
                <li>Using automated scripts, bots, or scraping tools without permission.</li>
                <li>Engaging in any form of harassment, hate speech, or intimidation.</li>
                <li>Posting false, misleading, or defamatory content.</li>
              </ul>
            </section>

            <section id="fan-community-and-engagement-rules" className="legal-section">
              <h2>6. Fan Community and Engagement Rules</h2>
              <p>
                League OS fosters a vibrant and respectful community. All users participating in
                fan forums, comments, polls, or interactive features must adhere to the following:
              </p>
              <ul>
                <li>Treat fellow fans, club representatives, and staff with respect.</li>
                <li>Refrain from abusive language, threats, or personal attacks.</li>
                <li>Respect diverse opinions and sports affiliations.</li>
                <li>Do not post content that infringes on intellectual property rights.</li>
                <li>Avoid spamming, self-promotion, or commercial solicitation.</li>
                <li>Comply with all community guidelines issued by League OS.</li>
                <li>Report inappropriate behavior using platform moderation tools.</li>
              </ul>
            </section>

            <section id="ticketing-terms" className="legal-section">
              <h2>7. Ticketing Terms</h2>
              <p>
                Tickets purchased through League OS are subject to the following terms:
              </p>
              <ul>
                <li>All ticket sales are final unless otherwise specified by event organizers.</li>
                <li>Tickets are non-transferable unless explicitly permitted by the event policy.</li>
                <li>QR codes or digital tickets must be presented at the venue for entry.</li>
                <li>League OS is not responsible for lost, stolen, or damaged tickets.</li>
                <li>Event details, dates, and venues are subject to change by organizers.</li>
                <li>Resale of tickets is subject to the terms set by event organizers and applicable law.</li>
                <li>Fraudulent ticket purchases may result in account termination.</li>
              </ul>
            </section>

            <section id="membership-terms" className="legal-section">
              <h2>8. Membership Terms</h2>
              <p>
                Club and league memberships offered through League OS are governed by these terms:
              </p>
              <ul>
                <li>Membership benefits, pricing, and tiers are determined by the respective club or league.</li>
                <li>Auto-renewal memberships will renew automatically unless canceled before the renewal date.</li>
                <li>Membership benefits are personal and non-transferable.</li>
                <li>Misuse of membership privileges may result in suspension or termination.</li>
                <li>Membership fees are non-refundable except as stated in the Refund Policy.</li>
                <li>Clubs reserve the right to modify membership benefits with reasonable notice.</li>
              </ul>
            </section>

            <section id="payments-and-transactions" className="legal-section">
              <h2>9. Payments and Transactions</h2>
              <p>
                All payments on League OS are processed securely through approved payment providers.
                By making a purchase, you agree to:
              </p>
              <ul>
                <li>Provide accurate billing and payment information.</li>
                <li>Pay all fees associated with your purchases, including applicable taxes.</li>
                <li>Authorize League OS to charge your designated payment method.</li>
                <li>Accept that prices are subject to change without prior notice.</li>
                <li>Review transaction details before confirming any purchase.</li>
                <li>Contact support promptly for any billing discrepancies.</li>
              </ul>
            </section>

            <section id="refund-policy" className="legal-section">
              <h2>10. Refund Policy</h2>
              <p>
                Refund requests are handled in accordance with the specific policies of the event,
                club, or service provider:
              </p>
              <ul>
                <li>Tickets may be refundable only if the event is canceled or postponed indefinitely.</li>
                <li>Membership fees are generally non-refundable, except where required by law.</li>
                <li>Refund requests must be submitted through official League OS support channels.</li>
                <li>Approved refunds will be issued to the original payment method within a reasonable timeframe.</li>
                <li>League OS reserves the right to deny refund requests that do not meet policy criteria.</li>
                <li>Chargebacks without prior communication may result in account restrictions.</li>
              </ul>
            </section>

            <section id="fantasy-league-and-competition-rules" className="legal-section">
              <h2>11. Fantasy League and Competition Rules</h2>
              <p>
                Participation in fantasy leagues and competitions on League OS is subject to the
                following:
              </p>
              <ul>
                <li>Each fantasy competition has specific rules published by the competition organizer.</li>
                <li>Participants must create lineups and make selections within designated timeframes.</li>
                <li>Collusion, manipulation, or fraudulent behavior will result in disqualification.</li>
                <li>Prizes and rewards are subject to availability and competition-specific terms.</li>
                <li>League OS is not liable for losses resulting from competition outcomes.</li>
                <li>Any disputes regarding fantasy competitions will be resolved by the competition organizer.</li>
              </ul>
            </section>

            <section id="club-league-and-sponsor-responsibilities" className="legal-section">
              <h2>12. Club, League and Sponsor Responsibilities</h2>
              <p>
                Clubs, leagues, and sponsors using League OS are responsible for:
              </p>
              <ul>
                <li>Ensuring that their content and promotions comply with applicable laws.</li>
                <li>Providing accurate event, membership, and competition information.</li>
                <li>Honoring commitments made to fans through the platform.</li>
                <li>Protecting fan data shared with them in accordance with privacy policies.</li>
                <li>Resolving fan disputes and support requests in a timely manner.</li>
                <li>Indemnifying League OS against claims arising from their misuse of platform features.</li>
              </ul>
            </section>

            <section id="platform-availability" className="legal-section">
              <h2>13. Platform Availability</h2>
              <p>
                League OS strives to maintain continuous platform availability; however, we do not
                guarantee uninterrupted access. The platform may be temporarily unavailable due to:
              </p>
              <ul>
                <li>Scheduled maintenance and updates.</li>
                <li>Technical failures or cyberattacks beyond our control.</li>
                <li>Force majeure events including natural disasters or infrastructure failures.</li>
                <li>Regulatory or legal requirements requiring service suspension.</li>
              </ul>
              <p>
                League OS will make reasonable efforts to provide advance notice of planned
                service interruptions.
              </p>
            </section>

            <section id="intellectual-property-rights" className="legal-section">
              <h2>14. Intellectual Property Rights</h2>
              <p>
                All content, trademarks, logos, and materials on League OS are owned by or licensed
                to League OS or its partners. You agree not to:
              </p>
              <ul>
                <li>Copy, reproduce, or distribute platform content without authorization.</li>
                <li>Use League OS trademarks or branding without prior written consent.</li>
                <li>Reverse engineer, decompile, or attempt to extract platform source code.</li>
                <li>Upload content that infringes on third-party intellectual property rights.</li>
                <li>Remove or alter any proprietary notices from platform materials.</li>
              </ul>
              <p>
                User-generated content remains the property of the user, but by posting it you grant
                League OS a worldwide, non-exclusive license to use, display, and distribute such
                content in connection with platform operations.
              </p>
            </section>

            <section id="account-suspension-and-termination" className="legal-section">
              <h2>15. Account Suspension and Termination</h2>
              <p>
                League OS reserves the right to suspend or terminate accounts that violate these
                terms. Grounds for suspension or termination include:
              </p>
              <ul>
                <li>Breach of these Terms & Conditions or related policies.</li>
                <li>Fraudulent activity, payment chargebacks, or misuse of services.</li>
                <li>Harassment, abuse, or harmful conduct toward other users or staff.</li>
                <li>Attempts to compromise platform security or data integrity.</li>
                <li>Creation of multiple accounts to manipulate platform features.</li>
                <li>Violation of applicable laws or regulations.</li>
              </ul>
              <p>
                Users may request account deletion by contacting support. Upon termination, all
                rights granted under these terms cease, and provisions that by their nature should
                survive termination will remain in effect.
              </p>
            </section>

            <section id="limitation-of-liability" className="legal-section">
              <h2>16. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, League OS and its affiliates, officers,
                directors, employees, and agents shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including but not limited to loss of
                profits, data, or goodwill.
              </p>
              <p>
                League OS shall not be liable for any damages arising from:
              </p>
              <ul>
                <li>Your use of or inability to use the platform.</li>
                <li>Unauthorized access to or use of our servers or personal information.</li>
                <li>Errors, inaccuracies, or omissions in platform content.</li>
                <li>Events or services provided by third-party clubs, leagues, or sponsors.</li>
                <li>Interruptions in service due to maintenance, technical issues, or force majeure.</li>
              </ul>
              <p>
                Our total liability to you for any claim arising from these terms shall not exceed
                the amount you paid to League OS in the twelve months preceding the claim.
              </p>
            </section>

            <section id="policy-changes" className="legal-section">
              <h2>17. Policy Changes</h2>
              <p>
                League OS may revise, amend, or update these Terms & Conditions from time to time
                to reflect changes in platform features, legal requirements, or business practices.
                When material changes are made, we will provide notice through:
              </p>
              <ul>
                <li>Prominent in-app notifications or platform banners.</li>
                <li>Email communications to registered users.</li>
                <li>Updates posted on the League OS website or legal policy page.</li>
              </ul>
              <p>
                Your continued use of the platform after changes become effective constitutes
                acceptance of the revised terms. We encourage you to review these terms periodically.
              </p>
            </section>

            <section id="governing-law" className="legal-section">
              <h2>18. Governing Law</h2>
              <p>
                These Terms & Conditions shall be governed by and construed in accordance with the
                laws of the jurisdiction in which League OS operates, without regard to conflict of
                law principles.
              </p>
              <p>
                Any disputes arising from these terms or your use of League OS shall be resolved
                in the competent courts located in the applicable jurisdiction, unless otherwise
                agreed by the parties. You agree to submit to the personal jurisdiction of such courts.
              </p>
            </section>

            <section id="contact-information" className="legal-section">
              <h2>19. Contact Information</h2>
              <p>
                For questions, concerns, or notices related to these Terms & Conditions, you may
                contact League OS through the following channels:
              </p>
              <ul>
                <li>Support Email: support@leagueos.example</li>
                <li>Legal Contact: legal@leagueos.example</li>
                <li>Platform Feedback: feedback@leagueos.example</li>
                <li>Address: League OS Legal Department, [Company Address]</li>
              </ul>
              <p>
                We will make reasonable efforts to respond to your inquiries within a timely manner.
              </p>
            </section>
          </main>
        </div>
      </div>

      <button
        type="button"
        className="terms-conditions__back-to-top"
        onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        aria-label="Back to top"
      >
        ↑
      </button>

      <Footer />
    </div>
  );
};

export default TermsConditions;