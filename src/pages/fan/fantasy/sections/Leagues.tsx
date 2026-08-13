import { useMemo, useState } from 'react';
import type { Competition, FantasyTeam, MiniLeague } from '../types';
import { Badge } from './shared';
import { Modal, Drawer } from './Modal';

interface Props {
  competition: Competition;
  team: FantasyTeam;
}

const MANAGER_TEAMS = [
  'Kampala Chargers', 'Budo Strikers', 'Purple XV', 'Hill Hoopers', 'Legends United', 'The Captains',
  'Nile Warriors', 'Mengo Marauders', 'Namuwongo Ballers', 'Kololo Kings', 'Entebbe Eagles', 'Jinja Jaguars',
  'Mbale Mavericks', 'Gulu Gunners', 'Fort Portal Falcons', 'Arua Aces', 'Masaka Magic', 'Mukono Monarchs',
];
const MANAGERS = [
  'Sarah N.', 'Mark M.', 'Linda A.', 'James O.', 'Peter K.', 'Grace T.', 'Brian S.', 'Diana K.', 'Felix R.',
  'Betty L.', 'Ronald B.', 'Alice M.', 'Kevin W.', 'Joan N.', 'Steven K.', 'Winnie A.',
];

function seededStandings(seed: number, you: { teamName: string; totalPoints: number }, count = 10) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const rows = Array.from({ length: count }).map((_, i) => ({
    manager: MANAGERS[(seed + i) % MANAGERS.length],
    teamName: MANAGER_TEAMS[(seed + i * 3) % MANAGER_TEAMS.length],
    totalPoints: Math.round(you.totalPoints + (rnd() - 0.5) * 120),
    gwPoints: Math.round(30 + rnd() * 60),
  }));
  rows.push({ manager: 'You', teamName: you.teamName, totalPoints: you.totalPoints, gwPoints: Math.round(40 + rnd() * 50) });
  rows.sort((a, b) => b.totalPoints - a.totalPoints);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export default function Leagues({ competition, team }: Props) {
  const [tab, setTab] = useState<'mine' | 'overall'>('mine');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinedCode, setJoinedCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<MiniLeague[]>([]);
  const [openLeague, setOpenLeague] = useState<MiniLeague | null>(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [createdLeague, setCreatedLeague] = useState<MiniLeague | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const overall = useMemo(
    () => seededStandings(41, { teamName: team.teamName, totalPoints: team.totalPoints }, 12),
    [team.teamName, team.totalPoints],
  );

  function createLeague() {
    if (!newLeagueName.trim()) return;
    const league: MiniLeague = {
      id: `league-${Date.now()}`,
      name: newLeagueName.trim(),
      type: 'private',
      sport: competition.sport,
      memberCount: 1,
      code: newLeagueName.trim().slice(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
      yourRank: 1,
      standings: [{ rank: 1, manager: 'You', teamName: team.teamName, totalPoints: team.totalPoints, gwPoints: 0 }],
    };
    setLeagues((l) => [...l, league]);
    setCreateOpen(false);
    setNewLeagueName('');
    setCreatedLeague(league);
  }

  function joinLeague() {
    if (!joinedCode.trim()) {
      setJoinError('Enter an invite code to continue.');
      return;
    }
    const match = leagues.find((l) => l.code === joinedCode.trim().toUpperCase());
    if (match) {
      setJoinError('You are already a member of this league.');
      return;
    }
    setJoinError('Invite code not recognised. Double-check with your league owner.');
  }

  function shareCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }).catch(() => {
      // Fallback: show code in a prompt so user can copy manually
      window.prompt('Copy your invite code:', code);
    });
  }

  function leaveLeague() {
    if (!openLeague) return;
    setLeagues((l) => l.filter((x) => x.id !== openLeague.id));
    setLeaveConfirmOpen(false);
    setOpenLeague(null);
  }

  return (
    <div className="leagues">
      <div className="leagues-tabs">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My Leagues
        </button>
        <button className={tab === 'overall' ? 'active' : ''} onClick={() => setTab('overall')}>
          Overall Leaderboard
        </button>
      </div>

      {tab === 'mine' && (
        <div className="leagues-mine">
          <div className="sb-summary-bar">
            <div>Compete with friends, clubs and the wider League OS community.</div>
            <div className="sb-actions" style={{ margin: 0 }}>
              <button className="btn btn-secondary" onClick={() => setJoinOpen(true)}>
                Join league
              </button>
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                Create league
              </button>
            </div>
          </div>

          <div className="league-card-list">
            {leagues.map((l) => (
              <button className="league-card" key={l.id} onClick={() => setOpenLeague(l)}>
                <div>
                  <strong>{l.name}</strong>
                  <span>
                    {l.type === 'private' ? 'Private league' : 'Public league'} · {l.memberCount} member{l.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <Badge tone="purple">Your rank #{l.yourRank}</Badge>
              </button>
            ))}
            {leagues.length === 0 && (
              <div className="empty-state">
                <h3>No leagues yet</h3>
                <p>Create a private league to compete with friends, or join one with an invite code.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'overall' && (
        <div className="leaderboard">
          <h3>{competition.shortName} — Overall Leaderboard</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Manager</th>
                <th>Team</th>
                <th>GW</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {overall.map((r) => (
                <tr key={r.rank} className={r.manager === 'You' ? 'you' : ''}>
                  <td>{r.rank}</td>
                  <td>{r.manager}</td>
                  <td>{r.teamName}</td>
                  <td>{r.gwPoints}</td>
                  <td>{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* League detail drawer */}
      {openLeague && (
        <Drawer
          title={openLeague.name}
          subtitle={`${openLeague.type === 'private' ? 'Private league' : 'Public league'} · ${openLeague.memberCount} member${openLeague.memberCount !== 1 ? 's' : ''}${openLeague.code ? ` · code ${openLeague.code}` : ''}`}
          onClose={() => setOpenLeague(null)}
        >
          <table className="standings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Manager</th>
                <th>Team</th>
                <th>GW</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {openLeague.standings.map((r) => (
                <tr key={r.rank} className={r.manager === 'You' ? 'you' : ''}>
                  <td>{r.rank}</td>
                  <td>{r.manager}</td>
                  <td>{r.teamName}</td>
                  <td>{r.gwPoints}</td>
                  <td>{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {openLeague.code && (
            <div className="league-invite-block">
              <p className="league-invite-label">Invite code</p>
              <div className="invite-code">{openLeague.code}</div>
            </div>
          )}

          <div className="drawer-actions">
            {openLeague.code && (
              <button
                className={`btn btn-ghost ${copiedCode === openLeague.code ? 'btn-copied' : ''}`}
                onClick={() => shareCode(openLeague.code!)}
              >
                {copiedCode === openLeague.code ? '✓ Copied!' : 'Share invite code'}
              </button>
            )}
            <button className="btn btn-danger-ghost" onClick={() => setLeaveConfirmOpen(true)}>
              Leave league
            </button>
          </div>
        </Drawer>
      )}

      {/* Leave league confirmation */}
      {leaveConfirmOpen && openLeague && (
        <Modal
          title="Leave league?"
          tone="danger"
          onClose={() => setLeaveConfirmOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setLeaveConfirmOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger-ghost" onClick={leaveLeague}>
                Yes, leave
              </button>
            </>
          }
        >
          <p>You will be removed from <strong>{openLeague.name}</strong>. You can rejoin later with the invite code.</p>
        </Modal>
      )}

      {/* Create league modal */}
      {createOpen && (
        <Modal
          title="Create a private league"
          onClose={() => { setCreateOpen(false); setNewLeagueName(''); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setCreateOpen(false); setNewLeagueName(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!newLeagueName.trim()} onClick={createLeague}>
                Create league
              </button>
            </>
          }
        >
          <label className="field-label">League name</label>
          <input
            className="input"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="e.g. Kampala Office League"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && createLeague()}
          />
          <p className="rules-note">Starts from Gameweek {competition.currentGameweek} in {competition.shortName}. Invite friends with a code once created.</p>
        </Modal>
      )}

      {/* Join league modal */}
      {joinOpen && (
        <Modal
          title="Join a private league"
          onClose={() => { setJoinOpen(false); setJoinError(null); setJoinedCode(''); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setJoinOpen(false); setJoinError(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={joinLeague}>
                Join
              </button>
            </>
          }
        >
          <label className="field-label">Invite code</label>
          <input
            className="input"
            value={joinedCode}
            onChange={(e) => { setJoinedCode(e.target.value); setJoinError(null); }}
            placeholder="e.g. KAMP-4821"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && joinLeague()}
          />
          {joinError && <p className="transfer-cost-warning">{joinError}</p>}
        </Modal>
      )}

      {/* League created confirmation */}
      {createdLeague && (
        <Modal
          title="League created"
          onClose={() => setCreatedLeague(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setCreatedLeague(null)}>
              Done
            </button>
          }
        >
          <div className="league-created-body">
            <p><strong>{createdLeague.name}</strong> is ready. Share this code with friends so they can join:</p>
            <div className="invite-code">{createdLeague.code}</div>
            <button
              className={`btn btn-secondary league-copy-btn ${copiedCode === createdLeague.code ? 'btn-copied' : ''}`}
              onClick={() => shareCode(createdLeague.code!)}
            >
              {copiedCode === createdLeague.code ? '✓ Copied to clipboard!' : 'Copy invite code'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
