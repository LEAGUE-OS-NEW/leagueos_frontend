import { useState } from 'react';
import type { Competition, FantasyTeam, SquadSlot, Toast } from './types';
import { SPORT_RULES } from './data';
import FantasyHub from './sections/FantasyHub';
import CompetitionDetail from './sections/CompetitionDetail';
import SquadBuilder from './sections/SquadBuilder';
import MyTeam from './sections/MyTeam';
import Transfers from './sections/Transfers';
import Leagues from './sections/Leagues';
import { BellIcon, TrophyIcon} from './sections/shared';
import Sidebar from '../../../components/fan/Sidebar';
import Footer from '../../../components/landing/Footer';
import { SPORT_META } from './SportMeta';
import './FantasyCompetitions.css';

type Screen = 'hub' | 'competition' | 'build' | 'team' | 'transfers' | 'leagues';

const MANAGER_NAME = 'Happy Fan';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hub');
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [teams, setTeams] = useState<Record<string, FantasyTeam>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function pushToast(message: string, tone: Toast['tone'] = 'success') {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }

  function goHub() {
    setScreen('hub');
    setActiveCompetition(null);
  }

  function openCompetition(c: Competition) {
    setActiveCompetition(c);
    setScreen('competition');
  }

  function manageTeam(c: Competition) {
    setActiveCompetition(c);
    setScreen('team');
  }

  function startBuild(c: Competition) {
    setActiveCompetition(c);
    setScreen('build');
  }

  function handleSubmitted(
    competition: Competition,
    result: { squad: SquadSlot[]; captainId: string; viceCaptainId: string; teamName: string },
  ) {
    const rules = SPORT_RULES[competition.sport];
    setTeams((prev) => ({
      ...prev,
      [competition.id]: {
        competitionId: competition.id,
        teamName: result.teamName,
        managerName: MANAGER_NAME,
        budgetRemaining: rules.budget - 0, // recalculated lazily by screens that need it
        squad: result.squad,
        captainId: result.captainId,
        viceCaptainId: result.viceCaptainId || null,
        freeTransfers: 1,
        totalPoints: 0,
        gwPoints: 0,
        overallRank: null,
        submitted: true,
      },
    }));
    pushToast(`${result.teamName} entered ${competition.shortName}. Good luck this gameweek!`);
    setScreen('team');
  }

  function handleTransfersConfirmed(
    competition: Competition,
    moves: { outId: string; inId: string; pointsCost: number }[],
    newBudget: number,
  ) {
    setTeams((prev) => {
      const team = prev[competition.id];
      if (!team) return prev;
      let squad = team.squad;
      moves.forEach((m) => {
        squad = squad.map((s) => (s.playerId === m.outId ? { ...s, playerId: m.inId } : s));
      });
      const totalCost = moves.reduce((s, m) => s + m.pointsCost, 0);
      return {
        ...prev,
        [competition.id]: {
          ...team,
          squad,
          budgetRemaining: newBudget,
          freeTransfers: Math.max(0, team.freeTransfers - moves.length),
          totalPoints: Math.max(0, team.totalPoints - totalCost),
        },
      };
    });
    pushToast(`${moves.length} transfer${moves.length > 1 ? 's' : ''} confirmed.`, 'success');
    setScreen('team');
  }

  const activeTeam = activeCompetition ? teams[activeCompetition.id] : undefined;
  const teamCount = Object.keys(teams).length;

  return (
    <div className="app-shell">
        <Sidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
<div className="fantasy-content">
      <header className="topbar">
        
        <nav className="topnav">
          <button className={screen === 'hub' ? 'active' : ''} onClick={goHub}>
            Fantasy Hub
          </button>
          <button
            className={screen === 'team' ? 'active' : ''}
            disabled={!activeTeam}
            onClick={() => activeCompetition && setScreen('team')}
          >
            My Team
          </button>
          <button
            className={screen === 'transfers' ? 'active' : ''}
            disabled={!activeTeam}
            onClick={() => activeCompetition && setScreen('transfers')}
          >
            Transfers
          </button>
          <button
            className={screen === 'leagues' ? 'active' : ''}
            disabled={!activeTeam}
            onClick={() => activeCompetition && setScreen('leagues')}
          >
            Leagues
          </button>
        </nav>
        <div className="topbar-right">
          <button className="icon-btn" aria-label="Notifications">
            <BellIcon />
          </button>
          <div className="user-chip">
            <TrophyIcon size={14} />
            {MANAGER_NAME}
          </div>
        </div>
      </header>

      <main className="app-main">
        {screen === 'hub' && (
          <FantasyHub teams={teams} onOpenCompetition={openCompetition} onManageTeam={manageTeam} />
        )}

        {screen === 'competition' && activeCompetition && (
          <CompetitionDetail
            competition={activeCompetition}
            hasTeam={!!activeTeam}
            onBack={goHub}
            onCreateTeam={() => startBuild(activeCompetition)}
            onManageTeam={() => setScreen('team')}
          />
        )}

        {screen === 'build' && activeCompetition && (
          <SquadBuilder
            competition={activeCompetition}
            teamName={`${MANAGER_NAME.split(' ')[0]}'s ${SPORT_META[activeCompetition.sport].label} XI`}
            onCancel={() => setScreen('competition')}
            onSubmitted={(result) => handleSubmitted(activeCompetition, result)}
          />
        )}

        {screen === 'team' && activeCompetition && activeTeam && (
          <MyTeam
            competition={activeCompetition}
            team={activeTeam}
            onGoTransfers={() => setScreen('transfers')}
            onSwapLineup={(starterId, benchId) => {
              setTeams((prev) => {
                const t = prev[activeCompetition.id];
                if (!t) return prev;
                const squad = t.squad.map((s) => {
                  if (s.playerId === starterId) return { ...s, isStarter: false };
                  if (s.playerId === benchId)   return { ...s, isStarter: true };
                  return s;
                });
                return { ...prev, [activeCompetition.id]: { ...t, squad } };
              });
            }}
          />
        )}

        {screen === 'transfers' && activeCompetition && activeTeam && (
          <Transfers
            competition={activeCompetition}
            team={activeTeam}
            onBack={() => setScreen('team')}
            onConfirm={(moves, budget) => handleTransfersConfirmed(activeCompetition, moves, budget)}
          />
        )}

        {screen === 'leagues' && activeCompetition && activeTeam && (
          <Leagues competition={activeCompetition} team={activeTeam} />
        )}

        {(screen === 'team' || screen === 'transfers' || screen === 'leagues') && (!activeCompetition || !activeTeam) && (
          <div className="empty-state">
            <h3>No team selected</h3>
            <p>Head back to the Fantasy Hub and create or open a team first.</p>
            <button className="btn btn-primary" onClick={goHub}>
              Go to Fantasy Hub
            </button>
          </div>
        )}
      </main>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast toast-${t.tone}`} key={t.id}>
            {t.message}
          </div>
        ))}
      </div>

      <footer className="app-footer">
        <span>League OS Fantasy · {teamCount} active team{teamCount === 1 ? '' : 's'}</span>
        <span>Football · Basketball · Rugby 15s</span>
      </footer>

     
    </div>
    </div>
  );
}
