import React from 'react';
import type { Sport, Player } from '../FantasyCompetitions';
import type { FormationId } from './formations';
import FootballPitch from './FootballPitch';
import BasketballCourt from './BasketballCourt';
import RugbyField from './RugbyField';

interface PositionName {
  name: string;
}

interface LineupSurfaceProps {
  sport: Sport;
  startingPlayers: Player[];
  positions: PositionName[]; // ordered position categories for this sport, from squad rules
  formation: FormationId; // only used when sport === 'football'
  captainId: string | null;
  viceId: string | null;
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
}

/**
 * Renders the correct playing surface for the given sport and groups the
 * starting lineup by position for it. To support a new sport: add a
 * position-keyed surface component and one more case below.
 */
const LineupSurface: React.FC<LineupSurfaceProps> = ({
  sport,
  startingPlayers,
  positions,
  formation,
  captainId,
  viceId,
  selectedPlayerId,
  onPlayerClick,
}) => {
  const grouped: Record<string, Player[]> = {};
  positions.forEach((pos) => {
    grouped[pos.name] = startingPlayers.filter((p) => p.position === pos.name);
  });

  const shared = { grouped, captainId, viceId, selectedPlayerId, onPlayerClick };

  switch (sport) {
    case 'football':
      return <FootballPitch formationId={formation} {...shared} />;
    case 'basketball':
      return <BasketballCourt {...shared} />;
    case 'rugby':
      return <RugbyField {...shared} />;
    default:
      return null;
  }
};

export default LineupSurface;
