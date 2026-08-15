import type { ClubSummary } from '../../../../services/clubsService';

function OverviewTab({ club }: { club: ClubSummary }) {
  return (
    <div className="club-profile-panel">
      <p className="club-profile-description">{club.description}</p>

      <div className="club-profile-facts">
        <div className="club-profile-fact">
          <span className="club-profile-fact__label">Founded</span>
          <span className="club-profile-fact__value">{club.founded}</span>
        </div>
        <div className="club-profile-fact">
          <span className="club-profile-fact__label">Stadium</span>
          <span className="club-profile-fact__value">{club.stadium}</span>
        </div>
        <div className="club-profile-fact">
          <span className="club-profile-fact__label">League</span>
          <span className="club-profile-fact__value">{club.league}</span>
        </div>
      </div>

      <h2 className="club-profile-panel__heading">Honours</h2>
      {club.honours.length === 0 ? (
        <div className="profile-empty-state">
          <p className="profile-empty-state__title">No honours recorded yet</p>
          <p>This club hasn't had any honours added to its official record.</p>
        </div>
      ) : (
        <ul className="club-profile-honours">
          {club.honours.map((honour) => (
            <li key={honour}>{honour}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OverviewTab;
