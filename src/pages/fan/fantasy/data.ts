import type { FantasyCompetition, FantasyPlayer, FantasyTeam as ApiTeam, FantasyTeamScore } from '../../../services/fantasyService';
import type { Competition, FantasyTeam, Player, PositionGroup, SportRules } from './types';

const labels: Record<string,string> = { GK:'Goalkeepers',DEF:'Defenders',MID:'Midfielders',FWD:'Forwards',PG:'Point Guards',SG:'Shooting Guards',SF:'Small Forwards',PF:'Power Forwards',C:'Centres',FR:'Front Row',LK:'Locks',BR:'Back Row',HB:'Half Backs',CT:'Centres',B3:'Back Three' };

export function competitionFromApi(row:FantasyCompetition):Competition {
  const gw=row.current_gameweek;
  return { id:row.id,sport:row.sport,name:row.name,shortName:row.name,season:row.season_name,currentGameweek:gw?.number??0,totalGameweeks:row.total_gameweeks,entries:row.entries,status:!row.enabled?'draft':row.registration_state==='OPEN'?'active':'upcoming',deadline:gw?.deadline_at?new Date(gw.deadline_at).toLocaleString():'Schedule pending',deadlineISO:gw?.deadline_at??'',description:row.description,api:row };
}

export function playerFromApi(row:FantasyPlayer,sport:Competition['sport']):Player {
  const status=row.status==='available'?'ready':row.status;
  return {id:row.id,name:row.name,club:row.club||'Unattached',clubShort:(row.club||'—').slice(0,4).toUpperCase(),clubColor:'#6c5ce7',photo:row.image??undefined,sport,position:row.position as PositionGroup,positionLabel:labels[row.position]??row.position,price:Number(row.price),form:row.form,totalPoints:row.total_points,gwPoints:row.current_gameweek_points,ownership:row.ownership,status:status as Player['status']};
}

export function rulesFor(competition:Competition):SportRules {
  const row=competition.api;
  const groups=Object.entries(row.position_rules||{}).map(([group,count])=>({group:group as PositionGroup,label:labels[group]??group,squadCount:Number(count),starterMin:Number(row.formation_rules?.[group]?.min??0),starterMax:Number(row.formation_rules?.[group]?.max??count)}));
  return {sport:competition.sport,label:competition.sport[0].toUpperCase()+competition.sport.slice(1),budget:Number(row.initial_budget),squadSize:row.squad_size,startersCount:row.starting_lineup_size,maxPerClub:row.max_players_per_team,positionGroups:groups,pitchStyle:competition.sport==='basketball'?'court':competition.sport==='rugby'?'rugby':'grass',multiplierLabel:competition.sport==='basketball'?'Star Player':'Captain'};
}

export function teamFromApi(row:ApiTeam,competition:Competition,scores:FantasyTeamScore[]=[]):FantasyTeam {
  const latest=scores.at(-1);
  return {id:row.id,competitionId:row.fantasy_competition,teamName:row.name,managerName:latest?.manager??'',budgetRemaining:Number(row.budget_remaining),squad:row.selections.map(s=>({playerId:s.fantasy_player,isStarter:s.is_starter,benchOrder:s.bench_order??undefined})),captainId:row.selections.find(s=>s.is_captain)?.fantasy_player??null,viceCaptainId:row.selections.find(s=>s.is_vice_captain)?.fantasy_player??null,freeTransfers:row.free_transfers,totalPoints:scores.reduce((sum,s)=>sum+Number(s.total_points),0),gwPoints:Number(latest?.total_points??0),overallRank:null,submitted:true,score:latest,competition};
}
