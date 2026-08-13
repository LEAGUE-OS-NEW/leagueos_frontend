import { describe, expect, it, vi } from 'vitest';
import { fetchSearchResults } from './searchService';
import { getPublicClubs, getPublicCompetitions, getPublicFixtures } from './publicDashboardService';
import { fetchOpenMarkets } from './markets/publicMarketsService';
import { fetchNews } from './newsService';
import { fetchClubs, fetchSquad } from './clubsService';
import { getMatchTicketTypes } from './ticketCheckoutService';
import { fetchFantasyCompetitions } from './fantasyService';

vi.mock('./publicDashboardService', () => ({
  getPublicClubs: vi.fn(),
  getPublicCompetitions: vi.fn(),
  getPublicFixtures: vi.fn(),
}));

vi.mock('./markets/publicMarketsService', () => ({
  fetchOpenMarkets: vi.fn(),
}));

vi.mock('./newsService', () => ({
  fetchNews: vi.fn(),
}));

vi.mock('./clubsService', () => ({
  fetchClubs: vi.fn(),
  fetchSquad: vi.fn(),
}));

vi.mock('./ticketCheckoutService', () => ({
  getMatchTicketTypes: vi.fn(),
}));

vi.mock('./fantasyService', () => ({
  fetchFantasyCompetitions: vi.fn(),
}));

describe('fetchSearchResults', () => {
  it('normalizes every source into SearchResult and keeps going when one source fails', async () => {
    vi.mocked(getPublicClubs).mockResolvedValue([
      { id: 1, name: 'Vipers SC', slug: 'vipers-sc', sport_display: 'Football', logo_url: '/vipers.png' },
    ]);
    vi.mocked(getPublicCompetitions).mockResolvedValue([
      { id: 1, name: 'Uganda Premier League', slug: 'upl', league_name: 'StarTimes Uganda Premier League 2026' },
    ]);
    vi.mocked(getPublicFixtures).mockRejectedValue(new Error('fixtures endpoint down'));
    vi.mocked(fetchOpenMarkets).mockResolvedValue([
      {
        id: 'm1',
        sport: 'Football',
        teams: ['Vipers SC', 'Express FC'],
        subject: 'Vipers SC vs Express FC',
        question: 'Will Vipers SC win?',
        status: 'OPEN',
        closesAt: '2026-08-10T10:00:00Z',
        outcomes: ['Yes', 'No'],
      },
    ]);
    vi.mocked(fetchNews).mockResolvedValue([
      {
        id: 's1',
        category: 'Football',
        time: '2h ago',
        image: '/img.jpg',
        title: 'A story',
        description: 'desc',
        author: 'Author',
        avatar: '/avatar.jpg',
        isFeatured: false,
      },
    ]);
    vi.mocked(fetchClubs).mockResolvedValue([
      {
        slug: 'vipers-sc',
        name: 'Vipers SC',
        sport: 'Football',
        league: 'Uganda Premier League',
        founded: '2008',
        stadium: "St. Mary's Stadium",
        description: '',
        verificationStatus: 'Verified',
        honours: [],
      },
    ]);
    vi.mocked(fetchSquad).mockResolvedValue([
      {
        id: 'v-1',
        clubSlug: 'vipers-sc',
        name: 'Allan Okello',
        position: 'Midfielder',
        number: 8,
        nationality: 'Uganda',
        dateJoined: 'Jan 2022',
        statsVerification: 'Verified',
        stats: [],
      },
    ]);
    vi.mocked(getMatchTicketTypes).mockResolvedValue({
      match: { id: 1, label: '', venue: '', match_date: '', status: '' },
      count: 0,
      ticket_types: [],
    });
    vi.mocked(fetchFantasyCompetitions).mockResolvedValue([
      {
        id: 'fb-premier',
        sport: 'football',
        name: 'Uganda Fantasy Premier',
        visibility: 'PUBLIC',
      } as never,
    ]);

    const { results, failedSources } = await fetchSearchResults();

    // fetchTicketResults() depends on getPublicFixtures() too, so a fixtures
    // outage also takes tickets down with it.
    expect(failedSources.sort()).toEqual(['fixtures', 'tickets'].sort());
    expect(results.map((r) => r.kind).sort()).toEqual(
      ['club', 'competition', 'fantasyLeague', 'market', 'news', 'player'].sort(),
    );
    expect(results.find((r) => r.kind === 'club')).toMatchObject({ name: 'Vipers SC', slug: 'vipers-sc', sport: 'Football' });
    expect(results.find((r) => r.kind === 'competition')).toMatchObject({ sport: 'Football' });
    expect(results.find((r) => r.kind === 'player')).toMatchObject({
      name: 'Allan Okello',
      clubSlug: 'vipers-sc',
      playerId: 'v-1',
      sport: 'Football',
    });
    expect(results.find((r) => r.kind === 'fantasyLeague')).toMatchObject({
      name: 'Uganda Fantasy Premier',
      leagueId: 'fb-premier',
      entryType: 'public',
      sport: 'Football',
    });
  });

  it('reports every source as failed when everything rejects', async () => {
    vi.mocked(getPublicClubs).mockRejectedValue(new Error('down'));
    vi.mocked(getPublicCompetitions).mockRejectedValue(new Error('down'));
    vi.mocked(getPublicFixtures).mockRejectedValue(new Error('down'));
    vi.mocked(fetchOpenMarkets).mockRejectedValue(new Error('down'));
    vi.mocked(fetchNews).mockRejectedValue(new Error('down'));
    vi.mocked(fetchClubs).mockRejectedValue(new Error('down'));
    vi.mocked(getMatchTicketTypes).mockRejectedValue(new Error('down'));
    vi.mocked(fetchFantasyCompetitions).mockRejectedValue(new Error('down'));

    const { results, failedSources } = await fetchSearchResults();

    expect(results).toEqual([]);
    expect(failedSources.sort()).toEqual(
      ['clubs', 'competitions', 'fixtures', 'markets', 'news', 'players', 'tickets', 'fantasy leagues'].sort(),
    );
  });
});
