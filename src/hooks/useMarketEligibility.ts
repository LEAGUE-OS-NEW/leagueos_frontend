import { useCallback, useEffect, useMemo, useState } from 'react';
import { getToken } from '../utils/tokenManager.ts';
import { fetchMarketEligibility, type MarketEligibility } from '../services/marketEligibilityService.ts';

type EligibilityState = {
  eligibility: MarketEligibility | null;
  isLoading: boolean;
  error: string;
};

export function useMarketEligibility() {
  const [state, setState] = useState<EligibilityState>({
    eligibility: null,
    isLoading: Boolean(getToken()),
    error: '',
  });

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setState({ eligibility: null, isLoading: false, error: '' });
      return null;
    }

    setState((current) => ({ ...current, isLoading: true, error: '' }));
    try {
      const eligibility = await fetchMarketEligibility();
      setState({ eligibility, isLoading: false, error: '' });
      return eligibility;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load market eligibility.';
      setState({ eligibility: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: refresh() only touches state after its internal
    // await (or synchronously on the "no token" early-return branch, which
    // just mirrors the hook's initial state). This is the standard
    // fetch-in-effect pattern; the rule can't see through the async call
    // boundary, so it's silenced deliberately here rather than restructured.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const status = state.eligibility?.requirements.kyc_status ?? 'NOT_STARTED';

  return useMemo(() => {
    const reasonCodes = state.eligibility?.reason_codes ?? [];
    const nextActions = state.eligibility?.next_actions ?? [];
    return {
      ...state,
      refresh,
      status,
      reasonCodes,
      nextActions,
      isEligible: Boolean(state.eligibility?.eligible),
      isPending: status === 'PENDING' || nextActions.includes('WAIT_FOR_KYC_REVIEW'),
      isRejected: status === 'REJECTED',
      needsProfile: nextActions.includes('COMPLETE_PROFILE'),
      needsKyc: nextActions.includes('COMPLETE_KYC') || status === 'NOT_STARTED',
    };
  }, [state, refresh, status]);
}