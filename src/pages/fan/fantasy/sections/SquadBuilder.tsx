import React, { useMemo, useState } from 'react';
import type { Competition, Player, PositionGroup, SquadSlot } from '../types';
import { rulesFor } from '../data';
import { SearchBar, FilterIcon, Badge, ChevronIcon } from './shared';
import PlayerAvatar from './PlayerAvatar';
import PlayerDrawer from './PlayerDrawer';
import { Modal } from './Modal';

type Step = 'squad' | 'lineup' | 'review';

interface Props {
  competition: Competition;
  players: Player[];
  teamName: string;
  onCancel: () => void;
  onSubmitted: (result: { squad: SquadSlot[]; captainId: string; viceCaptainId: string; teamName: string }) => void;
}

export default function SquadBuilder({ competition, players: pool, teamName: initialTeamName, onCancel, onSubmitted }: Props) {
  const rules = rulesFor(competition);

  const [step, setStep] = useState<Step>('squad');
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState(initialTeamName);

  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PositionGroup | 'all'>('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [activeSlotGroup, setActiveSlotGroup] = useState<PositionGroup | null>(null);
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showInvalid, setShowInvalid] = useState<string | null>(null);

  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const squad = squadIds.map((id) => byId.get(id)!).filter(Boolean);
  const spent = squad.reduce((s, p) => s + p.price, 0);
  const remaining = rules.budget - spent;

  const clubs = useMemo(() => Array.from(new Set(pool.map((p) => p.club))).sort(), [pool]);

  const countInGroup = (group: PositionGroup) => squad.filter((p) => p.position === group).length;
  const clubCount = (club: string) => squad.filter((p) => p.club === club).length;

  const squadComplete = squadIds.length === rules.squadSize && rules.positionGroups.every((g) => countInGroup(g.group) === g.squadCount);

  function canAdd(p: Player): boolean {
    if (squadIds.includes(p.id)) return false;
    if (squadIds.length >= rules.squadSize) return false;
    const group = rules.positionGroups.find((g) => g.group === p.position)!;
    if (countInGroup(p.position) >= group.squadCount) return false;
    if (clubCount(p.club) >= rules.maxPerClub) return false;
    if (p.price > remaining) return false;
    return true;
  }

  // Availability controls whether the + selection button is active.
  // AVAILABLE + Eligible → active; INJURED / SUSPENDED / UNAVAILABLE / Ineligible → inactive;
  // DOUBTFUL → follows the existing Fantasy selection rules (canAdd).
  function canSelect(p: Player): boolean {
    if (p.eligible === false) return false;
    if (p.status === 'injured' || p.status === 'suspended' || p.status === 'unavailable') return false;
    return canAdd(p);
  }

  function addPlayer(p: Player) {
    if (!canAdd(p)) {
      const group = rules.positionGroups.find((g) => g.group === p.position)!;
      if (countInGroup(p.position) >= group.squadCount) setShowInvalid(`You already have ${group.squadCount} ${group.label.toLowerCase()}.`);
      else if (clubCount(p.club) >= rules.maxPerClub) setShowInvalid(`Maximum ${rules.maxPerClub} players from ${p.club}.`);
      else if (p.price > remaining) setShowInvalid(`Not enough budget left — ${remaining.toFixed(1)}M remaining.`);
      return;
    }
    setSquadIds((s) => [...s, p.id]);
  }

  function removePlayer(id: string) {
    setSquadIds((s) => s.filter((x) => x !== id));
    setStarterIds((s) => s.filter((x) => x !== id));
    if (captainId === id) setCaptainId(null);
    if (viceCaptainId === id) setViceCaptainId(null);
  }

  const filteredMarket = pool
    .filter((p) => (activeSlotGroup ? p.position === activeSlotGroup : posFilter === 'all' || p.position === posFilter))
    .filter((p) => clubFilter === 'all' || p.club === clubFilter)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.totalPoints ?? -1) - (a.totalPoints ?? -1));

  // -------------------------------------------------------------- lineup step
  function toggleStarter(id: string) {
    const p = byId.get(id)!;
    const group = rules.positionGroups.find((g) => g.group === p.position)!;
    const startersInGroup = starterIds.filter((x) => byId.get(x)?.position === p.position).length;
    if (starterIds.includes(id)) {
      setStarterIds((s) => s.filter((x) => x !== id));
    } else {
      if (starterIds.length >= rules.startersCount) {
        setShowInvalid(`You can only start with ${rules.startersCount} players.`);
        return;
      }
      if (startersInGroup >= group.starterMax) {
        setShowInvalid(`You can start at most ${group.starterMax} ${group.label.toLowerCase()}.`);
        return;
      }
      setStarterIds((s) => [...s, id]);
    }
  }

  const lineupValid =
    starterIds.length === rules.startersCount &&
    rules.positionGroups.every((g) => {
      const n = starterIds.filter((id) => byId.get(id)?.position === g.group).length;
      return n >= g.starterMin && n <= g.starterMax;
    });

  const benchIds = squadIds.filter((id) => !starterIds.includes(id));

  function handleFinalSubmit() {
    setConfirmSubmit(false);
    // benchIds is already in the visual order the fan set (squad step order).
    // Assign 1-based bench_order so the backend validate_selections() check passes.
    const benchOrderMap = new Map(benchIds.map((id, i) => [id, i + 1]));
    onSubmitted({
      squad: squadIds.map((id) => ({
        playerId: id,
        isStarter: starterIds.includes(id),
        benchOrder: benchOrderMap.get(id),
      })),
      captainId: captainId!,
      viceCaptainId: viceCaptainId ?? '',
      teamName,
    });
  }

  return (
    <div className="squad-builder">
      <div className="sb-steps">
        {(['squad', 'lineup', 'review'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <button
              className={`sb-step ${step === s ? 'active' : ''} ${step !== 'squad' && s === 'squad' ? 'done' : ''}`}
              onClick={() => {
                if (s === 'squad') setStep('squad');
                if (s === 'lineup' && squadComplete) setStep('lineup');
                if (s === 'review' && lineupValid) setStep('review');
              }}
            >
              <span className="sb-step-num">{i + 1}</span>
              {s === 'squad' ? 'Build squad' : s === 'lineup' ? 'Set lineup' : 'Review & submit'}
            </button>
            {i < 2 && <ChevronIcon />}
          </React.Fragment>
        ))}
      </div>

      {step === 'squad' && (
        <div className="sb-layout">
          <div className="sb-pitch-panel">
            <div className="sb-summary-bar">
              <div>
                <strong>{competition.shortName}</strong> · {rules.label} · {rules.squadSize}-player squad
              </div>
              <div className="sb-budget">
                <Badge tone={squadIds.length === rules.squadSize ? 'green' : 'purple'}>
                  {squadIds.length} / {rules.squadSize} selected
                </Badge>
                <Badge tone={remaining < 0 ? 'red' : 'orange'}>Budget {remaining.toFixed(1)}M left</Badge>
              </div>
            </div>

            <div className={`pitch pitch-${rules.pitchStyle}`}>
              {rules.positionGroups.map((g) => (
                <div className="pitch-row" key={g.group}>
                  <div className="pitch-row-label">{g.label}</div>
                  <div className="pitch-slots">
                    {Array.from({ length: g.squadCount }).map((_, i) => {
                      const inGroup = squad.filter((p) => p.position === g.group);
                      const p = inGroup[i];
                      if (p) {
                        return (
                          <button className="pitch-slot filled" key={p.id} onClick={() => setViewPlayer(p)}>
                            <PlayerAvatar player={p} size={48} />
                            <span className="pitch-slot-name">{p.name.split(' ').slice(-1)[0]}</span>
                            <span className="pitch-slot-price">{p.price.toFixed(1)}M</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          className={`pitch-slot empty ${activeSlotGroup === g.group ? 'targeted' : ''}`}
                          key={`${g.group}-${i}`}
                          onClick={() => setActiveSlotGroup(g.group)}
                        >
                          <span className="pitch-slot-plus">+</span>
                          <span className="pitch-slot-name">{g.label.replace(/s$/, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!squadComplete && (
              <p className="sb-hint">
                {squadIds.length < rules.squadSize
                  ? `${rules.squadSize - squadIds.length} places still required.`
                  : 'Squad set is full — check every position group is complete.'}
              </p>
            )}

            <div className="sb-actions">
              <button className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!squadComplete} onClick={() => setStep('lineup')}>
                Continue to lineup
              </button>
            </div>
          </div>

          <div className="sb-market-panel">
            <h4>Player Market</h4>
            <SearchBar value={search} onChange={setSearch} placeholder="Search players or clubs…" />
            <div className="sb-market-filters">
              <FilterIcon />
              <select value={activeSlotGroup ?? posFilter} onChange={(e) => { setActiveSlotGroup(null); setPosFilter(e.target.value as PositionGroup | 'all'); }}>
                <option value="all">Position: All</option>
                {rules.positionGroups.map((g) => (
                  <option key={g.group} value={g.group}>
                    {g.label}
                  </option>
                ))}
              </select>
              <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}>
                <option value="all">Club: All</option>
                {clubs.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {activeSlotGroup && (
                <button className="chip-clear" onClick={() => setActiveSlotGroup(null)}>
                  Clear position filter ✕
                </button>
              )}
            </div>

            <div className="market-table">
              <div className="market-row market-head">
                <span>Player</span>
                <span>Price</span>
                <span>Form Pts</span>
                <span>Action</span>
              </div>
              <div className="market-list">
                {filteredMarket.map((p) => (
                  <div className="market-row" key={p.id}>
                    <button className="market-player" onClick={() => setViewPlayer(p)}>
                      <PlayerAvatar player={p} size={32} />
                      <span>
                        <strong>{p.name}</strong>
                        <em>
                          {p.clubShort} · {p.positionLabel}
                        </em>
                      </span>
                    </button>
                    <span>{p.price.toFixed(1)}</span>
                    <span className={p.form !== null && p.form >= 6 ? 'good' : ''}>{p.form === null ? 'No data' : p.form.toFixed(1)}</span>
                    <button className="btn btn-add" disabled={!canSelect(p)} onClick={() => addPlayer(p)}>
                      +
                    </button>
                  </div>
                ))}
                {filteredMarket.length === 0 && <div className="market-empty">No players match your search.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'lineup' && (
        <div className="sb-lineup">
          <div className="sb-summary-bar">
            <div>
              Set your starting {rules.startersCount} by clicking on the player and bench the rest ({squadIds.length - rules.startersCount} players).
            </div>
            <Badge tone={lineupValid ? 'green' : 'purple'}>
              {starterIds.length} / {rules.startersCount} starting
            </Badge>
          </div>
          <div className={`pitch pitch-${rules.pitchStyle}`}>
            {rules.positionGroups.map((g) => (
              <div className="pitch-row" key={g.group}>
                <div className="pitch-row-label">{g.label}</div>
                <div className="pitch-slots">
                  {squad
                    .filter((p) => p.position === g.group)
                    .map((p) => (
                      <button
                        key={p.id}
                        className={`pitch-slot filled ${starterIds.includes(p.id) ? 'starting' : 'benched'}`}
                        onClick={() => toggleStarter(p.id)}
                      >
                        <PlayerAvatar player={p} size={48} />
                        <span className="pitch-slot-name">{p.name.split(' ').slice(-1)[0]}</span>
                        <span className="pitch-slot-tag">{starterIds.includes(p.id) ? 'Starting' : 'Bench'}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="sb-bench-strip">
            <h5>Bench order</h5>
            <div className="bench-row">
              {benchIds.map((id, i) => {
                const p = byId.get(id)!;
                return (
                  <div className="bench-chip" key={id}>
                    <span className="bench-num">{i + 1}</span>
                    <PlayerAvatar player={p} size={28} />
                    {p.name.split(' ').slice(-1)[0]}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="sb-actions">
            <button className="btn btn-ghost" onClick={() => setStep('squad')}>
              Back to squad
            </button>
            <button className="btn btn-primary" disabled={!lineupValid} onClick={() => setStep('review')}>
              Continue to captain &amp; review
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="sb-review">
          <div className="sb-review-grid">
            <div>
              <h4>Team name</h4>
              <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={30} placeholder="Enter your Team name" />

              <h4>{rules.multiplierLabel}</h4>
              <p className="sb-hint">Points are doubled for your {rules.multiplierLabel.toLowerCase()} this gameweek.</p>
              <div className="captain-list">
                {starterIds.map((id) => {
                  const p = byId.get(id)!;
                  return (
                    <button
                      key={id}
                      className={`captain-row ${captainId === id ? 'is-captain' : ''}`}
                      onClick={() => setCaptainId(id)}
                    >
                      <PlayerAvatar player={p} size={32} />
                      <span>{p.name}</span>
                      {captainId === id && <span className="captain-c">C</span>}
                    </button>
                  );
                })}
              </div>

              <h4>Vice-captain</h4>
              <select className="input" value={viceCaptainId ?? ''} onChange={(e) => setViceCaptainId(e.target.value)}>
                <option value="">Select a vice-captain…</option>
                {starterIds
                  .filter((id) => id !== captainId)
                  .map((id) => (
                    <option key={id} value={id}>
                      {byId.get(id)!.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <h4>Squad summary</h4>
              <ul className="sb-review-list">
                <li>
                  <span>Budget spent</span>
                  <strong>{spent.toFixed(1)}M / {rules.budget.toFixed(1)}M</strong>
                </li>
                <li>
                  <span>Squad</span>
                  <strong>{squadIds.length} players</strong>
                </li>
                <li>
                  <span>Starting {rules.label === 'Football' ? 'XI' : 'lineup'}</span>
                  <strong>{starterIds.length} players</strong>
                </li>
                <li>
                  <span>Clubs represented</span>
                  <strong>{new Set(squad.map((p) => p.club)).size}</strong>
                </li>
                <li>
                  <span>Deadline</span>
                  <strong>{competition.deadline}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div className="sb-actions">
            <button className="btn btn-ghost" onClick={() => setStep('lineup')}>
              Back to lineup
            </button>
            <button
              className="btn btn-primary"
              disabled={!captainId || !teamName.trim()}
              onClick={() => setConfirmSubmit(true)}
            >
              Submit team
            </button>
          </div>
        </div>
      )}

      {viewPlayer && (
        <PlayerDrawer
          player={viewPlayer}
          onClose={() => setViewPlayer(null)}
          inSquad={squadIds.includes(viewPlayer.id)}
          canAdd={canAdd(viewPlayer)}
          onAdd={() => {
            addPlayer(viewPlayer);
            setViewPlayer(null);
          }}
          onRemove={() => {
            removePlayer(viewPlayer.id);
            setViewPlayer(null);
          }}
        />
      )}

      {showInvalid && (
        <Modal title="Invalid squad move" tone="danger" onClose={() => setShowInvalid(null)} footer={<button className="btn btn-primary" onClick={() => setShowInvalid(null)}>Got it</button>}>
          <p>{showInvalid}</p>
        </Modal>
      )}

      {confirmSubmit && (
        <Modal
          title="Submit team?"
          onClose={() => setConfirmSubmit(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmSubmit(false)}>
                Keep editing
              </button>
              <button className="btn btn-primary" onClick={handleFinalSubmit}>
                Confirm &amp; submit
              </button>
            </>
          }
        >
          <p>
            "{teamName}" will enter <strong>{competition.shortName}</strong> from Gameweek {competition.currentGameweek}. You
            can still make changes until the deadline: <strong>{competition.deadline}</strong>.
          </p>
        </Modal>
      )}
    </div>
  );
}
