/**
 * LeagueInviteLanding
 *
 * Handles the shareable private-league invite URL:
 *   /fan/fantasy/join?code=ABC123
 *
 * Flow:
 *  1. Read ?code= from the URL.
 *  2. Attempt POST /fantasy/leagues/join_by_code/ immediately.
 *     • Success            → league joined; navigate to /fan/fantasy with the
 *                            league's competition pre-selected.
 *     • "no team" error    → the code is valid but the user hasn't built a
 *                            squad yet.  Show a prompt to navigate to
 *                            /fan/fantasy?pendingCode=<code> so FantasyCompetitions
 *                            can handle the "create team then join" flow.
 *     • Any other error    → show the real error message (invalid code,
 *                            league full, closed, etc.).
 *
 * This component is always rendered inside AuthenticatedRoute so the user
 * is guaranteed to be logged in before we reach this point.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinFantasyLeagueByCode } from '../../../services/fantasyService';
import { extractApiError } from '../../../services/apiUtils';
import './FantasyCompetitions.css';

type Phase = 'joining' | 'no-team' | 'error' | 'done';

/** Backend error detail text returned when the user has no team yet. */
const NO_TEAM_DETAIL = 'Invalid invite code or no team for this competition.';

export default function LeagueInviteLanding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = (params.get('code') ?? '').trim().toUpperCase();

  const [phase, setPhase] = useState<Phase>(() =>
    (params.get('code') ?? '').trim() ? 'joining' : 'error',
  );
  const [errorMsg, setErrorMsg] = useState(() =>
    (params.get('code') ?? '').trim() ? '' : 'No invite code was provided. Check the link and try again.',
  );
  // Stored so we can pass it on to FantasyCompetitions after a redirect
  const leagueCompetitionId = useRef<string>('');

  useEffect(() => {
    // code is derived from the URL — it won't change after mount, and we
    // already initialised phase to 'error' above when code is absent.
    if (!code) return;

    let cancelled = false;

    joinFantasyLeagueByCode(code)
      .then((league) => {
        if (cancelled) return;
        leagueCompetitionId.current = league.fantasy_competition;
        setPhase('done');
        // Navigate to /fan/fantasy with the competition highlighted and the
        // leagues screen open.
        navigate(
          `/fan/fantasy?competitionId=${encodeURIComponent(league.fantasy_competition)}&screen=leagues`,
          { replace: true },
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const { message } = extractApiError(err);
        if (message === NO_TEAM_DETAIL) {
          setPhase('no-team');
        } else {
          setPhase('error');
          setErrorMsg(message);
        }
      });

    return () => { cancelled = true; };
  // code is derived from the URL at render time and stable for the lifetime
  // of this component. navigate is a stable ref from react-router-dom.
  }, [code, navigate]);

  const handleCreateTeam = () => {
    // Pass the pending code through the URL so FantasyCompetitions can
    // re-attempt the join after the user finishes building their squad.
    navigate(`/fan/fantasy?pendingCode=${encodeURIComponent(code)}`, { replace: true });
  };

  if (phase === 'joining' || phase === 'done') {
    return (
      <div className="league-invite-landing">
        <div className="league-invite-card">
          <div className="league-invite-spinner" aria-label="Joining league…" />
          <p>Joining league…</p>
        </div>
      </div>
    );
  }

  if (phase === 'no-team') {
    return (
      <div className="league-invite-landing">
        <div className="league-invite-card">
          <h2>One more step</h2>
          <p>
            Your invite code <strong className="league-invite-code-inline">{code}</strong> is
            valid, but you haven't created a Fantasy team for this competition yet.
          </p>
          <p>Build your squad first — you'll be joined to the league automatically once your team is saved.</p>
          <button className="btn btn-primary" onClick={handleCreateTeam}>
            Create my team
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/fan/fantasy', { replace: true })}>
            Go to Fantasy Hub
          </button>
        </div>
      </div>
    );
  }

  // phase === 'error'
  return (
    <div className="league-invite-landing">
      <div className="league-invite-card">
        <h2>Invite not valid</h2>
        <p role="alert">{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => navigate('/fan/fantasy', { replace: true })}>
          Go to Fantasy Hub
        </button>
      </div>
    </div>
  );
}
