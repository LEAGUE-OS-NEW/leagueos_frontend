import { describe, expect, it } from 'vitest';
import { deriveFixtureStatus, fixtureHasScore, fixtureLabel } from './fixturesService';

describe('deriveFixtureStatus', () => {
  it('maps the confirmed real backend value', () => {
    expect(deriveFixtureStatus('SCHEDULED', false)).toBe('Scheduled');
  });

  it('maps common live vocabularies', () => {
    expect(deriveFixtureStatus('LIVE', true)).toBe('Live');
    expect(deriveFixtureStatus('in_progress', true)).toBe('Live');
  });

  it('maps a plain finished status to Provisional, not Final', () => {
    expect(deriveFixtureStatus('FINISHED', true)).toBe('Provisional');
    expect(deriveFixtureStatus('FULL_TIME', true)).toBe('Provisional');
  });

  it('only maps an explicit confirmation signal to Final', () => {
    expect(deriveFixtureStatus('FINAL', true)).toBe('Final');
    expect(deriveFixtureStatus('CONFIRMED', true)).toBe('Final');
  });

  it('maps postponed and cancelled variants', () => {
    expect(deriveFixtureStatus('POSTPONED', false)).toBe('Postponed');
    expect(deriveFixtureStatus('CANCELLED', false)).toBe('Cancelled');
    expect(deriveFixtureStatus('CANCELED', false)).toBe('Cancelled');
  });

  it('falls back on score presence for an unrecognized status', () => {
    expect(deriveFixtureStatus('SOMETHING_NEW', true)).toBe('Provisional');
    expect(deriveFixtureStatus('SOMETHING_NEW', false)).toBe('Scheduled');
  });

  it('treats a missing status as Scheduled', () => {
    expect(deriveFixtureStatus(undefined, false)).toBe('Scheduled');
    expect(deriveFixtureStatus('', false)).toBe('Scheduled');
  });
});

describe('fixtureLabel / fixtureHasScore', () => {
  const fixture = {
    id: 1,
    competition: 1,
    competition_name: 'Uganda Premier League',
    home_club: 1,
    home_club_name: 'Vipers SC',
    home_club_slug: 'vipers-sc',
    home_club_logo_url: '',
    away_club: 2,
    away_club_name: 'Express FC',
    away_club_slug: 'express-fc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-08-10T16:00:00Z',
    venue: "St Mary's Stadium",
    home_score: null as number | null,
    away_score: null as number | null,
  };

  it('formats a home vs away label', () => {
    expect(fixtureLabel(fixture)).toBe('Vipers SC vs Express FC');
  });

  it('detects a score only when both sides have one', () => {
    expect(fixtureHasScore(fixture)).toBe(false);
    expect(fixtureHasScore({ ...fixture, home_score: 1, away_score: null })).toBe(false);
    expect(fixtureHasScore({ ...fixture, home_score: 1, away_score: 0 })).toBe(true);
  });
});
