import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchClubBySlug, fetchPlayer, type ClubSummary, type Player } from '../../../services/clubsService';
import '../sections/FanDashboard.css';
import '../../clubs/profile/ClubProfile.css';
import '../../clubs/profile/PlayerProfile.css';
import './FanPlayerProfile.css';

function FanPlayerProfile() {
  const { clubSlug, playerId } = useParams<{ clubSlug: string; playerId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clubSlug || !playerId) return;
    let cancelled = false;

    Promise.all([fetchClubBySlug(clubSlug), fetchPlayer(clubSlug, playerId)]).then(([clubResult, playerResult]) => {
      if (!cancelled) {
        setClub(clubResult);
        setPlayer(playerResult);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [clubSlug, playerId]);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content fpp-content">

          <Link to={`/fan/clubs/${clubSlug}`} className="fpp-back">
            <FiChevronLeft /> Back to {club?.name ?? 'Club'}
          </Link>

          {isLoading ? (
            <p className="club-profile-status">Loading player profile…</p>
          ) : !player || !club ? (
            <div className="profile-empty-state">
              <p className="profile-empty-state__title">Player not found</p>
              <p>We couldn't find that player. They may have left the club or the link is incorrect.</p>
            </div>
          ) : (
            <>
              <div className="player-profile-header">
                <img
                  src={player.photo ?? '/players/player-avatar.png'}
                  alt={`${player.name} photo`}
                  className="player-profile__photo"
                />
                <div className="player-profile-header__info">
                  <h1>{player.name}</h1>
                  <p className="club-profile-header__meta">
                    {player.position} · #{player.number} · {club.name}
                  </p>
                </div>
              </div>

              <div className="club-profile-panel">
                <div className="club-profile-facts">
                  <div className="club-profile-fact">
                    <span className="club-profile-fact__label">Nationality</span>
                    <span className="club-profile-fact__value">{player.nationality}</span>
                  </div>
                  <div className="club-profile-fact">
                    <span className="club-profile-fact__label">Date Joined</span>
                    <span className="club-profile-fact__value">{player.dateJoined}</span>
                  </div>
                  <div className="club-profile-fact">
                    <span className="club-profile-fact__label">Position</span>
                    <span className="club-profile-fact__value">{player.position}</span>
                  </div>
                </div>

                <div className="player-profile-stats-heading">
                  <h2 className="club-profile-panel__heading">Season Stats</h2>
                  <span
                    className={`profile-verify-badge profile-verify-badge--${player.statsVerification.toLowerCase()}`}
                  >
                    {player.statsVerification === 'Verified' ? 'Verified' : 'Pending'}
                  </span>
                </div>

                {player.stats.length === 0 ? (
                  <div className="profile-empty-state">
                    <p className="profile-empty-state__title">No stats recorded yet</p>
                    <p>This player's season stats haven't been published yet. Check back soon.</p>
                  </div>
                ) : (
                  <div className="player-profile-stats-grid">
                    {player.stats.map((stat) => (
                      <div className="player-profile-stat" key={stat.label}>
                        <span className="player-profile-stat__value">{stat.value}</span>
                        <span className="player-profile-stat__label">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanPlayerProfile;
