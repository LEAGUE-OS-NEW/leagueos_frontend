import { useEffect, useState } from 'react';
import { fetchClubFixtures, type ClubFixture } from '../../../../services/clubsService';

function FixturesTab({ clubSlug }: { clubSlug: string }) {
  const [fixtures, setFixtures] = useState<ClubFixture[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchClubFixtures(clubSlug).then((result) => {
      if (!cancelled) setFixtures(result);
    });
    return () => {
      cancelled = true;
    };
  }, [clubSlug]);

  if (fixtures === null) {
    return <p className="club-profile-status">Loading fixtures…</p>;
  }

  if (fixtures.length === 0) {
    return (
      <div className="profile-empty-state">
        <p className="profile-empty-state__title">No upcoming fixtures</p>
        <p>This club has no fixtures scheduled right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <ul className="club-profile-fixture-list">
      {fixtures.map((fixture) => (
        <li className="club-profile-fixture-row" key={`${fixture.opponent}-${fixture.time}`}>
          <div>
            <p className="club-profile-fixture-row__match">
              {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
            </p>
            <p className="club-profile-fixture-row__competition">{fixture.competition}</p>
          </div>
          <span className="club-profile-fixture-row__time">{fixture.time}</span>
        </li>
      ))}
    </ul>
  );
}

export default FixturesTab;
