import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { GiTrophyCup, GiTicket } from 'react-icons/gi';
import './HowItWorks.css';

type Step = {
  title: string;
  description: string;
  icon: ReactNode;
  route: string;
};

const STEPS: Step[] = [
  { title: 'Follow Clubs', description: 'Stay updated and support your teams.', icon: <FiHeart />, route: '/clubs' },
  { title: 'Join Fantasy', description: 'Create your dream team and compete.', icon: <GiTrophyCup />, route: '/fantasy' },
  { title: 'Trade Markets', description: 'Predict outcomes and trade your views.', icon: <FiTrendingUp />, route: '/markets' },
  { title: 'Get Tickets', description: 'Buy tickets & memberships to live events.', icon: <GiTicket />, route: '/tickets' },
];

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
                <Link to={step.route} className="how-step">
                  <span className="how-step-icon">{step.icon}</span>
                  <p className="how-step-title">{step.title}</p>
                  <p className="how-step-desc">{step.description}</p>
                </Link>
                {index < STEPS.length - 1 && (
                  <span className="how-step-arrow" aria-hidden="true">
                    <FiArrowRight />
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
