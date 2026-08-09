import React from 'react';
import type { Player } from '../FantasyCompetitions';
import PlayerMarker from './PlayerMarker';

export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '3-4-3';

interface Slot {
  x: number; // 0-100, horizontal position across the pitch
  y: number; // 0-150, vertical position (0 = attacking end, 150 = goalkeeper's end)
}

interface FormationLayout {
  label: string;
  def: Slot[];
  mid: Slot[];
  fwd: Slot[];
}

const GK_SLOT: Slot = { x: 50, y: 141 };

const spreadX = (n: number): number[] => {
  switch (n) {
    case 1:
      return [50];
    case 2:
      return [32, 68];
    case 3:
      return [20, 50, 80];
    case 4:
      return [15, 38, 62, 85];
    case 5:
      return [12, 31, 50, 69, 88];
    default:
      return Array.from({ length: n }, (_, i) => (100 / (n + 1)) * (i + 1));
  }
};

const row = (n: number, y: number): Slot[] => spreadX(n).map((x) => ({ x, y }));

export const FORMATIONS: Record<FormationId, FormationLayout> = {
  '4-3-3': { label: '4-3-3', def: row(4, 118), mid: row(3, 82), fwd: row(3, 32) },
  '4-4-2': { label: '4-4-2', def: row(4, 118), mid: row(4, 85), fwd: row(2, 32) },
  '3-5-2': { label: '3-5-2', def: row(3, 118), mid: row(5, 85), fwd: row(2, 32) },
  '4-2-3-1': { label: '4-2-3-1', def: row(4, 120), mid: [...row(2, 96), ...row(3, 68)], fwd: row(1, 30) },
  '3-4-3': { label: '3-4-3', def: row(3, 118), mid: row(4, 85), fwd: row(3, 32) },
};

const toTop = (y: number) => `${(y / 150) * 100}%`;
const toLeft = (x: number) => `${x}%`;

interface FootballPitchProps {
  formationId: FormationId;
  grouped: Record<string, Player[]>; // keyed by 'Goalkeepers' | 'Defenders' | 'Midfielders' | 'Forwards'
  captainId: string | null;
  viceId: string | null;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
}

const FootballPitch: React.FC<FootballPitchProps> = ({
  formationId,
  grouped,
  captainId,
  viceId,
  selectedPlayerId,
  onPlayerClick,
}) => {
  const layout = FORMATIONS[formationId];
  const goalkeepers = grouped['Goalkeepers'] ?? [];
  const defenders = grouped['Defenders'] ?? [];
  const midfielders = grouped['Midfielders'] ?? [];
  const forwards = grouped['Forwards'] ?? [];

  const marker = (slot: Slot, player: Player | undefined, abbr: string, key: string) => (
    <PlayerMarker
      key={key}
      position={{ top: toTop(slot.y), left: toLeft(slot.x) }}
      player={player}
      abbr={abbr}
      isCaptain={!!player && player.id === captainId}
      isVice={!!player && player.id === viceId}
      isSelected={!!player && player.id === selectedPlayerId}
      onClick={onPlayerClick}
    />
  );

  return (
    <div className="pitch pitch--football">
      <svg className="pitch__svg" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">
        <rect x="4" y="4" width="92" height="142" className="pitch__line" />
        <line x1="4" y1="75" x2="96" y2="75" className="pitch__line" />
        <circle cx="50" cy="75" r="12" className="pitch__line" />
        <circle cx="50" cy="75" r="0.8" className="pitch__spot" />

        <rect x="25" y="4" width="50" height="22" className="pitch__line" />
        <rect x="38" y="4" width="24" height="9" className="pitch__line" />
        <path d="M 44 4 L 44 1 L 56 1 L 56 4" className="pitch__line" />
        <path d="M 38 26 A 12 12 0 0 0 62 26" className="pitch__line" />
        <circle cx="50" cy="26" r="0.8" className="pitch__spot" />

        <rect x="25" y="124" width="50" height="22" className="pitch__line" />
        <rect x="38" y="137" width="24" height="9" className="pitch__line" />
        <path d="M 44 146 L 44 149 L 56 149 L 56 146" className="pitch__line" />
        <path d="M 38 124 A 12 12 0 0 1 62 124" className="pitch__line" />
        <circle cx="50" cy="124" r="0.8" className="pitch__spot" />
      </svg>

      <div className="pitch__markers">
        {marker(GK_SLOT, goalkeepers[0], 'GK', 'gk')}
        {layout.def.map((slot, i) => marker(slot, defenders[i], 'DEF', `def-${i}`))}
        {layout.mid.map((slot, i) => marker(slot, midfielders[i], 'MID', `mid-${i}`))}
        {layout.fwd.map((slot, i) => marker(slot, forwards[i], 'FWD', `fwd-${i}`))}
      </div>
    </div>
  );
};

export default FootballPitch;
