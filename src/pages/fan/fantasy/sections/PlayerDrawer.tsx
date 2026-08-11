
import type { Player } from '../types';
import { Drawer } from './Modal';
import PlayerAvatar from './PlayerAvatar';
import { Badge } from './shared';

interface Props {
  player: Player;
  onClose: () => void;
  inSquad: boolean;
  canAdd: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onCaptain?: () => void;
  isCaptain?: boolean;
}

export default function PlayerDrawer({ player, onClose, inSquad, canAdd, onAdd, onRemove, onCaptain, isCaptain }: Props) {
  const statusTone = player.status === 'ready' ? 'green' : player.status === 'doubtful' ? 'orange' : 'red';

  return (
    <Drawer title={player.name} subtitle={`${player.club} · ${player.positionLabel}`} onClose={onClose}>
      <div className="player-drawer-head">
        <PlayerAvatar player={player} size={72} />
        <div>
          <div className="player-drawer-price">UGX {player.price.toFixed(1)}M</div>
          <Badge tone={statusTone}>
            {player.status === 'ready' ? 'Available' : player.status === 'doubtful' ? 'Doubtful' : player.status === 'injured' ? 'Injured' : 'Suspended'}
          </Badge>
        </div>
      </div>

      {player.statusNote && <p className="player-drawer-note">{player.statusNote}</p>}

      <div className="player-drawer-stats">
        <div>
          <span>Season points</span>
          <strong>{player.totalPoints}</strong>
        </div>
        <div>
          <span>Last gameweek</span>
          <strong>{player.gwPoints}</strong>
        </div>
        <div>
          <span>Form (5 GW avg)</span>
          <strong>{player.form.toFixed(1)}</strong>
        </div>
        <div>
          <span>Selected by</span>
          <strong>{player.ownership.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="player-drawer-actions">
        {!inSquad && (
          <button className="btn btn-primary" disabled={!canAdd} onClick={onAdd}>
            {canAdd ? 'Add to squad' : 'Squad full or budget too low'}
          </button>
        )}
        {inSquad && (
          <>
            <button className="btn btn-ghost" onClick={onRemove}>
              Remove from squad
            </button>
            {onCaptain && (
              <button className="btn btn-secondary" onClick={onCaptain}>
                {isCaptain ? 'Captain ✓' : 'Make captain'}
              </button>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
