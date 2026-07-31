import type { ReactNode } from 'react';
import { FiFlag, FiAward, FiUsers, FiGlobe } from 'react-icons/fi';
import './BuiltInUganda.css';

type Stat = {
  value: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
};

const STATS: Stat[] = [
  { value: '1+', label: 'Countries', sublabel: 'Starting in Uganda', icon: <FiFlag /> },
  { value: '50+', label: 'Leagues', sublabel: 'And growing', icon: <FiAward /> },
  { value: '10K+', label: 'Fans', sublabel: 'And counting', icon: <FiUsers /> },
];

function BuiltInUganda() {
  return (
    <section className="built-in-uganda">
      <div className="built-in-uganda-inner">
        <div className="built-in-uganda-panel">
          <span className="built-in-uganda-map" aria-hidden="true">
            <FiGlobe />
          </span>

          <div className="built-in-uganda-content">
            <h2 className="built-in-uganda-heading">
              Built in Uganda.
              <br />
              Ready for Africa.
            </h2>
            <p className="built-in-uganda-text">
              League OS is proudly built for Ugandan fans, designed to connect communities, elevate sport, and
              compete on the world stage.
            </p>

            <div className="built-in-uganda-stats">
              {STATS.map((stat) => (
                <div className="stat-item" key={stat.label}>
                  <span className="stat-icon">{stat.icon}</span>
                  <div>
                    <p className="stat-value">{stat.value}</p>
                    <p className="stat-label">{stat.label}</p>
                    <p className="stat-sublabel">{stat.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BuiltInUganda;
