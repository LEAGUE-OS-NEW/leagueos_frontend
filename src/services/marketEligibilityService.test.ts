import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import apiClient from './apiClient.ts';
import {
  fetchMarketEligibility,
} from './marketEligibilityService.ts';

vi.mock('./apiClient.ts', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('market eligibility service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the canonical authenticated Markets eligibility endpoint', async () => {
    const eligibility = {
      eligible: true,
      evaluated_at: '2026-08-15T14:00:00Z',
      requirements: {
        minimum_age: 18,
        age: 30,
        age_eligible: true,
        date_of_birth_present: true,
        country_code: 'UG',
        jurisdiction_eligible: true,
        kyc_status: 'VERIFIED',
        kyc_eligible: true,
        restriction_status: 'CLEAR',
        restriction_clear: true,
        jurisdiction_override: 'NONE',
      },
      reason_codes: [],
      next_actions: [],
    };

    vi.mocked(
      apiClient.get,
    ).mockResolvedValue({
      data: eligibility,
    });

    await expect(
      fetchMarketEligibility(),
    ).resolves.toEqual(
      eligibility,
    );

    expect(
      apiClient.get,
    ).toHaveBeenCalledWith(
      '/markets/eligibility/',
    );
  });
});
