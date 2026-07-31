import './BuiltInUganda.css';

type Stat = {
  value: string;
  label: string;
  sublabel: string;
};

const STATS: Stat[] = [
  { value: '1+', label: 'Countries', sublabel: 'Starting in Uganda' },
  { value: '50+', label: 'Leagues', sublabel: 'And growing' },
  { value: '10K+', label: 'Fans', sublabel: 'And counting' },
];

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
    </svg>
  );
}

function MapPlaceholderIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

function BuiltInUganda() {
  return (
    <section className="built-in-uganda">
      <div className="built-in-uganda-inner">
        <div className="built-in-uganda-panel">
          <span className="built-in-uganda-map" aria-hidden="true">
            <MapPlaceholderIcon />
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
                  <span className="stat-icon">
                    <PlaceholderIcon />
                  </span>
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
