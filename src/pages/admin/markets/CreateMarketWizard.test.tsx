import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    createMarketDraft: vi.fn(), convertProposalToDraft: vi.fn(), publishMarket: vi.fn(), configureOpeningPricing: vi.fn(),
    setParameters: vi.fn(), updateOutcomes: vi.fn(), updateMarketResolution: vi.fn(),
  };
});

const sport = { id: '00000000-0000-4000-8000-000000000001', name: 'Basketball' };
const competition = { id: '00000000-0000-4000-8000-000000000002', name: 'National Basketball League Uganda', sport };
const fixture = {
  id: '00000000-0000-4000-8000-000000000003', name: 'City Oilers vs Namuwongo Blazers', event_type: 'MATCH',
  status: 'SCHEDULED', starts_at: '2099-08-15T10:00:00Z', venue: 'Lugogo Indoor Arena', sport, competition, participants: [],
};
const pastFixture = { ...fixture, id: '00000000-0000-4000-8000-000000000004', name: 'Old fixture', starts_at: '2020-01-01T10:00:00Z' };

const createdMarket = {
  id: 'market-1', sportingEventId: fixture.id, eventLabel: fixture.name, competition: competition.name,
  venue: fixture.venue, kickoff: fixture.starts_at, category: 'Football' as const, question: 'Will City Oilers win?',
  description: '', tags: [], outcomes: [], faceValueUgx: 10_000,
  parameters: { opensAt: '2099-08-14T10:00:00Z', closesAt: fixture.starts_at, settlesBy: '2099-08-17T14:00:00Z', initialLiquidityUgx: 0, liquiditySource: 'PLATFORM_TREASURY' as const, openingSpreadBps: 100, minTradeUgx: 1000, maxTradeUgx: 500000, featured: false, trending: false, recommended: false, inPlayTrading: false },
  status: 'Draft' as const, createdBy: 'Admin', createdAt: '2099-08-14T10:00:00Z', auditHistory: [],
};

async function selectUpcomingFixture() {
  const selector = screen.getByRole('combobox', { name: 'Event / Fixture' });

  // The selector renders before the async sporting-event request resolves.
  // Wait for the canonical fixture option before trying to select it.
  await screen.findByRole('option', {
    name: new RegExp(fixture.name),
  });

  fireEvent.change(selector, {
    target: { value: fixture.id },
  });

  await waitFor(() => {
    expect(selector).toHaveValue(fixture.id);
  });
}

describe('CreateMarketWizard fixture binding', () => {
  beforeEach(() => {
    vi.mocked(marketService.fetchMarketCatalogueOptions).mockResolvedValue({ sports: [sport], categories: [{ id: 'cat-1', name: 'Match Result' }] });
    vi.mocked(marketService.fetchCanonicalCompetitions).mockResolvedValue([competition]);
    vi.mocked(marketService.fetchCanonicalSportingEvents).mockResolvedValue([fixture]);
    vi.mocked(marketService.createMarketDraft).mockReset();
    vi.mocked(marketService.createMarketDraft).mockResolvedValue(createdMarket);
    vi.mocked(marketService.updateOutcomes).mockResolvedValue(createdMarket);
    vi.mocked(marketService.updateMarketResolution).mockResolvedValue(createdMarket);
    vi.mocked(marketService.configureOpeningPricing).mockResolvedValue(createdMarket);
    vi.mocked(marketService.setParameters).mockResolvedValue(createdMarket);
  });

  it('populates canonical sport, competition, venue and kickoff from the selected fixture', async () => {
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    await selectUpcomingFixture();

    const canonical = screen.getByRole('region', { name: 'Selected fixture details' });
    expect(canonical).toHaveTextContent('Basketball');
    expect(canonical).toHaveTextContent('National Basketball League Uganda');
    expect(canonical).toHaveTextContent('Lugogo Indoor Arena');
    expect(canonical).toHaveTextContent(new Date(fixture.starts_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    expect(screen.getByRole('button', { name: 'Change fixture' })).toBeEnabled();
    expect(screen.queryByRole('option', { name: 'Select competition' })).not.toBeInTheDocument();
  });

  it('uses a dropdown and excludes a past fixture accidentally returned by the API', async () => {
    vi.mocked(marketService.fetchCanonicalSportingEvents).mockResolvedValue([pastFixture, fixture]);
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    const selector = screen.getByRole('combobox', { name: 'Event / Fixture' });

    await screen.findByRole('option', {
      name: new RegExp(fixture.name),
    });

    expect(selector).toHaveTextContent(fixture.name);
    expect(selector).not.toHaveTextContent(pastFixture.name);
    expect(screen.queryByRole('button', { name: new RegExp(fixture.name) })).not.toBeInTheDocument();
  });

  it('shows the empty state when no upcoming fixture is available', async () => {
    vi.mocked(marketService.fetchCanonicalSportingEvents).mockResolvedValue([pastFixture]);
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    expect(await screen.findByText(/No upcoming verified fixtures are currently available/)).toBeInTheDocument();
  });

  it('cannot double-submit Step 1 while the draft save is pending', async () => {
    let resolveDraft!: (value: never) => void;
    vi.mocked(marketService.createMarketDraft).mockImplementation(() => new Promise((resolve) => { resolveDraft = resolve; }));
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    await selectUpcomingFixture();
    fireEvent.change(screen.getByRole('combobox', { name: /Market Type/ }), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Question' }), { target: { value: 'Will City Oilers beat Namuwongo Blazers?' } });
    const next = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(next);
    fireEvent.click(next);
    await waitFor(() => expect(marketService.createMarketDraft).toHaveBeenCalledTimes(1));
    expect(next).toBeDisabled();
    await act(async () => resolveDraft(undefined as never));
  });

  it('renders settlement timing, rejects an early target, sends a valid target, and reviews it separately', async () => {
    render(<MemoryRouter><CreateMarketWizard /></MemoryRouter>);
    await selectUpcomingFixture();
    fireEvent.change(screen.getByRole('combobox', { name: /Market Type/ }), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Question' }), { target: { value: 'Will City Oilers beat Namuwongo Blazers?' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('Outcomes');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Opening YES probability (%)' }), { target: { value: '60' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Resolution Source/ }), { target: { value: 'Official league result' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Resolution Criteria/ }), { target: { value: 'City Oilers win the match' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Rules \/ Void Conditions/ }), { target: { value: 'Void if abandoned' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));

    await waitFor(() => expect(marketService.updateOutcomes).toHaveBeenCalledWith('market-1', expect.arrayContaining([
      expect.objectContaining({ id: 'YES', probabilityPct: 60 }),
      expect.objectContaining({ id: 'NO', probabilityPct: 40 }),
    ])));
    expect(marketService.configureOpeningPricing).toHaveBeenCalledWith('market-1', 10_000, 60);

    const settlement = await screen.findByLabelText('Settlement Target');
    expect(settlement).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Opening Liquidity' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Initial Liquidity (UGX)'), { target: { value: '500000' } });
    expect(screen.getByRole('region', { name: 'Opening Liquidity' })).toHaveTextContent('Approx. complete sets: 50');
    fireEvent.change(settlement, { target: { value: '2099-08-15T09:00' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Settlement target must be at or after');
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();

    fireEvent.change(settlement, { target: { value: '2099-08-17T14:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(marketService.setParameters).toHaveBeenCalledWith('market-1', expect.objectContaining({ settlesBy: new Date('2099-08-17T14:00').toISOString(), initialLiquidityUgx: 500000, liquiditySource: 'PLATFORM_TREASURY', openingSpreadBps: 100 })));
    expect(await screen.findByText('Settlement target')).toBeInTheDocument();
    expect(screen.getByText('Trading closes')).toBeInTheDocument();
    expect(screen.getByText('Fixture kickoff')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Opening Liquidity review' })).toHaveTextContent('Initial collateral: UGX 500,000');
  });
});
