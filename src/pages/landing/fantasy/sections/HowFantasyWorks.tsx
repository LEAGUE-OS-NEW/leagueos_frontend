import { Fragment } from 'react';
import type { IconType } from 'react-icons';
import { FiUsers, FiUserPlus, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import './HowFantasyWorks.css';

type Step = {
  icon: IconType;
  title: string;
  accent: 'purple' | 'orange' | 'blue';
};

const STEPS: Step[] = [
  { icon: FiUsers, title: 'Create or join a league', accent: 'purple' },
  { icon: FiUserPlus, title: 'Draft your dream team', accent: 'orange' },
  { icon: FiTrendingUp, title: 'Score points in real time', accent: 'blue' },
  { icon: GiTrophyCup, title: 'Climb the leaderboard', accent: 'purple' },
];

function HowFantasyWorks() {
  return (
    <section className="fantasy-panel how-fantasy-works" aria-labelledby="how-fantasy-works-heading">
      <div className="fantasy-panel-heading">
        <div>
          <h2 id="how-fantasy-works-heading">How Fantasy Works</h2>
          <p>It's simple. Pick, play, and climb the leaderboard.</p>
        </div>
      </div>

      <div className="how-fantasy-steps">
        {STEPS.map((step, index) => (
          <Fragment key={step.title}>
            <div className="how-fantasy-step">
              <span className={`how-fantasy-step-icon ${step.accent}`}>
                <step.icon />
              </span>
              <b>{index + 1}</b>
              <p>{step.title}</p>
            </div>
            {index < STEPS.length - 1 && (
              <span className="how-fantasy-step-arrow" aria-hidden="true">
                <FiArrowRight />
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

export default HowFantasyWorks;
