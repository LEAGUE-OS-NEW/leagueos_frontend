import React, { useState } from 'react';
import type { Sport } from '../FantasyCompetitions';

/**
 * NOTE: This modal only collects league configuration form data.
 * The actual league creation (ID, invite code generation, invite link)
 * is handled by `handleCreateLeague` in FantasyCompetitions.tsx,
 * which is the single source of truth. This keeps the invite-code
 * format consistent (XXX-XXXX) and avoids duplicate generation logic.
 */

export interface NewLeagueDetails {
  name: string;
  sport: Sport;
  isPrivate: boolean;
  maxManagers: number;
  seasonLength: number;
  entryFee?: string;
}

interface CreateLeagueModalProps {
  sport: Sport;
  sportLabel: string;
  onClose: () => void;
  onCreate: (league: NewLeagueDetails) => void;
}

const CreateLeagueModal: React.FC<CreateLeagueModalProps> = ({ sport, sportLabel, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxManagers, setMaxManagers] = useState(20);
  const [seasonLength, setSeasonLength] = useState(30);
  const [entryFee, setEntryFee] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('League name must be at least 3 characters.');
      return;
    }
    setError('');
    onCreate({
      name: name.trim(),
      sport,
      isPrivate,
      maxManagers,
      seasonLength,
      entryFee: entryFee.trim() || undefined,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create a league">
      <div className="modal-panel">
        <form onSubmit={handleSubmit}>
          <div className="modal-panel__header">
            <h3>Create a {sportLabel} league</h3>
            <button type="button" className="modal-panel__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <label htmlFor="league-name">League name</label>
          <input
            id="league-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kampala Friends League"
            maxLength={48}
          />

          <div className="modal-panel__row">
            <div>
              <label htmlFor="league-visibility">Visibility</label>
              <select
                id="league-visibility"
                value={isPrivate ? 'private' : 'public'}
                onChange={(e) => setIsPrivate(e.target.value === 'private')}
              >
                <option value="private">Private (invite only)</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label htmlFor="league-max">Max managers</label>
              <input
                id="league-max"
                type="number"
                min={2}
                max={5000}
                value={maxManagers}
                onChange={(e) => setMaxManagers(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="modal-panel__row">
            <div>
              <label htmlFor="league-length">Season length (gameweeks)</label>
              <input
                id="league-length"
                type="number"
                min={1}
                max={52}
                value={seasonLength}
                onChange={(e) => setSeasonLength(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="league-fee">Entry fee (optional)</label>
              <input
                id="league-fee"
                type="text"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="e.g. UGX 10,000"
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-panel__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Create league
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeagueModal;