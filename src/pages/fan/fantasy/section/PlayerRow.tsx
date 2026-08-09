import React from 'react';
import type { Player } from '../FantasyCompetitions';

interface PlayerRowProps {
  player: Player;
  mode: 'pick' | 'squad' | 'starting';
  selected?: boolean;
  isCaptain?: boolean;
  isVice?: boolean;
  disabledReason?: string;
  actionLabel?: string;
  onAction?: (playerId: string) => void;
  secondaryAction?: { label: string; onClick: (playerId: string) => void };
}

const statusLabel: Record<Player['status'], string> = {
  available: 'Available',
  injured: 'Injured',
  suspended: 'Suspended',
  doubtful: 'Doubtful',
};

const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  mode,
  selected,
  isCaptain,
  isVice,
  disabledReason,
  actionLabel,
  onAction,
  secondaryAction,
}) => {
  const isBlocked = player.status === 'injured' || player.status === 'suspended';

  return (
    <div className={`player-row player-row--${player.status}${selected ? ' player-row--selected' : ''}`}>
      <img className="player-row__avatar" src={player.image} alt={player.name} loading="lazy" />
      <div className="player-row__info">
        <div className="player-row__name-line">
          <span className="player-row__name">{player.name}</span>
          {isCaptain && <span className="badge badge--captain" title="Captain">C</span>}
          {isVice && <span className="badge badge--vice" title="Vice-captain">V</span>}
        </div>
        <span className="player-row__meta">
          {player.club} · {player.position}
        </span>
      </div>
      <span className={`status-chip status-chip--${player.status}`}>{statusLabel[player.status]}</span>
      <span className="player-row__points" title="Expected points">
        {player.expectedPoints.toFixed(1)} <small>pts</small>
      </span>
      <span className="player-row__price">{player.price.toFixed(1)}</span>
      <div className="player-row__actions">
        {onAction && (
          <button
            type="button"
            className={`player-row__btn${mode === 'squad' ? ' player-row__btn--remove' : ''}`}
            disabled={isBlocked && mode === 'pick'}
            onClick={() => onAction(player.id)}
            title={isBlocked ? `Unavailable — ${statusLabel[player.status].toLowerCase()}` : undefined}
          >
            {actionLabel ?? (mode === 'squad' ? 'Remove' : 'Add')}
          </button>
        )}
        {secondaryAction && (
          <button type="button" className="player-row__btn player-row__btn--ghost" onClick={() => secondaryAction.onClick(player.id)}>
            {secondaryAction.label}
          </button>
        )}
      </div>
      {disabledReason && isBlocked && <span className="player-row__reason">{disabledReason}</span>}
    </div>
  );
};

export default PlayerRow;
