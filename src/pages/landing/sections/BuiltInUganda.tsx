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

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.7 12.4c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.3 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.2-3.4z"
        fill="currentColor"
      />
      <path
        d="M14.8 5.6c.6-.7 1-1.7.9-2.6-.8 0-1.9.5-2.5 1.2-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4.5v15l14-7.5-14-7.5z" fill="currentColor" />
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

          <div className="built-in-uganda-download">
            <p className="download-label">Download the app</p>
            <div className="download-badges">
              <button type="button" className="store-badge">
                <AppleIcon />
                <span>
                  Download on the
                  <strong>App Store</strong>
                </span>
              </button>
              <button type="button" className="store-badge">
                <PlayIcon />
                <span>
                  GET IT ON
                  <strong>Google Play</strong>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BuiltInUganda;
