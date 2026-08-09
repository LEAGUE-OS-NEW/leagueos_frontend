import React from 'react';
import type { Player } from '../FantasyCompetitions';
import PlayerMarker from './PlayerMarker';
import { FORMATIONS, type FormationId, type Slot, type FormationLayout } from './formations';

const GkSlot: Slot = { x: 50, y: 141 };

const rowPosition = (slot: Slot): { top: string; left: string } => ({
  top: `${(slot.y / 150) * 100}%`,
  left: `${slot.x}%`,
});

const formationAbbr = (formationId: FormationId): { gk: string; def: string; mid: string; fwd: string } => {
  const f = FORMATIONS[formationId];
  void f; // keep type usage minimal; not needed
  return { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' };
};

interface FootballPitchProps {
  formationId: FormationId;
  grouped: Record<string, Player[]>; // keyed by position group
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
  const formation: FormationLayout = FORMATIONS[formationId];

  const gk = grouped['Goalkeepers']?.[0];
  const def = grouped['Defenders'] ?? [];
  const mid = grouped['Midfielders'] ?? [];
  const fwd = grouped['Forwards'] ?? [];

  const abbrs = formationAbbr(formationId);

  const marker = (slot: Slot, player: Player | undefined, abbr: string, key: string) => (
    <PlayerMarker
      key={key}
      position={rowPosition(slot)}
      player={player}
      abbr={abbr}
      isCaptain={player?.id === captainId}
      isVice={player?.id === viceId}
      isSelected={player?.id === selectedPlayerId}
      onClick={player ? () => onPlayerClick(player.id) : undefined}
    />
  );

  // Fill in as many formation slots as there are players; extra slots render empty placeholders.
  const defSlots = formation.def;
  const midSlots = formation.mid;
  const fwdSlots = formation.fwd;

  const defMarkers = defSlots.map((slot, i) => marker(slot, def[i], abbrs.def, `def-${i}`));
  const midMarkers = midSlots.map((slot, i) => marker(slot, mid[i], abbrs.mid, `mid-${i}`));
  const fwdMarkers = fwdSlots.map((slot, i) => marker(slot, fwd[i], abbrs.fwd, `fwd-${i}`));

  return (
    <div className="pitch pitch--football">
      <svg viewBox="0 0 100 150" className="pitch__svg" aria-hidden="true">
        {/* Outer boundary */}
        <rect x="2" y="2" width="96" height="146" className="pitch__line" rx="2" />
        {/* Halfway line */}
        <line x1="2" y1="75" x2="98" y2="75" className="pitch__line" />
        {/* Center circle + spot */}
        <circle cx="50" cy="75" r="9" className="pitch__line" />
        <circle cx="50" cy="75" r="0.6" className="pitch__line" />
        {/* Penalty areas */}
        <rect x="28" y="2" width="44" height="16" className="pitch__line" />
        <rect x="28" y="132" width="44" height="16" className="pitch__line" />
        {/* Goal areas */}
        <rect x="38" y="2" width="24" height="6" className="pitch__line" />
        <rect x="38" y="142" width="24" height="6" className="pitch__line" />
        {/* Penalty spots */}
        <circle cx="50" cy="11" r="0.7" className="pitch__line" />
        <circle cx="50" cy="139" r="0.7" className="pitch__line" />
      </svg>

      <div className="pitch__markers">
        {gk && marker(GkSlot, gk, abbrs.gk, 'gk')}
        {!gk && marker(GkSlot, undefined, abbrs.gk, 'gk-empty')}
        {defMarkers}
        {midMarkers}
        {fwdMarkers}
      </div>
    </div>
  );
};

export default FootballPitch;