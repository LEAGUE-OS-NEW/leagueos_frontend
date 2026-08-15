import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSquad, type Player } from '../../../../services/clubsService';
import './SquadTab.css';

function PlayerPhoto({ src, name }: { src?: string; name: string }) {
  return <img src={src ?? '/players/player-avatar.png'} alt={`${name} photo`} className="squad-card__photo" />;
}

function SquadTab({ clubSlug, playerBasePath = '/clubs' }: { clubSlug: string; playerBasePath?: string }) {
  const [squad, setSquad] = useState<Player[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSquad(clubSlug).then((result) => {
      if (!cancelled) setSquad(result);
    });
    return () => {
      cancelled = true;
    };
  }, [clubSlug]);

  if (squad === null) {
    return <p className="club-profile-status">Loading squad…</p>;
  }

  if (squad.length === 0) {
    return (
      <div className="profile-empty-state">
        <p className="profile-empty-state__title">No squad list yet</p>
        <p>This club's squad hasn't been published yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="squad-grid">
      {squad.map((player) => (
        <Link to={`${playerBasePath}/${clubSlug}/players/${player.id}`} className="squad-card" key={player.id}>
          <PlayerPhoto src={player.photo} name={player.name} />
          <span className="squad-card__number">#{player.number}</span>
          <p className="squad-card__name">{player.name}</p>
          <p className="squad-card__position">{player.position}</p>
        </Link>
      ))}
    </div>
  );
}

export default SquadTab;
