import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiPlus } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  addFantasyPlayer,
  createFantasyLeague,
  fetchFantasyLeagues,
  fetchFantasyPlayers,
  POSITIONS_BY_SPORT,
  type Competition,
  type Player,
  type Sport,
} from '../../../services/fantasyAdminService';
import './FantasyAdminPage.css';

const SPORTS: Sport[] = ['football', 'rugby', 'basketball'];
const SPORT_LABEL: Record<Sport, string> = { football: 'Football', rugby: 'Rugby', basketball: 'Basketball' };
const STATUS_OPTIONS: Player['status'][] = ['available', 'injured', 'suspended', 'doubtful'];

function AddPlayerModal({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: {
    sport: Sport;
    name: string;
    club: string;
    position: string;
    price: number;
    expectedPoints: number;
    status: Player['status'];
    number?: number;
  }) => Promise<void>;
}) {
  const [sport, setSport] = useState<Sport>('football');
  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [position, setPosition] = useState(POSITIONS_BY_SPORT.football[0]);
  const [price, setPrice] = useState('');
  const [expectedPoints, setExpectedPoints] = useState('');
  const [status, setStatus] = useState<Player['status']>('available');
  const [number, setNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSportChange = (nextSport: Sport) => {
    setSport(nextSport);
    setPosition(POSITIONS_BY_SPORT[nextSport][0]);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        sport,
        name,
        club,
        position,
        price: Number(price),
        expectedPoints: Number(expectedPoints),
        status,
        number: number.trim() ? Number(number) : undefined,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not add this player.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fa-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="fa-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Add Player</h3>
        {error && (
          <div className="fa-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <label className="fa-field">
          <span>Sport</span>
          <select value={sport} onChange={(event) => handleSportChange(event.target.value as Sport)}>
            {SPORTS.map((option) => (
              <option key={option} value={option}>
                {SPORT_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="fa-field">
          <span>Name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Player name" />
        </label>
        <label className="fa-field">
          <span>Club</span>
          <input
            type="text"
            value={club}
            onChange={(event) => setClub(event.target.value)}
            placeholder="Club name — including clubs not yet on the platform"
          />
        </label>
        <label className="fa-field">
          <span>Position</span>
          <select value={position} onChange={(event) => setPosition(event.target.value)}>
            {POSITIONS_BY_SPORT[sport].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="fa-field">
          <span>Price</span>
          <input type="number" min="0" step="0.1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 7.5" />
        </label>
        <label className="fa-field">
          <span>Expected Points</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={expectedPoints}
            onChange={(event) => setExpectedPoints(event.target.value)}
            placeholder="e.g. 6.5"
          />
        </label>
        <label className="fa-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as Player['status'])}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="fa-field">
          <span>Jersey Number (optional)</span>
          <input type="number" min="0" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="e.g. 9" />
        </label>
        <div className="fa-modal__footer">
          <button type="button" className="fa-btn fa-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="fa-btn fa-btn--gradient" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? 'Adding…' : 'Add Player'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateLeagueModal({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: {
    sport: Sport;
    name: string;
    entryType: Competition['entryType'];
    prizePool: string;
    gameweek: string;
    rulesSummary: string;
  }) => Promise<void>;
}) {
  const [sport, setSport] = useState<Sport>('football');
  const [name, setName] = useState('');
  const [entryType, setEntryType] = useState<Competition['entryType']>('public');
  const [prizePool, setPrizePool] = useState('');
  const [gameweek, setGameweek] = useState('');
  const [rulesSummary, setRulesSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({ sport, name, entryType, prizePool, gameweek, rulesSummary });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create this league.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fa-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="fa-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Create League</h3>
        {error && (
          <div className="fa-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <label className="fa-field">
          <span>Sport</span>
          <select value={sport} onChange={(event) => setSport(event.target.value as Sport)}>
            {SPORTS.map((option) => (
              <option key={option} value={option}>
                {SPORT_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="fa-field">
          <span>League Name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Uganda Fantasy Premier" />
        </label>
        <label className="fa-field">
          <span>Entry Type</span>
          <select value={entryType} onChange={(event) => setEntryType(event.target.value as Competition['entryType'])}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label className="fa-field">
          <span>Prize Pool</span>
          <input type="text" value={prizePool} onChange={(event) => setPrizePool(event.target.value)} placeholder="e.g. UGX 5,000,000" />
        </label>
        <label className="fa-field">
          <span>Gameweek / Round Label</span>
          <input type="text" value={gameweek} onChange={(event) => setGameweek(event.target.value)} placeholder="e.g. Gameweek 3 · Live" />
        </label>
        <label className="fa-field">
          <span>Rules Summary</span>
          <input
            type="text"
            value={rulesSummary}
            onChange={(event) => setRulesSummary(event.target.value)}
            placeholder="e.g. 8-player squads, captain scores 2x."
          />
        </label>
        <div className="fa-modal__footer">
          <button type="button" className="fa-btn fa-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="fa-btn fa-btn--gradient" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? 'Creating…' : 'Create League'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FantasyAdminPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagues, setLeagues] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showCreateLeague, setShowCreateLeague] = useState(false);

  const loadAll = () => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([fetchFantasyPlayers(), fetchFantasyLeagues()])
      .then(([playersResult, leaguesResult]) => {
        setPlayers(playersResult);
        setLeagues(leaguesResult);
      })
      .catch(() => setLoadError('Could not load fantasy data. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFantasyPlayers(), fetchFantasyLeagues()])
      .then(([playersResult, leaguesResult]) => {
        if (cancelled) return;
        setPlayers(playersResult);
        setLeagues(leaguesResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load fantasy data. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddPlayer = async (input: Parameters<typeof addFantasyPlayer>[0]) => {
    const created = await addFantasyPlayer(input);
    setPlayers((current) => [created, ...current]);
    setShowAddPlayer(false);
  };

  const handleCreateLeague = async (input: Parameters<typeof createFantasyLeague>[0]) => {
    const created = await createFantasyLeague(input);
    setLeagues((current) => [created, ...current]);
    setShowCreateLeague(false);
  };

  return (
    <AdminLayout>
      <div className="fa-root">
        <div className="fa-head">
          <div>
            <p className="fa-eyebrow">Fantasy</p>
            <h1>Fantasy</h1>
            <p>
              Add players for club rosters that are incomplete, or clubs not yet on the platform, and create official
              fantasy leagues — so fans always have a full pool to draft from.
            </p>
          </div>
          <div className="fa-head__actions">
            <button type="button" className="fa-btn fa-btn--outline" onClick={() => setShowAddPlayer(true)}>
              <FiPlus /> Add Player
            </button>
            <button type="button" className="fa-btn fa-btn--gradient" onClick={() => setShowCreateLeague(true)}>
              <FiPlus /> Create League
            </button>
          </div>
        </div>

        {loadError && (
          <div className="fa-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="fa-btn fa-btn--outline fa-btn--sm" onClick={loadAll}>
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="fa-loading">
            <FiActivity aria-hidden="true" className="fa-loading__icon" />
            Loading fantasy data…
          </div>
        ) : (
          <>
            <div className="fa-panel">
              <h2>Players</h2>
              <div className="fa-table-scroll">
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sport</th>
                      <th>Club</th>
                      <th>Position</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr key={player.id}>
                        <td>{player.name}</td>
                        <td>{SPORT_LABEL[player.sport]}</td>
                        <td>{player.club}</td>
                        <td>{player.position}</td>
                        <td>{player.price.toFixed(1)}</td>
                        <td>
                          <span className={`fa-status-pill fa-status-pill--${player.status}`}>{player.status}</span>
                        </td>
                      </tr>
                    ))}
                    {players.length === 0 && (
                      <tr>
                        <td colSpan={6} className="fa-table__empty">
                          No fantasy players yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="fa-panel">
              <h2>Leagues</h2>
              <div className="fa-table-scroll">
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sport</th>
                      <th>Entry Type</th>
                      <th>Managers</th>
                      <th>Prize Pool</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagues.map((league) => (
                      <tr key={league.id}>
                        <td>{league.name}</td>
                        <td>{SPORT_LABEL[league.sport]}</td>
                        <td>{league.entryType === 'public' ? 'Public' : 'Private'}</td>
                        <td>{league.managers.toLocaleString('en-US')}</td>
                        <td>{league.prizePool}</td>
                      </tr>
                    ))}
                    {leagues.length === 0 && (
                      <tr>
                        <td colSpan={5} className="fa-table__empty">
                          No fantasy leagues yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddPlayer && <AddPlayerModal onCancel={() => setShowAddPlayer(false)} onCreate={handleAddPlayer} />}
      {showCreateLeague && <CreateLeagueModal onCancel={() => setShowCreateLeague(false)} onCreate={handleCreateLeague} />}
    </AdminLayout>
  );
}

export default FantasyAdminPage;
