import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from './apiClient';
import { fetchClubTicketFixtures } from './ticketingAdminService';

vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const clubId = '11111111-1111-1111-1111-111111111111';

describe('ticketingAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads club-scoped fixtures for ticket type creation', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          id: 'fixture-1',
          name: 'KCCA FC vs Express FC',
          starts_at: '2026-09-18T16:00:00Z',
          status: 'SCHEDULED',
          competition: 'Uganda Premier League',
          home_team: 'KCCA FC',
          away_team: 'Express FC',
        },
      ],
    });

    const fixtures = await fetchClubTicketFixtures(clubId);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/${clubId}/match-data/fixtures/`,
    );
    expect(fixtures[0]).toMatchObject({
      id: 'fixture-1',
      homeClubName: 'KCCA FC',
      awayClubName: 'Express FC',
      competitionName: 'Uganda Premier League',
      matchDate: '2026-09-18T16:00:00Z',
    });
  });
});
