// Global search — aggregation service.
//
// Fans search across eight unrelated domains at once (clubs, competitions,
// fixtures, players, news, markets, tickets, fantasy leagues), each backed
// by a different source with a different shape. This module is the single
// place that normalizes all of them into one SearchResult union so the
// Search page, its result cards, and the navbar search field don't need to
// know where any given item came from.
//
// None of the underlying public endpoints support server-side text search
// or pagination, so this fetches full lists once; filtering/search/paging
// happens client-side (see useInfiniteResults).

import { getPublicClubs, getPublicCompetitions, getPublicFixtures } from './publicDashboardService';
import type { PublicClubApi, PublicCompetitionApi, PublicFixtureApi } from './publicDashboardService';
import { fetchOpenMarkets } from './markets/publicMarketsService';
import type { PublicMarketCard } from './markets/publicMarketsService';
import { fetchNews } from './newsService';
import type { Story } from './newsService';
import { fetchClubs, fetchSquad } from './clubsService';
import type { ClubSummary, Player } from './clubsService';
import { getMatchTicketTypes } from './ticketCheckoutService';
import { fetchFantasyCompetitions } from './fantasyService';
import type { FantasyCompetition } from './fantasyService';
import { deriveSport, type Sport } from '../utils/sport';

export type { Sport };
export type SearchResultKind = 'club' | 'competition' | 'fixture' | 'player' | 'news' | 'market' | 'ticket' | 'fantasyLeague';

interface SearchResultBase {
  id: string;
  kind: SearchResultKind;
  sport?: Sport;
}

export interface ClubResult extends SearchResultBase {
  kind: 'club';
  name: string;
  slug: string;
  crestUrl?: string;
}

export interface CompetitionResult extends SearchResultBase {
  kind: 'competition';
  name: string;
  league?: string;
}

export interface FixtureResult extends SearchResultBase {
  kind: 'fixture';
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  homeCrestUrl?: string;
  awayCrestUrl?: string;
  competition: string;
  kickoff: string;
  venue?: string;
  status: string;
}

export interface PlayerResult extends SearchResultBase {
  kind: 'player';
  name: string;
  club: string;
  clubSlug: string;
  playerId: string;
  position: string;
  photoUrl?: string;
}

export interface NewsResult extends SearchResultBase {
  kind: 'news';
  title: string;
  description: string;
  imageUrl?: string;
  timeAgo: string;
}

export interface MarketResult extends SearchResultBase {
  kind: 'market';
  marketId: string;
  question: string;
  teams: string[];
  closesAt: string;
  status: string;
}

export interface TicketResult extends SearchResultBase {
  kind: 'ticket';
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  lowestPrice: number | null;
  currency: string;
}

export interface FantasyLeagueResult extends SearchResultBase {
  kind: 'fantasyLeague';
  leagueId: string;
  name: string;
  entryType: 'public' | 'private';
}

export type SearchResult =
  | ClubResult
  | CompetitionResult
  | FixtureResult
  | PlayerResult
  | NewsResult
  | MarketResult
  | TicketResult
  | FantasyLeagueResult;

function mapClub(club: PublicClubApi): ClubResult {
  return {
    id: `club-${club.id}`,
    kind: 'club',
    name: club.name,
    slug: club.slug,
    crestUrl: club.logo_url || club.logo || undefined,
    sport: deriveSport(club.sport_display || club.sport),
  };
}

function mapCompetition(competition: PublicCompetitionApi): CompetitionResult {
  return {
    id: `competition-${competition.id}`,
    kind: 'competition',
    name: competition.name,
    league: competition.league_name,
    sport: deriveSport(competition.league_name || competition.name),
  };
}

function mapFixture(fixture: PublicFixtureApi): FixtureResult {
  return {
    id: `fixture-${fixture.id}`,
    kind: 'fixture',
    fixtureId: String(fixture.id),
    homeTeam: fixture.home_club_name,
    awayTeam: fixture.away_club_name,
    homeCrestUrl: fixture.home_club_logo_url || undefined,
    awayCrestUrl: fixture.away_club_logo_url || undefined,
    competition: fixture.competition_name,
    kickoff: fixture.match_date,
    venue: fixture.venue,
    status: fixture.status,
    sport: deriveSport(fixture.competition_name),
  };
}

function mapPlayer(club: ClubSummary, player: Player): PlayerResult {
  return {
    id: `player-${player.clubSlug}-${player.id}`,
    kind: 'player',
    name: player.name,
    club: club.name,
    clubSlug: player.clubSlug,
    playerId: player.id,
    position: player.position,
    photoUrl: player.photo,
    sport: club.sport,
  };
}

// Players aren't a standalone real resource anywhere — they only exist as
// each club's squad (clubsService.ts, the same mock data the real,
// working PlayerProfile route already uses). Note this is a *different*
// "clubs" source than mapClub()'s real getPublicClubs() above: one backs
// Club search results (real backend), this one is only used internally to
// enumerate squads for Player results, matching whatever identity space
// PlayerProfile actually resolves against.
async function fetchAllPlayerResults(): Promise<PlayerResult[]> {
  const clubs = await fetchClubs();
  const squads = await Promise.all(clubs.map((club) => fetchSquad(club.slug)));
  return clubs.flatMap((club, index) => squads[index].map((player) => mapPlayer(club, player)));
}

function mapNews(story: Story): NewsResult {
  return {
    id: `news-${story.id}`,
    kind: 'news',
    title: story.title,
    description: story.description,
    imageUrl: story.image,
    timeAgo: story.time,
    sport: deriveSport(story.category),
  };
}

function mapMarket(market: PublicMarketCard): MarketResult {
  return {
    id: `market-${market.id}`,
    kind: 'market',
    marketId: market.id,
    question: market.question,
    teams: market.teams,
    closesAt: market.closesAt,
    status: market.status,
    sport: deriveSport(market.sport),
  };
}

function mapFantasyLeague(league: FantasyCompetition): FantasyLeagueResult {
  return {
    id: `fantasy-${league.id}`,
    kind: 'fantasyLeague',
    leagueId: league.id,
    name: league.name,
    entryType: league.visibility.toLowerCase() as 'public' | 'private',
    sport: deriveSport(league.sport),
  };
}

// Tickets aren't a standalone resource — a "ticket" is a fixture that has
// active, available ticket types, exactly like TicketsLandingPage.tsx's own
// aggregation (getPublicFixtures() + getMatchTicketTypes() per fixture,
// keeping only ACTIVE ticket types with remaining_quantity left).
async function fetchTicketResults(): Promise<TicketResult[]> {
  const fixtures = await getPublicFixtures();

  const rows = await Promise.all(
    fixtures.map(async (fixture) => {
      try {
        const response = await getMatchTicketTypes(fixture.id);
        const activeTypes = response.ticket_types.filter(
          (ticketType) => ticketType.status === 'ACTIVE' && ticketType.remaining_quantity > 0,
        );
        return { fixture, activeTypes };
      } catch {
        return { fixture, activeTypes: [] };
      }
    }),
  );

  return rows
    .filter((row) => row.activeTypes.length > 0)
    .map(({ fixture, activeTypes }) => {
      const prices = activeTypes.map((t) => Number(t.price)).filter((price) => Number.isFinite(price) && price > 0);
      return {
        id: `ticket-${fixture.id}`,
        kind: 'ticket' as const,
        fixtureId: String(fixture.id),
        homeTeam: fixture.home_club_name,
        awayTeam: fixture.away_club_name,
        kickoff: fixture.match_date,
        lowestPrice: prices.length ? Math.min(...prices) : null,
        currency: activeTypes[0]?.currency ?? 'UGX',
        sport: deriveSport(fixture.competition_name),
      };
    });
}

export async function fetchSearchResults(): Promise<{ results: SearchResult[]; failedSources: string[] }> {
  const [clubs, competitions, fixtures, markets, news, players, tickets, fantasyLeagues] = await Promise.allSettled([
    getPublicClubs(),
    getPublicCompetitions(),
    getPublicFixtures(),
    fetchOpenMarkets(),
    fetchNews(),
    fetchAllPlayerResults(),
    fetchTicketResults(),
    fetchFantasyCompetitions(),
  ]);

  const results: SearchResult[] = [];
  const failedSources: string[] = [];

  if (clubs.status === 'fulfilled') {
    results.push(...clubs.value.map(mapClub));
  } else {
    failedSources.push('clubs');
  }

  if (competitions.status === 'fulfilled') {
    results.push(...competitions.value.map(mapCompetition));
  } else {
    failedSources.push('competitions');
  }

  if (fixtures.status === 'fulfilled') {
    results.push(...fixtures.value.map(mapFixture));
  } else {
    failedSources.push('fixtures');
  }

  if (markets.status === 'fulfilled') {
    results.push(...markets.value.map(mapMarket));
  } else {
    failedSources.push('markets');
  }

  if (news.status === 'fulfilled') {
    results.push(...news.value.map(mapNews));
  } else {
    failedSources.push('news');
  }

  if (players.status === 'fulfilled') {
    results.push(...players.value);
  } else {
    failedSources.push('players');
  }

  if (tickets.status === 'fulfilled') {
    results.push(...tickets.value);
  } else {
    failedSources.push('tickets');
  }

  if (fantasyLeagues.status === 'fulfilled') {
    results.push(...fantasyLeagues.value.map(mapFantasyLeague));
  } else {
    failedSources.push('fantasy leagues');
  }

  return { results, failedSources };
}
