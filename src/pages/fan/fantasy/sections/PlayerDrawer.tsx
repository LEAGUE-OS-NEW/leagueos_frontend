
import { useState } from 'react';
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
  /** Bench players of the same position that can replace this starter */
  benchOptions?: Player[];
  /** Called with the bench player chosen to swap in */
  onSwap?: (benchPlayerId: string) => void;
}

export default function PlayerDrawer({
  player,
  onClose,
  inSquad,
  canAdd,
  onAdd,
  onRemove,
  onCaptain,
  isCaptain,
  benchOptions = [],
  onSwap,
}: Props) {
  const statusTone = player.status === 'ready' ? 'green' : player.status === 'doubtful' ? 'orange' : 'red';
  const [swapOpen, setSwapOpen] = useState(false);
  const isStarter = inSquad && benchOptions.length >= 0 && onSwap !== undefined;

  return (
    <Drawer title={player.name} subtitle={`${player.club} · ${player.positionLabel}`} onClose={onClose}>
      <div className="player-drawer-head">
        <PlayerAvatar player={player} size={72} />
        <div>
          <div className="player-drawer-price">{player.price.toFixed(1)}M</div>
          <Badge tone={statusTone}>
            {player.status === 'ready'
              ? 'Available'
              : player.status === 'doubtful'
              ? 'Doubtful'
              : player.status === 'injured'
              ? 'Injured'
              : player.status === 'suspended'
              ? 'Suspended'
              : 'Unavailable'}
          </Badge>
        </div>
      </div>

      {player.statusNote && <p className="player-drawer-note">{player.statusNote}</p>}

      <div className="player-drawer-stats">
        <div>
          <span>Season points</span>
          <strong>{player.totalPoints ?? 'Awaiting statistics'}</strong>
        </div>
        <div>
          <span>Last gameweek</span>
          <strong>{player.gwPoints ?? 'Awaiting statistics'}</strong>
        </div>
        <div>
          <span>Form (5 GW avg)</span>
          <strong>{player.form == null ? 'No data' : player.form.toFixed(1)}</strong>
        </div>
        <div>
          <span>Selected by</span>
          <strong>{player.ownership == null ? 'No ownership data' : `${player.ownership.toFixed(1)}%`}</strong>
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
            {/* Bench swap — only shown when there are eligible bench players */}
            {isStarter && benchOptions.length > 0 && (
              <div className="swap-section">
                <button
                  className="btn btn-secondary swap-toggle"
                  onClick={() => setSwapOpen((o) => !o)}
                >
                  {swapOpen ? 'Cancel swap' : 'Move to bench ⇄'}
                </button>

                {swapOpen && (
                  <div className="swap-options">
                    <p className="swap-label">
                      Select a bench {player.positionLabel.toLowerCase()} to bring on:
                    </p>
                    {benchOptions.map((b) => (
                      <button
                        key={b.id}
                        className="swap-option-row"
                        onClick={() => {
                          onSwap!(b.id);
                          onClose();
                        }}
                      >
                        <PlayerAvatar player={b} size={36} />
                        <div className="swap-option-info">
                          <strong>{b.name}</strong>
                          <span>{b.club} · {b.gwPoints} pts this GW</span>
                        </div>
                        <span className="swap-option-pts">{b.totalPoints} pts</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isStarter && benchOptions.length === 0 && (
              <p className="swap-none">No bench {player.positionLabel.toLowerCase()}s available for this position.</p>
            )}

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
