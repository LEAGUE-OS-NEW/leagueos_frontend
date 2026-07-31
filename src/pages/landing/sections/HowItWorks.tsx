import { Fragment } from 'react';
import './HowItWorks.css';

type Step = {
  title: string;
  description: string;
};

const STEPS: Step[] = [
  { title: 'Follow Clubs', description: 'Stay updated and support your teams.' },
  { title: 'Join Fantasy', description: 'Create your dream team and compete.' },
  { title: 'Trade Markets', description: 'Predict outcomes and trade your views.' },
  { title: 'Get Tickets', description: 'Buy tickets & memberships to live events.' },
];

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
    </svg>
  );
}

function StepArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HowItWorks() {
  return (
    <section className="how-it-works">
      <div className="how-it-works-inner">
        <div className="how-it-works-panel">
          <div className="how-it-works-text">
            <p className="how-it-works-eyebrow">How League OS Works</p>
            <h2 className="how-it-works-heading">
              One Ecosystem.
              <br />
              More Ways to Win.
            </h2>
            <p className="how-it-works-subtext">Markets. Fantasy. Clubs. All connected.</p>
          </div>

          <div className="how-it-works-steps">
            {STEPS.map((step, index) => (
              <Fragment key={step.title}>
                <div className="how-step">
                  <span className="how-step-icon">
                    <PlaceholderIcon />
                  </span>
                  <p className="how-step-title">{step.title}</p>
                  <p className="how-step-desc">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <span className="how-step-arrow" aria-hidden="true">
                    <StepArrowIcon />
                  </span>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
