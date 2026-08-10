import React from 'react';
import type { Player } from '../FantasyCompetitions';
import PlayerMarker from './PlayerMarker';

interface Slot {
  x: number;
  y: number;
}

// Rugby doesn't use football-style formations — each of the six position
// groups fields exactly one starter, laid out roughly how a team lines up
// from the forward pack (deep) to the back three (out wide/deep in defense).
const SLOTS: Record<string, Slot> = {
  'Front Row': { x: 50, y: 128 },
  'Second Row': { x: 50, y: 108 },
  'Back Row': { x: 50, y: 88 },
  'Half Backs': { x: 38, y: 66 },
  Centres: { x: 62, y: 44 },
  'Back Three': { x: 50, y: 22 },
};

const ABBR: Record<string, string> = {
  'Front Row': 'FR',
  'Second Row': 'SR',
  'Back Row': 'BR',
  'Half Backs': 'HB',
  Centres: 'CE',
  'Back Three': 'BT',
};

const toTop = (y: number) => `${(y / 160) * 100}%`;
const toLeft = (x: number) => `${x}%`;

interface RugbyFieldProps {
  grouped: Record<string, Player[]>;
  captainId: string | null;
  viceId: string | null;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
}

const RugbyField: React.FC<RugbyFieldProps> = ({ grouped, captainId, viceId, selectedPlayerId, onPlayerClick }) => {
  return (
    <div className="pitch pitch--rugby">
      <svg className="pitch__svg" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
        {/* field of play boundary */}
        <rect x="4" y="4" width="92" height="152" className="pitch__line" />
        {/* in-goal / try zones beyond each try line */}
        <rect x="4" y="-12" width="92" height="16" className="pitch__try-zone" />
        <rect x="4" y="156" width="92" height="16" className="pitch__try-zone" />
        <line x1="4" y1="4" x2="96" y2="4" className="pitch__line" />
        <line x1="4" y1="156" x2="96" y2="156" className="pitch__line" />
        {/* halfway line */}
        <line x1="4" y1="80" x2="96" y2="80" className="pitch__line" />
        {/* 22m lines */}
        <line x1="4" y1="37" x2="96" y2="37" className="pitch__line pitch__line--dashed" />
        <line x1="4" y1="123" x2="96" y2="123" className="pitch__line pitch__line--dashed" />
        {/* goal posts, top and bottom */}
        <path d="M 42 4 L 42 -8 M 58 4 L 58 -8 M 42 -4 L 58 -4" className="pitch__line" />
        <path d="M 42 156 L 42 168 M 58 156 L 58 168 M 42 164 L 58 164" className="pitch__line" />
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

export default RugbyField;
