import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLiveFixtures, type RealFixture } from '../../../services/fixturesService';
import './LiveScores.css';

type Sport = 'Football' | 'Rugby' | 'Basketball';

const SPORT_CLASS: Record<Sport, string> = {
  Football: 'sport-football',
  Rugby: 'sport-rugby',
  Basketball: 'sport-basketball',
};

function toSportClass(sportName: string): string {
  return SPORT_CLASS[sportName as Sport] ?? SPORT_CLASS.Football;
}

function CrestPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function TeamCrest({ src, name, className }: { src?: string; name: string; className: string }) {
  if (!src) {
    return (
      <span className={className}>
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className={`${className} score-crest-image`}>
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function LiveScores() {
  const [liveMatches, setLiveMatches] = useState<RealFixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchLiveFixtures()
      .then((result) => {
        if (!cancelled) setLiveMatches(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cardMatches = liveMatches.slice(0, 3);
  const listMatches = liveMatches.slice(3, 9);

  return (
    <section className="live-scores">
      <div className="live-scores-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Live Scores</h2>
            <p className="section-subheading">Real-time scores from Africa and beyond.</p>
          </div>
          <Link to="/fixtures" className="section-link">
            View all live
          </Link>
        </div>

        {isLoading ? (
          <p className="live-scores-empty">Loading live matches…</p>
        ) : liveMatches.length === 0 ? (
          <p className="live-scores-empty">No live matches right now — check back soon.</p>
        ) : (
          <div className="live-scores-grid">
            {cardMatches.map((match) => (
              <Link to="/fixtures" className="score-card" key={match.id}>
                <div className="score-card-header">
                  <span className={`score-sport-tag ${toSportClass(match.sport_name)}`}>{match.sport_name}</span>
                  <span className="score-status">
                    LIVE {match.clock_display && <span className="score-status-meta">{match.clock_display}</span>}
                  </span>
                </div>

                <div className="score-teams">
                  <div className="score-team">
                    <TeamCrest src={match.home_club_logo_url} name={match.home_club_name} className="score-crest" />
                    <span className="score-team-name">{match.home_club_name}</span>
                  </div>
                  <span className="score-value">
                    {match.home_score ?? 0} - {match.away_score ?? 0}
                  </span>
                  <div className="score-team">
                    <TeamCrest src={match.away_club_logo_url} name={match.away_club_name} className="score-crest" />
                    <span className="score-team-name">{match.away_club_name}</span>
                  </div>
                </div>

                <div className="score-meta">
                  <p>{match.competition_name}</p>
                  <p>{match.venue}</p>
                </div>
              </Link>
            ))}

            {listMatches.length > 0 && (
              <div className="score-list-card">
                {listMatches.map((match) => (
                  <Link to="/fixtures" className="score-list-match" key={match.id}>
                    <div className="score-list-teams">
                      <div className="score-list-row">
                        <TeamCrest
                          src={match.home_club_logo_url}
                          name={match.home_club_name}
                          className="score-list-crest"
                        />
                        <span className="score-list-name">{match.home_club_name}</span>
                        <span className="score-list-value">{match.home_score ?? 0}</span>
                      </div>
                      <div className="score-list-row">
                        <TeamCrest
                          src={match.away_club_logo_url}
                          name={match.away_club_name}
                          className="score-list-crest"
                        />
                        <span className="score-list-name">{match.away_club_name}</span>
                        <span className="score-list-value">{match.away_score ?? 0}</span>
                      </div>
                    </div>
                    <span className="score-list-badge live">{match.clock_display || 'LIVE'}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default LiveScores;
