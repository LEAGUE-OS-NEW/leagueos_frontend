import { Link } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import './MyFantasyTeam.css';

type Player = {
  name: string;
  points: number;
  jerseyColor: string;
};

const FORMATION: Player[][] = [
  [
    { name: 'A. Diallo', points: 156, jerseyColor: '#7c3aed' },
    { name: 'K. Mbuku', points: 198, jerseyColor: '#2563eb' },
    { name: 'S. Okello', points: 142, jerseyColor: '#dc2626' },
  ],
  [
    { name: 'P. Katongo', points: 172, jerseyColor: '#38bdf8' },
    { name: 'J. Mutyaba', points: 165, jerseyColor: '#1e3a8a' },
    { name: 'E. Niyonzima', points: 148, jerseyColor: '#e5e7eb' },
  ],
  [
    { name: 'B. Tendo', points: 134, jerseyColor: '#7c3aed' },
    { name: 'M. Awany', points: 128, jerseyColor: '#1e3a8a' },
    { name: 'H. Wasswa', points: 119, jerseyColor: '#dc2626' },
    { name: 'D. Ochieng', points: 124, jerseyColor: '#7f1d1d' },
  ],
  [{ name: 'I. Kizito', points: 108, jerseyColor: '#16a34a' }],
];

function Jersey({ color }: { color: string }) {
  return (
    <span className="jersey" aria-hidden="true">
      <span className="jersey-sleeve jersey-sleeve-left" style={{ backgroundColor: color }} />
      <span className="jersey-sleeve jersey-sleeve-right" style={{ backgroundColor: color }} />
      <span className="jersey-body" style={{ backgroundColor: color }} />
      <span className="jersey-collar" />
    </span>
  );
}

function MyFantasyTeam() {
  return (
    <div className="my-fantasy-team dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">My Fantasy Team</h2>
        <Link to="/fantasy" className="dashboard-card-link">
          View team
        </Link>
      </div>

      <div className="fantasy-header">
        <div className="fantasy-header-team">
          <FiShield className="fantasy-shield-icon" />
          <div>
            <p className="fantasy-team-name">Spartan Squad</p>
            <p className="fantasy-team-league">Classic League</p>
          </div>
        </div>
        <div className="fantasy-header-points">
          <p className="fantasy-points-value">
            1,286 <span>PTS</span>
          </p>
          <p className="fantasy-points-rank">Top 18%</p>
        </div>
      </div>

      <div className="fantasy-pitch">
        {FORMATION.map((row, index) => (
          <div className="fantasy-pitch-row" key={index}>
            {row.map((player) => (
              <div className="fantasy-player" key={player.name}>
                <Jersey color={player.jerseyColor} />
                <span className="fantasy-player-name">{player.name}</span>
                <span className="fantasy-player-points">{player.points} PTS</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="fantasy-footer">
        <span className="fantasy-gameweek">Gameweek 12</span>
        <Link to="/fantasy" className="dashboard-card-link">
          View full team
        </Link>
      </div>
    </div>
  );
}

export default MyFantasyTeam;
