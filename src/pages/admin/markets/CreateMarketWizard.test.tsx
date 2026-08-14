import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateMarketWizard from './CreateMarketWizard';
import * as marketService from '../../../services/marketAdminService';

vi.mock('../../../components/admin/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/marketAdminService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/marketAdminService')>();
  return {
    ...actual,
    fetchMarketCatalogueOptions: vi.fn(), fetchCanonicalCompetitions: vi.fn(), fetchCanonicalSportingEvents: vi.fn(),
    createMarketDraft: vi.fn(), convertProposalToDraft: vi.fn(), publishMarket: vi.fn(),
    setParameters: vi.fn(), updateOutcomes: vi.fn(), updateMarketResolution: vi.fn(),
  };
});

const sport = { id: '00000000-0000-4000-8000-000000000001', name: 'Basketball' };
const competition = { id: '00000000-0000-4000-8000-000000000002', name: 'National Basketball League Uganda', sport };
const fixture = {
  id: '00000000-0000-4000-8000-000000000003', name: 'City Oilers vs Namuwongo Blazers', event_type: 'MATCH',
  status: 'VERIFIED', starts_at: '2026-08-15T10:00:00Z', venue: 'Lugogo Indoor Arena', sport, competition, participants: [],
};

describe('CreateMarketWizard fixture binding', () => {
  beforeEach(() => {
    vi.mocked(marketService.fetchMarketCatalogueOptions).mockResolvedValue({ sports: [sport], categories: [{ id: 'cat-1', name: 'Match Result' }] });
    vi.mocked(marketService.fetchCanonicalCompetitions).mockResolvedValue([competition]);
    vi.mocked(marketService.fetchCanonicalSportingEvents).mockResolvedValue([fixture]);
    vi.mocked(marketService.createMarketDraft).mockReset();
  });

  it('populates canonical sport, competition, venue and kickoff from the selected fixture', async () => {
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /City Oilers vs Namuwongo Blazers/ }));

    const canonical = screen.getByRole('region', { name: 'Selected fixture details' });
    expect(canonical).toHaveTextContent('Basketball');
    expect(canonical).toHaveTextContent('National Basketball League Uganda');
    expect(canonical).toHaveTextContent('Lugogo Indoor Arena');
    expect(canonical).toHaveTextContent(new Date(fixture.starts_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    expect(screen.getByRole('button', { name: 'Change fixture' })).toBeEnabled();
    expect(screen.queryByRole('option', { name: 'Select competition' })).not.toBeInTheDocument();
  });

  it('cannot double-submit Step 1 while the draft save is pending', async () => {
    let resolveDraft!: (value: never) => void;
    vi.mocked(marketService.createMarketDraft).mockImplementation(() => new Promise((resolve) => { resolveDraft = resolve; }));
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /City Oilers vs Namuwongo Blazers/ }));
    fireEvent.change(screen.getByRole('combobox', { name: /Market Type/ }), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Question' }), { target: { value: 'Will City Oilers beat Namuwongo Blazers?' } });
    const next = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(next);
    fireEvent.click(next);
    await waitFor(() => expect(marketService.createMarketDraft).toHaveBeenCalledTimes(1));
    expect(next).toBeDisabled();
    resolveDraft(undefined as never);
  });
});
