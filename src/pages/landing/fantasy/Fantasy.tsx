import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import FantasyHero from './sections/FantasyHero';
import FeaturedLeagues from './sections/FeaturedLeagues';
import HowFantasyWorks from './sections/HowFantasyWorks';
import UpcomingGameweeks from './sections/UpcomingGameweeks';
import FeaturedLeaderboard from './sections/FeaturedLeaderboard';
import PrizesBanner from './sections/PrizesBanner';
import TipsStats from './sections/TipsStats';
import InviteFriendsBanner from './sections/InviteFriendsBanner';
import './Fantasy.css';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchCompetitionLeaderboard, fetchFantasyCompetitions, fetchPublicLeagues, type FantasyCompetition, type FantasyLeague, type FantasyStanding } from '../../../services/fantasyService';

function Fantasy() {
  const {competitionId}=useParams();
  const [competitions,setCompetitions]=useState<FantasyCompetition[]>([]);
  const [leaderboard,setLeaderboard]=useState<FantasyStanding[]>([]);
  const [leagues,setLeagues]=useState<FantasyLeague[]>([]);
  useEffect(()=>{void fetchFantasyCompetitions().then(async rows=>{setCompetitions(rows);const selected=rows.find(row=>row.id===competitionId)??rows[0];if(selected)setLeaderboard(await fetchCompetitionLeaderboard(selected.id));setLeagues((await fetchPublicLeagues()).filter(row=>row.fantasy_competition===selected?.id));}).catch(()=>{setCompetitions([]);setLeaderboard([]);setLeagues([]);});},[competitionId]);
  const selected=competitions.find(row=>row.id===competitionId);
  return (
    <div className="fantasy-page">
      <Navbar />

      <main className="fantasy-main">
        <div className="fantasy-main-inner">
          <FantasyHero />
          {competitionId && !selected && <section className="fantasy-panel"><h2>Competition not published</h2><Link to="/fantasy">Browse Fantasy competitions</Link></section>}
          {selected && <section className="fantasy-panel"><h2>{selected.name}</h2><p>{selected.description||'Description not published.'}</p><p><strong>{selected.sport}</strong> · Season {selected.season} · Registration {selected.registration_state.toLowerCase()}</p><h3>Fantasy rules</h3><p>Squad {selected.squad_size}; starters {selected.starting_lineup_size}; budget {selected.initial_budget}; maximum {selected.max_players_per_team} per team.</p><h3>{selected.current_gameweek?.name??'Schedule pending'}</h3>{selected.current_gameweek?.fixture_details.length?<ul>{selected.current_gameweek.fixture_details.map(fixture=><li key={fixture.id}>{fixture.name} · {new Date(fixture.starts_at).toLocaleString()}</li>)}</ul>:<p>Schedule pending</p>}<h3>Public leagues</h3>{leagues.length?<ul>{leagues.map(league=><li key={league.id}>{league.name} · {league.member_count} members</li>)}</ul>:<p>No public leagues yet.</p>}<p>{leaderboard.length?'Leaderboard below.':'Awaiting statistics'}</p>{Object.keys(selected.prize_metadata||{}).length>0&&<pre>{JSON.stringify(selected.prize_metadata,null,2)}</pre>}<Link to="/login">Sign in to participate</Link></section>}
          <FeaturedLeagues competitions={competitions} />

          <div className="fantasy-two-col">
            <HowFantasyWorks />
            <UpcomingGameweeks competitions={competitions} />
          </div>

          <div className="fantasy-two-col">
            <FeaturedLeaderboard rows={leaderboard} />
            {competitions.some(row=>Object.keys(row.prize_metadata||{}).length>0) && <PrizesBanner />}
          </div>

          <TipsStats />
          <InviteFriendsBanner />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Fantasy;
