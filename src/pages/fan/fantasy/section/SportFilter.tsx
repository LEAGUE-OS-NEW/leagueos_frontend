import React from 'react';
import type { Sport } from '../FantasyCompetitions';

interface SportFilterProps {
  active: Sport;
  onChange: (sport: Sport) => void;
  accents: Record<Sport, string>;
}

const SPORTS: { id: Sport; label: string; icon: string }[] = [
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'rugby', label: 'Rugby', icon: '🏉' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
];

const SportFilter: React.FC<SportFilterProps> = ({ active, onChange, accents }) => {
  return (
    <nav className="sport-filter" aria-label="Choose a sport">
      {SPORTS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`sport-filter__tab${active === s.id ? ' sport-filter__tab--active' : ''}`}
          style={{ ['--accent' as string]: accents[s.id] }}
          onClick={() => onChange(s.id)}
          aria-pressed={active === s.id}
        >
          <span className="sport-filter__icon" aria-hidden="true">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </nav>
  );
};

export default SportFilter;
