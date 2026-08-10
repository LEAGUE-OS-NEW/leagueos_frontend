import React from 'react';
import type { Player } from '../FantasyCompetitions';

export interface MarkerPosition {
  top: string; // CSS percentage, e.g. '42%'
  left: string; // CSS percentage, e.g. '50%'
}

interface PlayerMarkerProps {
  position: MarkerPosition;
  player?: Player;
  abbr: string;
  isCaptain?: boolean;
  isVice?: boolean;
  isSelected?: boolean;
  onClick?: (playerId: string) => void;
}

const clubTag = (club: string) => club.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

const HAS_STATUS_DOT: Partial<Record<Player['status'], boolean>> = {
  doubtful: true,
  injured: true,
  suspended: true,
};

/**
 * Renders one player (or an empty placeholder) on a playing surface.
 * Shared across football/basketball/rugby (and any future sport) so marker
 * markup, sizing and interaction stay identical everywhere.
 */
const PlayerMarker: React.FC<PlayerMarkerProps> = ({
  position,
  player,
  abbr,
  isCaptain,
  isVice,
  isSelected,
  onClick,
}) => {
  if (!player) {
    return (
      <div className="pitch-marker pitch-marker--empty" style={position}>
        <span className="pitch-marker__badge pitch-marker__badge--empty">{abbr}</span>
        <span className="pitch-marker__name pitch-marker__name--empty">Empty</span>
      </div>
    );
  }

  const showStatusDot = HAS_STATUS_DOT[player.status];

  return (
    <button
      type="button"
      className={`pitch-marker pitch-marker--filled${isSelected ? ' pitch-marker--selected' : ''} pitch-marker--${player.status}`}
      style={position}
      onClick={() => onClick?.(player.id)}
      aria-pressed={isSelected}
      title={`${player.name} — ${abbr} · ${player.club}${player.number ? ` · #${player.number}` : ''} · Proj ${player.expectedPoints.toFixed(1)}${
        isCaptain ? ' · Captain' : isVice ? ' · Vice-captain' : ''
      }`}
    >
      <span className="pitch-marker__badge">
        {player.number ? `#${player.number}` : abbr}
        {isCaptain && (
          <span className="pitch-marker__armband pitch-marker__armband--c" aria-label="Captain">
            C
          </span>
        )}
        {isVice && (
          <span className="pitch-marker__armband pitch-marker__armband--v" aria-label="Vice-captain">
            V
          </span>
        )}
        {showStatusDot && (
          <span className={`pitch-marker__status pitch-marker__status--${player.status}`} aria-hidden="true" />
        )}
      </span>
      <span className="pitch-marker__name">{player.name.split(' ')[0]}</span>
      <span className="pitch-marker__meta">
        {abbr} · {clubTag(player.club)}
      </span>
      <span className="pitch-marker__proj">Proj {player.expectedPoints.toFixed(1)}</span>
    </button>
  );
};

export default PlayerMarker;
