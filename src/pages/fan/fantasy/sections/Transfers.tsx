import { useMemo, useState } from 'react';
import type { Competition, FantasyTeam, Player, PositionGroup } from '../types';
import { SPORT_RULES, playersFor } from '../data';
import { SearchBar, Badge, FilterIcon } from './shared';
import PlayerAvatar from './PlayerAvatar';
import { Modal } from './Modal';

interface Props {
  competition: Competition;
  team: FantasyTeam;
  onConfirm: (result: { outId: string; inId: string; pointsCost: number }[], newBudget: number) => void;
  onBack: () => void;
}

interface PendingMove {
  outId: string;
  inId: string;
}

export default function Transfers({ competition, team, onConfirm, onBack }: Props) {
  const rules = SPORT_RULES[competition.sport];
  const pool = useMemo(() => playersFor(competition.id), [competition.id]);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);

  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [moves, setMoves] = useState<PendingMove[]>([]);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PositionGroup | 'all'>('all');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [costWarningFor, setCostWarningFor] = useState<Player | null>(null);

  const currentIds = team.squad.map((s) => s.playerId);
  const outIds = moves.map((m) => m.outId);
  const inIds = moves.map((m) => m.inId);
  const workingSquadIds = currentIds.filter((id) => !outIds.includes(id)).concat(inIds);
  const workingSquad = workingSquadIds.map((id) => byId.get(id)!).filter(Boolean);

  const spentDelta = moves.reduce((sum, m) => sum + (byId.get(m.inId)!.price - byId.get(m.outId)!.price), 0);
  const budgetAfter = team.budgetRemaining - spentDelta;

  const freeUsed = Math.min(moves.length, team.freeTransfers);
  const extraMoves = Math.max(0, moves.length - team.freeTransfers);
  const pointsCost = extraMoves * 4;

  const outPlayer = selectedOut ? byId.get(selectedOut) : null;

  const market = pool
    .filter((p) => !workingSquadIds.includes(p.id))
    .filter((p) => (outPlayer ? p.position === outPlayer.position : posFilter === 'all' || p.position === posFilter))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.form - a.form);

  function clubCount(club: string) {
    return workingSquad.filter((p) => p.club === club).length;
  }

  function pickReplacement(inP: Player) {
    if (!outPlayer) return;
    if (inP.price - outPlayer.price > team.budgetRemaining - spentDelta) {
      setCostWarningFor(inP);
      return;
    }
    if (clubCount(inP.club) >= rules.maxPerClub && inP.club !== outPlayer.club) {
      setCostWarningFor(inP);
      return;
    }
    setMoves((m) => [...m.filter((mv) => mv.outId !== outPlayer.id), { outId: outPlayer.id, inId: inP.id }]);
    setSelectedOut(null);
  }

  function undoMove(outId: string) {
    setMoves((m) => m.filter((mv) => mv.outId !== outId));
  }

  return (
    <div className="transfers">
      <div className="sb-summary-bar">
        <div>
          Transfer players in and out before <strong>{competition.deadline}</strong>.
        </div>
        <div className="sb-budget">
          <Badge tone="purple">{freeUsed}/{team.freeTransfers} free used</Badge>
          <Badge tone={pointsCost > 0 ? 'red' : 'green'}>{pointsCost > 0 ? `-${pointsCost} pts if confirmed` : 'No point cost'}</Badge>
          <Badge tone={budgetAfter < 0 ? 'red' : 'orange'}>Budget {budgetAfter.toFixed(1)}M</Badge>
        </div>
      </div>

      <div className="transfers-layout">
        <div className="transfers-out">
          <h4>Your squad — tap a player to replace them</h4>
          <div className="transfer-list">
            {currentIds.map((id) => {
              const move = moves.find((m) => m.outId === id);
              const outP = byId.get(id)!;
              const inP = move ? byId.get(move.inId) : null;
              return (
                <div className={`transfer-row ${move ? 'changed' : ''}`} key={id}>
                  <button className={`transfer-player ${selectedOut === id ? 'active' : ''}`} onClick={() => setSelectedOut(id)}>
                    <PlayerAvatar player={outP} size={36} />
                    <span>
                      <strong>{outP.name}</strong>
                      <em>{outP.clubShort} · {outP.positionLabel} · {outP.price.toFixed(1)}M</em>
                    </span>
                  </button>
                  {inP && (
                    <div className="transfer-in">
                      <span className="transfer-arrow">→</span>
                      <PlayerAvatar player={inP} size={36} />
                      <span>
                        <strong>{inP.name}</strong>
                        <em>{inP.clubShort} · {inP.price.toFixed(1)}M</em>
                      </span>
                      <button className="chip-clear" onClick={() => undoMove(id)}>
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="sb-actions">
            <button className="btn btn-ghost" onClick={onBack}>
              Back to My Team
            </button>
            <button className="btn btn-primary" disabled={moves.length === 0} onClick={() => setReviewOpen(true)}>
              Review transfers ({moves.length})
            </button>
          </div>
        </div>

        <div className="transfers-in">
          <h4>{outPlayer ? `Replace ${outPlayer.name}` : 'Select a player to replace'}</h4>
          <SearchBar value={search} onChange={setSearch} placeholder="Search replacement…" />
          {!outPlayer && (
            <div className="sb-market-filters">
              <FilterIcon />
              <select value={posFilter} onChange={(e) => setPosFilter(e.target.value as PositionGroup | 'all')}>
                <option value="all">Position: All</option>
                {rules.positionGroups.map((g) => (
                  <option key={g.group} value={g.group}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="market-table">
            <div className="market-row market-head">
              <span>Player</span>
              <span>Price</span>
              <span>Form</span>
              <span />
            </div>
            <div className="market-list">
              {outPlayer &&
                market.map((p) => (
                  <div className="market-row" key={p.id}>
                    <div className="market-player">
                      <PlayerAvatar player={p} size={32} />
                      <span>
                        <strong>{p.name}</strong>
                        <em>{p.clubShort}</em>
                      </span>
                    </div>
                    <span>{p.price.toFixed(1)}</span>
                    <span className={p.form >= 6 ? 'good' : ''}>{p.form.toFixed(1)}</span>
                    <button className="btn btn-add" onClick={() => pickReplacement(p)}>
                      +
                    </button>
                  </div>
                ))}
              {!outPlayer && <div className="market-empty">Choose a player on the left first.</div>}
            </div>
          </div>
        </div>
      </div>

      {costWarningFor && (
        <Modal title="Transfer not possible" onClose={() => setCostWarningFor(null)} footer={<button className="btn btn-primary" onClick={() => setCostWarningFor(null)}>Got it</button>}>
          <p>
            Bringing in <strong>{costWarningFor.name}</strong> breaks your budget or club limit. Choose a cheaper player, or a
            club with fewer of your squad already in it.
          </p>
        </Modal>
      )}

      {reviewOpen && (
        <Modal
          title="Confirm transfers"
          onClose={() => setReviewOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setReviewOpen(false)}>
                Keep editing
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onConfirm(
                    moves.map((m, i) => ({ outId: m.outId, inId: m.inId, pointsCost: i >= team.freeTransfers ? 4 : 0 })),
                    budgetAfter,
                  );
                  setReviewOpen(false);
                }}
              >
                Confirm transfers
              </button>
            </>
          }
        >
          <ul className="sb-review-list">
            {moves.map((m) => (
              <li key={m.outId}>
                <span>
                  {byId.get(m.outId)!.name} → {byId.get(m.inId)!.name}
                </span>
                <strong>{(byId.get(m.inId)!.price - byId.get(m.outId)!.price).toFixed(1)}M</strong>
              </li>
            ))}
          </ul>
          {pointsCost > 0 ? (
            <p className="transfer-cost-warning">
              You're making {extraMoves} transfer{extraMoves > 1 ? 's' : ''} beyond your free allowance — this costs{' '}
              <strong>-{pointsCost} points</strong> next gameweek.
            </p>
          ) : (
            <p>All transfers are within your free allowance — no points lost.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
