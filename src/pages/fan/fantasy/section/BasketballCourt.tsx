import React from 'react';
import type { Player } from '../FantasyCompetitions';
import PlayerMarker from './PlayerMarker';

interface Slot {
  x: number;
  y: number;
}

// Basketball doesn't use selectable "formations" like football — a starting
// five is always one player per position, laid out in the natural spots a
// coach would use on a half-court (point at the arc, wings, low post).
const SLOTS: Record<string, Slot> = {
  'Point Guards': { x: 50, y: 20 },
  'Shooting Guards': { x: 18, y: 48 },
  'Small Forwards': { x: 82, y: 48 },
  'Power Forwards': { x: 30, y: 84 },
  Centers: { x: 70, y: 84 },
};

const ABBR: Record<string, string> = {
  'Point Guards': 'PG',
  'Shooting Guards': 'SG',
  'Small Forwards': 'SF',
  'Power Forwards': 'PF',
  Centers: 'C',
};

const toTop = (y: number) => `${(y / 100) * 100}%`;
const toLeft = (x: number) => `${x}%`;

interface BasketballCourtProps {
  grouped: Record<string, Player[]>;
  captainId: string | null;
  viceId: string | null;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
}

const BasketballCourt: React.FC<BasketballCourtProps> = ({
  grouped,
  captainId,
  viceId,
  selectedPlayerId,
  onPlayerClick,
}) => {
  return (
    <div className="pitch pitch--basketball">
      <svg className="pitch__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* court boundary (half court, baseline at the bottom) */}
        <rect x="5" y="4" width="90" height="92" className="pitch__line" />
        {/* half-court line + partial center circle */}
        <line x1="5" y1="4" x2="95" y2="4" className="pitch__line" />
        <path d="M 38 4 A 12 12 0 0 0 62 4" className="pitch__line" />
        {/* free-throw lane / key */}
        <rect x="35" y="66" width="30" height="30" className="pitch__line" />
        {/* free-throw circle */}
        <circle cx="50" cy="66" r="12" className="pitch__line" />
        {/* three-point arc */}
        <path d="M 12 96 L 12 62 A 38 38 0 0 1 88 62 L 88 96" className="pitch__line" />
        {/* backboard + hoop */}
        <line x1="41" y1="90" x2="59" y2="90" className="pitch__line" />
        <circle cx="50" cy="93" r="2.2" className="pitch__line" />
      </svg>

      <div className="pitch__markers">
        {Object.entries(SLOTS).map(([positionName, slot]) => {
          const player = (grouped[positionName] ?? [])[0];
          return (
            <PlayerMarker
              key={positionName}
              position={{ top: toTop(slot.y), left: toLeft(slot.x) }}
              player={player}
              abbr={ABBR[positionName]}
              isCaptain={!!player && player.id === captainId}
              isVice={!!player && player.id === viceId}
              isSelected={!!player && player.id === selectedPlayerId}
              onClick={onPlayerClick}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BasketballCourt;
