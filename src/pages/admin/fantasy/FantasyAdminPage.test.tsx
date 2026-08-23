import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FantasyAdminPage from './FantasyAdminPage';
import * as api from '../../../services/fantasyAdminService';
import type { FantasyScoringRule, ScoringRuleType } from '../../../services/fantasyService';

/** Set a textarea/input value directly — avoids userEvent.type() choking on { } characters */
const setInputValue = (element: HTMLElement, value: string) => {
  fireEvent.change(element, { target: { value } });
};

vi.mock('../../../components/admin/AdminLayout', () => ({ default: ({children}:{children:React.ReactNode}) => <>{children}</> }));
vi.mock('../../../services/fantasyAdminService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/fantasyAdminService')>();
  return {...actual,
    fetchAdminFantasyCompetitions:vi.fn(), fetchCanonicalFantasyOptions:vi.fn(), fetchAdminLeagueOverview:vi.fn(),
    fetchFantasyPlayers:vi.fn(), fetchFantasyPlayerCandidates:vi.fn(), fetchFantasyGameweeks:vi.fn(),
    fetchFantasyFixtureCandidates:vi.fn(), fetchFantasyStatisticTypes:vi.fn(), fetchCompetitionLeaderboard:vi.fn(),
    adminCreateCompetition:vi.fn(), adminUpdateCompetition:vi.fn(), adminDeleteCompetition:vi.fn(),
    adminUpdatePlayer:vi.fn(),
    adminCreateScoringRule:vi.fn(), adminUpdateScoringRule:vi.fn(), adminDeleteScoringRule:vi.fn(),
  };
});

const competition = {
  id:'c1', competition:'real-c1', season:'s1', season_name:'2026/27',
  sport:'football' as const, name:'Premier Fantasy', description:'Official',
  enabled:true, registration_state:'OPEN' as const, visibility:'PUBLIC' as const,
  squad_size:15, starting_lineup_size:11, bench_size:4, initial_budget:'100.00',
  max_players_per_team:3, captain_multiplier:'2.00', vice_captain_fallback:true,
  free_transfers_per_gameweek:1, transfer_penalty:4,
  position_rules: { Goalkeeper: 2, Forward: 3 } as Record<string, number>, formation_rules: { Goalkeeper: { min: 1, max: 1 }, Forward: { min: 1, max: 3 } } as Record<string, { min: number; max: number }>,
  tie_break_rules:['total_points'], gameweek_rules:{}, registration_deadline:null,
  prize_metadata:{winner:'Cup'}, scoring_rules:[], current_gameweek:null, entries:0, total_gameweeks:0,
};
const scoringRule = { id:'sr1', fantasy_competition:'c1', statistic_type:'GOALS', rule_type: 'PER_UNIT' as const, points:'5.00', conditions:{}, enabled:true };
const competitionWithRules = { ...competition, scoring_rules:[scoringRule] };
const player = {
  id:'p1', fantasy_competition:'c1', player:'canonical-p1', player_name:'Safe Player',
  club:'Real Club', position:'Forward', price:7, starting_points:0, eligible:true,
  availability:'AVAILABLE' as const, name:'Safe Player', status:'available' as const,
  ownership:null, total_points:null, current_gameweek_points:null, form:null,
};

// Canonical options with real data for create-form tests
const canonicalOptions = {
  competitions: [{id:'real-c1', name:'Uganda Premier League', sport:'football', sport_slug:'football'}],
  seasons: [{id:'s1', name:'2026/27', competition:'real-c1', is_active:true}],
  taken_pairs: [],
};

/** Open the Competitions tab and wait for it to be active */
const openCompetitionsTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', {name:'Competitions'}));
};

/**
 * Fill the minimum valid create-competition form.
 * Assumes canonicalOptions is already mocked with real-c1/s1.
 * Uses fireEvent.change for JSON/numeric fields to avoid userEvent.type()
 * treating '{' as a keyboard modifier.
 */
const fillMinimalCreateForm = async (user: ReturnType<typeof userEvent.setup>, name = 'New Fantasy') => {
  // Select real competition → s1 becomes available
  await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
  // Select season (re-query after re-render)
  await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
  // Name (aria-label="name") — safe to type, no special chars
  await user.type(screen.getByRole('textbox', {name:'name'}), name);
  // Squad rules — use fireEvent.change to bypass userEvent modifier parsing
  setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
  setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '11');
  setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '4');
  // Position rules — user enters ONLY the inner content without outer { }
  setInputValue(screen.getByRole('textbox', {name:'position rules'}), '"GK":2,"DEF":5,"MID":5,"FWD":3');
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([competition]);
  vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue({competitions:[], seasons:[], taken_pairs:[]});
  vi.mocked(api.fetchAdminLeagueOverview).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyPlayers).mockResolvedValue([player]);
  vi.mocked(api.fetchFantasyPlayerCandidates).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyGameweeks).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyFixtureCandidates).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
  vi.mocked(api.fetchCompetitionLeaderboard).mockResolvedValue([]);
  vi.mocked(api.adminCreateCompetition).mockResolvedValue({...competition, id:'c2', name:'New Fantasy'});
  vi.mocked(api.adminUpdateCompetition).mockResolvedValue({...competition, name:'Edited Fantasy'});
  vi.mocked(api.adminUpdatePlayer).mockResolvedValue({...player, price:8, eligible:false, availability:'INJURED'});
  vi.mocked(api.adminDeleteCompetition).mockResolvedValue(undefined);
  vi.mocked(api.adminCreateScoringRule).mockResolvedValue(scoringRule);
  vi.mocked(api.adminUpdateScoringRule).mockResolvedValue({...scoringRule, points:'7.00', enabled:false});
  vi.mocked(api.adminDeleteScoringRule).mockResolvedValue(undefined);
});

/* ════════════════════════════════════════════════════
   EXISTING TESTS — preserved exactly as written
════════════════════════════════════════════════════ */

describe('FantasyAdminPage editing', () => {
  it('edits an existing competition through the PATCH service', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    // Tab labels are capitalised in the UI ("Competitions", "Players", etc.)
    await user.click(await screen.findByRole('button',{name:'Competitions'}));
    await user.click(screen.getByRole('button',{name:'Edit'}));
    expect(screen.getByRole('dialog',{name:'Edit Fantasy competition'})).toBeVisible();
    // The name input aria-label is the field name with underscores replaced by spaces: "name"
    const nameInput = screen.getByRole('dialog',{name:'Edit Fantasy competition'}).querySelector('[aria-label="name"]') as HTMLInputElement;
    await user.clear(nameInput); await user.type(nameInput,'Edited Fantasy');
    await user.click(screen.getByRole('button',{name:'Save competition'}));
    await waitFor(()=>expect(api.adminUpdateCompetition).toHaveBeenCalledWith('c1',expect.objectContaining({name:'Edited Fantasy',enabled:true,squad_size:15})));
    expect(await screen.findByRole('status')).toHaveTextContent('Fantasy competition updated.');
  });

 it('edits only Fantasy-owned player settings', async () => {
  const user = userEvent.setup();
  render(<FantasyAdminPage/>);

  await user.click(await screen.findByRole('button',{name:'Players'}));
  await user.click((await screen.findAllByRole('button',{name:'Edit'}))[0]);

  // Scope label queries to the modal dialog to avoid matching the add-player form fields
  const dialog = within(screen.getByRole('dialog',{name:'Edit Fantasy player'}));

  const price = dialog.getByLabelText('Price (M)');
  await user.clear(price);
  await user.type(price,'8');

  await user.click(dialog.getByLabelText('Eligible (can be selected by fans)'));
  await user.selectOptions(dialog.getByLabelText('Availability'),'INJURED');

  await user.click(dialog.getByRole('button',{name:'Save player'}));

  await waitFor(() =>
    expect(api.adminUpdatePlayer).toHaveBeenCalledWith('p1', {
      position: 'Forward',
      price: 8,
      eligible: false,
      availability: 'INJURED',
      starting_points: 0,
    })
  );
});

  it('renders an API error visibly', async () => {
    vi.mocked(api.adminUpdatePlayer).mockRejectedValueOnce(new Error('Unable to update player'));
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await user.click(await screen.findByRole('button',{name:'Players'}));
    await user.click((await screen.findAllByRole('button',{name:'Edit'}))[0]);
    await user.click(screen.getByRole('button',{name:'Save player'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to update player');
  });
});

/* ════════════════════════════════════════════════════
   CREATE COMPETITION — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — create competition', () => {

  it('shows validation errors for missing required fields', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // Click submit without filling anything
    await user.click(screen.getByRole('button', {name:'Create competition'}));

    // Multiple "Required" errors should appear (competition, season, name)
    const fieldErrors = screen.getAllByText('Required');
    expect(fieldErrors.length).toBeGreaterThanOrEqual(1);
    // API must NOT have been called
    expect(api.adminCreateCompetition).not.toHaveBeenCalled();
  });

  it('blocks submission when squad size cross-validation fails', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
    await user.type(screen.getByRole('textbox', {name:'name'}), 'Test Competition');

    // Set squad_size=15, starting_lineup_size=10, bench_size=3 (10+3≠15 — should fail)
    setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
    setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '10');
    setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '3');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    expect(screen.getByText(/starting.*bench.*must equal squad size/i)).toBeInTheDocument();
    expect(api.adminCreateCompetition).not.toHaveBeenCalled();
  });

  it('submits a valid create form and calls adminCreateCompetition with correct payload', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await fillMinimalCreateForm(user, 'New Fantasy');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({
        competition: 'real-c1',
        season: 's1',
        name: 'New Fantasy',
        squad_size: 15,
        starting_lineup_size: 11,
        bench_size: 4,
        initial_budget: '100',
        free_transfers_per_gameweek: 1,
        transfer_penalty: 4,
        enabled: true,
        visibility: 'PUBLIC',
        registration_state: 'OPEN',
        vice_captain_fallback: true,
      })
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Fantasy competition created.');
  });

  it('newly created competition appears in the list after success', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const newComp = {...competition, id:'c2', name:'New Fantasy'};
    vi.mocked(api.fetchAdminFantasyCompetitions)
      .mockResolvedValueOnce([competition])    // initial load
      .mockResolvedValue([competition, newComp]); // after create → reload

    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await fillMinimalCreateForm(user, 'New Fantasy');

    await user.click(screen.getByRole('button', {name:'Create competition'}));
    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalled());

    // After reload, new competition row must be in the table
    expect(await screen.findAllByText('New Fantasy')).not.toHaveLength(0);
  });

  it('shows API error when create competition fails', async () => {
    vi.mocked(api.adminCreateCompetition).mockRejectedValueOnce(new Error('Competition already exists'));
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await fillMinimalCreateForm(user, 'Bad Competition');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('Competition already exists');
  });
});

/* ════════════════════════════════════════════════════
   COMPETITION / SEASON SELECTION — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — competition & season selection', () => {

  it('filters season options by the selected real competition', async () => {
    const multiOptions = {
      competitions: [
        {id:'real-c1', name:'Uganda Premier League', sport:'football', sport_slug:'football'},
        {id:'real-c2', name:'Rwanda League', sport:'football', sport_slug:'football'},
      ],
      seasons: [
        {id:'s1', name:'2026/27', competition:'real-c1', is_active:true},
        {id:'s2', name:'2025/26', competition:'real-c2', is_active:false},
      ],
      taken_pairs: [],
    };
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(multiOptions);

    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // Before competition is selected, season shows "Select competition first"
    const seasonSelectBefore = screen.getByRole('combobox', {name:'Season *'});
    expect(within(seasonSelectBefore).getByText(/select competition first/i)).toBeInTheDocument();

    // Select Uganda Premier League
    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');

    const seasonSelect = screen.getByRole('combobox', {name:'Season *'});
    // s1 should now be available
    expect(within(seasonSelect).getByText('2026/27 ✓ active')).toBeInTheDocument();
    // s2 belongs to real-c2 — must NOT appear
    expect(within(seasonSelect).queryByText(/2025\/26/)).not.toBeInTheDocument();
  });

  it('resets season when real competition changes', async () => {
    const multiOptions = {
      competitions: [
        {id:'real-c1', name:'Uganda Premier League', sport:'football', sport_slug:'football'},
        {id:'real-c2', name:'Rwanda League', sport:'football', sport_slug:'football'},
      ],
      seasons: [
        {id:'s1', name:'2026/27', competition:'real-c1', is_active:true},
        {id:'s2', name:'2025/26', competition:'real-c2', is_active:false},
      ],
      taken_pairs: [],
    };
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(multiOptions);

    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    const seasonSelect = screen.getByRole('combobox', {name:'Season *'}) as HTMLSelectElement;
    await user.selectOptions(seasonSelect, 's1');
    expect(seasonSelect.value).toBe('s1');

    // Switch competition — season must reset to empty
    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c2');
    expect((screen.getByRole('combobox', {name:'Season *'}) as HTMLSelectElement).value).toBe('');
  });
});

/* ════════════════════════════════════════════════════
   VISIBILITY (PUBLIC / PRIVATE) — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — public/private visibility', () => {

  it('create form defaults to PUBLIC visibility', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    const visibilitySelect = screen.getByRole('combobox', {name:'visibility'}) as HTMLSelectElement;
    expect(visibilitySelect.value).toBe('PUBLIC');
  });

  it('create form allows setting PRIVATE visibility', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    const visibilitySelect = screen.getByRole('combobox', {name:'visibility'});
    await user.selectOptions(visibilitySelect, 'PRIVATE');
    expect((visibilitySelect as HTMLSelectElement).value).toBe('PRIVATE');
  });

  it('includes visibility in create payload', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Private League');
    await user.selectOptions(screen.getByRole('combobox', {name:'visibility'}), 'PRIVATE');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({visibility:'PRIVATE'})
    ));
  });

  it('edit modal passes updated visibility in PATCH payload', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    await user.selectOptions(within(dialog).getByRole('combobox', {name:'visibility'}), 'PRIVATE');
    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({visibility:'PRIVATE'})
    ));
  });

  it('competition list shows visibility pill for each competition', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    // The PUBLIC competition must show a PUBLIC label in the table
    expect(await screen.findByText('PUBLIC')).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════
   ENABLE / DISABLE — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — enable/disable competition', () => {

  it('create form defaults enabled to true', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // aria-label="enabled" on the checkbox input
    const enabledCheckbox = screen.getByRole('checkbox', {name:'enabled'}) as HTMLInputElement;
    expect(enabledCheckbox.checked).toBe(true);
  });

  it('create form allows unchecking enabled (disabled on creation)', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    const enabledCheckbox = screen.getByRole('checkbox', {name:'enabled'});
    await user.click(enabledCheckbox);
    expect((enabledCheckbox as HTMLInputElement).checked).toBe(false);
  });

  it('includes enabled=false in create payload when unchecked', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Draft League');
    await user.click(screen.getByRole('checkbox', {name:'enabled'})); // uncheck

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({enabled: false})
    ));
  });

  it('quick-toggle button in list calls PATCH with inverted enabled value', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // Enabled competition shows "Disable competition" aria-label
    const toggleBtn = await screen.findByRole('button', {name:'Disable competition'});
    await user.click(toggleBtn);

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({enabled: false})
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/disabled/i);
  });

  it('quick-toggle enables a disabled competition', async () => {
    const disabledComp = {...competition, enabled: false};
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([disabledComp]);
    vi.mocked(api.adminUpdateCompetition).mockResolvedValue({...disabledComp, enabled: true});

    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    const toggleBtn = await screen.findByRole('button', {name:'Enable competition'});
    await user.click(toggleBtn);

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({enabled: true})
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/enabled/i);
  });

  it('edit modal toggle passes enabled in PATCH payload', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    // Uncheck "Enabled" inside the modal — label text is "Enabled (visible to fans)"
    await user.click(within(dialog).getByLabelText('Enabled (visible to fans)'));
    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({enabled: false})
    ));
  });
});

/* ════════════════════════════════════════════════════
   SQUAD RULES — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — squad rules', () => {

  it('edit modal includes squad_size, starting_lineup_size, bench_size, initial_budget in PATCH', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    // Values pre-populate from competition fixture: squad_size=15, starting_lineup_size=11, bench_size=4
    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({
        squad_size: 15,
        starting_lineup_size: 11,
        bench_size: 4,
        initial_budget: '100.00',
      })
    ));
  });

  it('edit modal validates bench_size cross-check', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    // aria-label="bench size" on the input — set to 99: 11 + 99 ≠ 15
    setInputValue(within(dialog).getByRole('spinbutton', {name:'bench size'}), '99');

    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    expect(within(dialog).getByText(/starting.*bench.*must equal squad size/i)).toBeInTheDocument();
    expect(api.adminUpdateCompetition).not.toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════
   BUDGET — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — budget', () => {

  it('create form defaults initial_budget to 100', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // aria-label="initial budget"
    const budgetInput = screen.getByRole('spinbutton', {name:'initial budget'}) as HTMLInputElement;
    expect(budgetInput.value).toBe('100');
  });

  it('includes initial_budget in create payload', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Budget Test');
    // Override the budget set by defaults
    setInputValue(screen.getByRole('spinbutton', {name:'initial budget'}), '150');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({initial_budget: '150'})
    ));
  });
});

/* ════════════════════════════════════════════════════
   TRANSFER RULES — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — transfer rules', () => {

  it('create form defaults free_transfers=1 and transfer_penalty=4', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // aria-labels: "free transfers per gameweek" and "transfer penalty"
    const ftInput = screen.getByRole('spinbutton', {name:'free transfers per gameweek'}) as HTMLInputElement;
    const tpInput = screen.getByRole('spinbutton', {name:'transfer penalty'}) as HTMLInputElement;
    expect(ftInput.value).toBe('1');
    expect(tpInput.value).toBe('4');
  });

  it('includes transfer rules in create payload', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Transfer Test');
    setInputValue(screen.getByRole('spinbutton', {name:'free transfers per gameweek'}), '2');
    setInputValue(screen.getByRole('spinbutton', {name:'transfer penalty'}), '8');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({free_transfers_per_gameweek: 2, transfer_penalty: 8})
    ));
  });

  it('edit modal includes transfer rules in PATCH payload', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({
        free_transfers_per_gameweek: 1,
        transfer_penalty: 4,
      })
    ));
  });
});

/* ════════════════════════════════════════════════════
   POSITION LIMITS — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — position limits', () => {

  it('position rules textarea accepts valid JSON and is included in create payload', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Position Test');
    // fillMinimalCreateForm already sets position rules — just submit
    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({
        position_rules: {GK:2, DEF:5, MID:5, FWD:3},
      })
    ));
  });

  it('shows JSON validation error for malformed position_rules', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
    await user.type(screen.getByRole('textbox', {name:'name'}), 'JSON Test');
    setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
    setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '11');
    setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '4');
    // Malformed content — the component will wrap it with { } and JSON.parse will still fail
    setInputValue(screen.getByRole('textbox', {name:'position rules'}), 'not valid json at all');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    // A JSON parse error must appear (not "Required")
    const errorSpans = document.querySelectorAll('.fa-field-error');
    const hasJsonError = Array.from(errorSpans).some(el =>
      el.textContent !== 'Required' && el.textContent !== '' && el.textContent !== null
    );
    expect(hasJsonError).toBe(true);
    expect(api.adminCreateCompetition).not.toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════
   COMPETITION LIST — new tests
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — competition list display', () => {

  it('shows linked real competition and season in the list', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);

    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    // The linked canonical competition name must appear
    expect(await screen.findByText('Uganda Premier League')).toBeInTheDocument();
    // The season name must appear
    expect(screen.getByText('2026/27')).toBeInTheDocument();
  });

  it('shows competition name and budget in the table', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await openCompetitionsTab(user);

    expect(await screen.findByText('Premier Fantasy')).toBeInTheDocument();
    expect(screen.getByText('100.00M')).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════
   SCORING RULES — new tests
════════════════════════════════════════════════════ */

/** Navigate to the Scoring tab, scoped to a competition that already has rules */
const openScoringTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Scoring' }));
};

describe('FantasyAdminPage — scoring rules', () => {

  // ── helpers shared across tests ──────────────────────────────────────────

  /** Render with a competition that has one scoring rule already present */
  const renderWithRule = () => {
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([competitionWithRules]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
      { code: 'GOALS', label: 'Goals', observed: true },
      { code: 'ASSISTS', label: 'Assists', observed: false },
    ]);
    render(<FantasyAdminPage />);
  };

  // ── create ───────────────────────────────────────────────────────────────

  it('create: Add rule button is disabled when statistic or points is empty', async () => {
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
      { code: 'GOALS', label: 'Goals', observed: true },
    ]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openScoringTab(user);

    const addBtn = await screen.findByRole('button', { name: 'Add rule' });
    // Nothing selected yet — button must be disabled
    expect(addBtn).toBeDisabled();
  });

  it('create: calls adminCreateScoringRule with correct payload and shows success', async () => {
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
      { code: 'GOALS', label: 'Goals', observed: true },
    ]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openScoringTab(user);

    await user.selectOptions(await screen.findByRole('combobox', { name: /statistic type/i }), 'GOALS');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '3');

    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() =>
      expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
        fantasy_competition: 'c1',
        statistic_type: 'GOALS',
        points: '3',
        conditions: {},
        enabled: true,
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Scoring rule added.');
  });

  it('create: shows API error when adminCreateScoringRule rejects', async () => {
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
      { code: 'GOALS', label: 'Goals', observed: true },
    ]);
    vi.mocked(api.adminCreateScoringRule).mockRejectedValueOnce(new Error('Rule already exists'));
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openScoringTab(user);

    await user.selectOptions(await screen.findByRole('combobox', { name: /statistic type/i }), 'GOALS');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '3');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Rule already exists');
  });

  it('create: clears the form fields after a successful submission', async () => {
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
      { code: 'GOALS', label: 'Goals', observed: true },
    ]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openScoringTab(user);

    await user.selectOptions(await screen.findByRole('combobox', { name: /statistic type/i }), 'GOALS');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '3');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalled());
    // After success the points input should be cleared (empty string)
    const pointsInput = screen.getByRole('spinbutton', { name: /points per unit/i }) as HTMLInputElement;
    expect(pointsInput.value).toBe('');
  });

  // ── table display ────────────────────────────────────────────────────────

  it('table: renders existing rules with statistic type, points, and enabled state', async () => {
    renderWithRule();
    await openScoringTab(userEvent.setup());

    expect(await screen.findByText('GOALS')).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument();
    // "Yes" pill for enabled rule
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('table: shows Edit and Delete buttons for each rule', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    expect(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete scoring rule GOALS' })).toBeInTheDocument();
  });

  it('table: shows empty-state row when no rules are configured', async () => {
    // Default mock returns competition with scoring_rules:[]
    const user = userEvent.setup();
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    render(<FantasyAdminPage />);
    await openScoringTab(user);

    expect(await screen.findByText('No scoring rules defined yet.')).toBeInTheDocument();
  });

  // ── edit ─────────────────────────────────────────────────────────────────

  it('edit: opens the Edit Scoring Rule modal when Edit button is clicked', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));

    expect(screen.getByRole('dialog', { name: 'Edit scoring rule' })).toBeVisible();
  });

  it('edit: modal pre-populates points and enabled from the existing rule', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    const pointsInput = within(dialog).getByRole('spinbutton', { name: 'points per unit' }) as HTMLInputElement;
    const enabledCheckbox = within(dialog).getByRole('checkbox', { name: 'rule enabled' }) as HTMLInputElement;

    expect(pointsInput.value).toBe('5.00');
    expect(enabledCheckbox.checked).toBe(true);
  });

  it('edit: calls adminUpdateScoringRule with updated points and enabled', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });

    setInputValue(within(dialog).getByRole('spinbutton', { name: 'points per unit' }), '7');
    await user.click(within(dialog).getByRole('checkbox', { name: 'rule enabled' })); // uncheck

    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    await waitFor(() =>
      expect(api.adminUpdateScoringRule).toHaveBeenCalledWith('sr1', { points: '7', enabled: false })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Scoring rule updated.');
  });

  it('edit: closes the modal after a successful save', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    await waitFor(() => expect(api.adminUpdateScoringRule).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: 'Edit scoring rule' })).not.toBeInTheDocument();
  });

  it('edit: Cancel button dismisses the modal without calling the API', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Edit scoring rule' })).not.toBeInTheDocument();
    expect(api.adminUpdateScoringRule).not.toHaveBeenCalled();
  });

  it('edit: shows an error and does not call API when points is not a number', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    setInputValue(within(dialog).getByRole('spinbutton', { name: 'points per unit' }), '');

    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Points must be a valid number.');
    expect(api.adminUpdateScoringRule).not.toHaveBeenCalled();
  });

  it('edit: shows API error when adminUpdateScoringRule rejects', async () => {
    vi.mocked(api.adminUpdateScoringRule).mockRejectedValueOnce(new Error('Server error'));
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });

  // ── delete ───────────────────────────────────────────────────────────────

  it('delete: clicking Delete opens the confirmation modal with rule name', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Delete scoring rule GOALS' }));

    const dialog = screen.getByRole('dialog', { name: 'Confirm delete' });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText('GOALS')).toBeInTheDocument();
    expect(within(dialog).getByText(/no longer apply/i)).toBeInTheDocument();
  });

  it('delete: Cancel in confirmation modal does not call the API', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Delete scoring rule GOALS' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Confirm delete' })).not.toBeInTheDocument();
    expect(api.adminDeleteScoringRule).not.toHaveBeenCalled();
  });

  it('delete: confirming calls adminDeleteScoringRule with the rule id', async () => {
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Delete scoring rule GOALS' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.adminDeleteScoringRule).toHaveBeenCalledWith('sr1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Scoring rule "GOALS" deleted.');
  });

  it('delete: shows API error when adminDeleteScoringRule rejects', async () => {
    vi.mocked(api.adminDeleteScoringRule).mockRejectedValueOnce(new Error('Cannot delete rule in use'));
    renderWithRule();
    const user = userEvent.setup();
    await openScoringTab(user);

    await user.click(await screen.findByRole('button', { name: 'Delete scoring rule GOALS' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot delete rule in use');
  });
});

/* ════════════════════════════════════════════════════
   JSON OBJECT FIELD AUTO-WRAPPING — new tests
   Verifies that:
   - Braceless input is auto-wrapped before being sent to the API
   - Already-wrapped input is NOT double-wrapped
   - Empty input produces an empty object {}
   - Edit modal strips outer { } when pre-populating from saved data
════════════════════════════════════════════════════ */

describe('FantasyAdminPage — JSON object field auto-wrapping (create form)', () => {

  it('braceless position_rules input is wrapped and parsed into a correct object', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);

    // Enter braceless inner content — the component should wrap it before submitting
    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
    await user.type(screen.getByRole('textbox', {name:'name'}), 'Wrap Test');
    setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
    setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '11');
    setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '4');
    // No outer { } — the component must add them
    setInputValue(screen.getByRole('textbox', {name:'position rules'}), '"GK":2,"DEF":5');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({ position_rules: { GK: 2, DEF: 5 } })
    ));
  });

  it('pre-wrapped position_rules input is NOT double-wrapped', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);

    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
    await user.type(screen.getByRole('textbox', {name:'name'}), 'No Double Wrap');
    setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
    setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '11');
    setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '4');
    // User accidentally types the outer braces — should NOT produce {{...}}
    setInputValue(screen.getByRole('textbox', {name:'position rules'}), '{"GK":2,"DEF":5}');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({ position_rules: { GK: 2, DEF: 5 } })
    ));
  });

  it('empty position_rules input produces an empty object {}', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);

    await user.selectOptions(screen.getByRole('combobox', {name:'Real competition / league *'}), 'real-c1');
    await user.selectOptions(screen.getByRole('combobox', {name:'Season *'}), 's1');
    await user.type(screen.getByRole('textbox', {name:'name'}), 'Empty Rules');
    setInputValue(screen.getByRole('spinbutton', {name:'squad size'}), '15');
    setInputValue(screen.getByRole('spinbutton', {name:'starting lineup size'}), '11');
    setInputValue(screen.getByRole('spinbutton', {name:'bench size'}), '4');
    // Leave position_rules empty — should become {}
    setInputValue(screen.getByRole('textbox', {name:'position rules'}), '');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({ position_rules: {} })
    ));
  });

  it('braceless formation_rules input is wrapped and parsed correctly', async () => {
    vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue(canonicalOptions);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);

    await fillMinimalCreateForm(user, 'Formation Wrap Test');
    // Enter braceless formation rules
    setInputValue(screen.getByRole('textbox', {name:'formation rules'}), '"GK":{"min":1,"max":1},"DEF":{"min":3,"max":5}');

    await user.click(screen.getByRole('button', {name:'Create competition'}));

    await waitFor(() => expect(api.adminCreateCompetition).toHaveBeenCalledWith(
      expect.objectContaining({
        formation_rules: { GK: { min: 1, max: 1 }, DEF: { min: 3, max: 5 } },
      })
    ));
  });
});

describe('FantasyAdminPage — JSON object field auto-wrapping (edit modal)', () => {

  it('edit modal pre-populates position_rules WITHOUT outer braces', async () => {
    // competition fixture has position_rules: {Goalkeeper:2, Forward:3}
    // After editableCompetition() strips braces, the textarea should show
    // the inner content only (no leading { or trailing })
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    const posRulesTextarea = within(dialog).getByRole('textbox', {name:'position rules'}) as HTMLTextAreaElement;

    // Value must NOT start with { or end with }
    expect(posRulesTextarea.value.trim()).not.toMatch(/^\{/);
    expect(posRulesTextarea.value.trim()).not.toMatch(/\}$/);
    // But the keys must be present
    expect(posRulesTextarea.value).toContain('"Goalkeeper"');
  });

  it('edit modal pre-populates formation_rules WITHOUT outer braces', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    const fmtTextarea = within(dialog).getByRole('textbox', {name:'formation rules'}) as HTMLTextAreaElement;

    // The outer leading { must be stripped — inner values can still contain }
    expect(fmtTextarea.value.trim()).not.toMatch(/^\{/);
    // The content must not be a complete {...} wrapped object (i.e. no leading brace)
    expect(fmtTextarea.value.trim().startsWith('{')).toBe(false);
    expect(fmtTextarea.value).toContain('"Goalkeeper"');
  });

  it('edit modal pre-populates prize_metadata WITHOUT outer braces', async () => {
    // competition fixture has prize_metadata: {winner:'Cup'}
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    const prizeTextarea = within(dialog).getByRole('textbox', {name:'prize metadata'}) as HTMLTextAreaElement;

    expect(prizeTextarea.value.trim()).not.toMatch(/^\{/);
    expect(prizeTextarea.value.trim()).not.toMatch(/\}$/);
    expect(prizeTextarea.value).toContain('"winner"');
  });

  it('edit modal saves braceless position_rules as a correct parsed object', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    // Override position rules with braceless content
    setInputValue(within(dialog).getByRole('textbox', {name:'position rules'}), '"GK":1,"FWD":2');

    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({ position_rules: { GK: 1, FWD: 2 } })
    ));
  });

  it('edit modal does not double-wrap pre-wrapped position_rules', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    // User types with braces — must not produce nested {{...}}
    setInputValue(within(dialog).getByRole('textbox', {name:'position rules'}), '{"GK":1,"FWD":2}');

    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({ position_rules: { GK: 1, FWD: 2 } })
    ));
  });

  it('edit modal saves empty prize_metadata as empty object {}', async () => {
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await openCompetitionsTab(user);
    await user.click(screen.getByRole('button', {name:'Edit'}));

    const dialog = screen.getByRole('dialog', {name:'Edit Fantasy competition'});
    setInputValue(within(dialog).getByRole('textbox', {name:'prize metadata'}), '');

    await user.click(within(dialog).getByRole('button', {name:'Save competition'}));

    await waitFor(() => expect(api.adminUpdateCompetition).toHaveBeenCalledWith(
      'c1', expect.objectContaining({ prize_metadata: {} })
    ));
  });
});

/* ════════════════════════════════════════════════════
   SCORING RULE TYPES — Phase 3 tests
   Covers all 16 required scenarios from the spec.
════════════════════════════════════════════════════ */

/** Competition fixture that exposes real position_rules so POSITION form works */
const competitionWithPositions = {
  ...competition,
  position_rules: { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  scoring_rules: [],
};

const scoreRuleWithType = (overrides: Partial<FantasyScoringRule> & { rule_type?: ScoringRuleType } = {}): FantasyScoringRule => ({
  ...scoringRule,
  ...overrides,
});

const setupScoringTab = async (user: ReturnType<typeof userEvent.setup>, comp = competition) => {
  vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([comp]);
  vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([
    { code: 'GOALS', label: 'Goals', observed: true },
    { code: 'MINUTES_PLAYED', label: 'Minutes played', observed: true },
    { code: 'SAVES', label: 'Saves', observed: true },
    { code: 'PENALTIES_SAVED', label: 'Penalties saved', observed: false },
    { code: 'CLEAN_SHEETS', label: 'Clean sheets', observed: false },
  ]);
  render(<FantasyAdminPage />);
  await user.click(await screen.findByRole('button', { name: 'Scoring' }));
  // Wait for statistic type selector to be in the DOM
  await screen.findByRole('combobox', { name: /statistic type/i });
};

describe('FantasyAdminPage — scoring rule types: form rendering', () => {

  it('T01 PER_UNIT: default rule type is PER_UNIT and shows points input', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    const rtSelect = screen.getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement;
    expect(rtSelect.value).toBe('PER_UNIT');
    expect(screen.getByRole('spinbutton', { name: /points per unit/i })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /bracket minimum/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /per n value/i })).not.toBeInTheDocument();
  });

  it('T02 FLAT: selecting FLAT shows points input and no condition fields', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'FLAT');
    expect(screen.getByRole('spinbutton', { name: /points per unit/i })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /bracket minimum/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /per n value/i })).not.toBeInTheDocument();
  });

  it('T03 BRACKET: selecting BRACKET shows min and max inputs', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    expect(screen.getByRole('spinbutton', { name: /bracket minimum/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /bracket maximum/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /points per unit/i })).toBeInTheDocument();
  });

  it('T04 BRACKET null max: max input empty means no upper bound', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    const maxInput = screen.getByRole('spinbutton', { name: /bracket maximum/i }) as HTMLInputElement;
    // Default value is empty — no upper bound
    expect(maxInput.value).toBe('');
  });

  it('T05 PER_N: selecting PER_N shows per_n input', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'PER_N');
    expect(screen.getByRole('spinbutton', { name: /per n value/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /points per unit/i })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /bracket minimum/i })).not.toBeInTheDocument();
  });

  it('T06 POSITION: selecting POSITION shows position inputs from competition.position_rules', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user, competitionWithPositions);
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'POSITION');
    // Each position in position_rules gets its own input
    expect(screen.getByRole('spinbutton', { name: 'position points GK' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'position points DEF' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'position points MID' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'position points FWD' })).toBeInTheDocument();
    // Points per unit input is hidden for POSITION
    expect(screen.queryByRole('spinbutton', { name: /points per unit/i })).not.toBeInTheDocument();
  });

  it('T07 switching rule type clears incompatible conditions', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    // Enter BRACKET conditions
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket minimum/i }), '1');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket maximum/i }), '59');
    // Switch to PER_UNIT — bracket fields disappear
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'PER_UNIT');
    expect(screen.queryByRole('spinbutton', { name: /bracket minimum/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /bracket maximum/i })).not.toBeInTheDocument();
  });
});

describe('FantasyAdminPage — scoring rule types: correct payloads', () => {

  it('T08 PER_UNIT: sends correct payload', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'GOALS');
    // Rule type already PER_UNIT by default
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '5');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
      fantasy_competition: 'c1',
      statistic_type: 'GOALS',
      rule_type: 'PER_UNIT',
      points: '5',
      conditions: {},
      enabled: true,
    }));
  });

  it('T09 BRACKET with max: sends correct payload', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'MINUTES_PLAYED');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket minimum/i }), '1');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket maximum/i }), '59');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '1');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
      fantasy_competition: 'c1',
      statistic_type: 'MINUTES_PLAYED',
      rule_type: 'BRACKET',
      points: '1',
      conditions: { min: 1, max: 59 },
      enabled: true,
    }));
  });

  it('T09b BRACKET with no max: sends null for max (no upper bound)', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'MINUTES_PLAYED');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket minimum/i }), '60');
    // Leave max empty → no upper bound
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '2');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
      fantasy_competition: 'c1',
      statistic_type: 'MINUTES_PLAYED',
      rule_type: 'BRACKET',
      points: '2',
      conditions: { min: 60, max: null },
      enabled: true,
    }));
  });

  it('T10 PER_N: sends correct payload', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'SAVES');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'PER_N');
    setInputValue(screen.getByRole('spinbutton', { name: /per n value/i }), '3');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '1');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
      fantasy_competition: 'c1',
      statistic_type: 'SAVES',
      rule_type: 'PER_N',
      points: '1',
      conditions: { per_n: 3 },
      enabled: true,
    }));
  });

  it('T11 POSITION: sends correct payload with 0 points as string', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user, competitionWithPositions);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'GOALS');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'POSITION');
    setInputValue(screen.getByRole('spinbutton', { name: 'position points GK' }), '10');
    setInputValue(screen.getByRole('spinbutton', { name: 'position points DEF' }), '6');
    setInputValue(screen.getByRole('spinbutton', { name: 'position points MID' }), '5');
    setInputValue(screen.getByRole('spinbutton', { name: 'position points FWD' }), '4');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.adminCreateScoringRule).toHaveBeenCalledWith({
      fantasy_competition: 'c1',
      statistic_type: 'GOALS',
      rule_type: 'POSITION',
      points: '0',
      conditions: { positions: { GK: 10, DEF: 6, MID: 5, FWD: 4 } },
      enabled: true,
    }));
  });
});

describe('FantasyAdminPage — scoring rule types: validation', () => {

  it('T12 BRACKET invalid: missing min shows error, does not call API', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'MINUTES_PLAYED');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    // Leave min empty
    setInputValue(screen.getByRole('spinbutton', { name: /bracket maximum/i }), '59');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '1');
    // Add button should be disabled because min is empty
    expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled();
    expect(api.adminCreateScoringRule).not.toHaveBeenCalled();
  });

  it('T12b BRACKET invalid: max <= min shows error via validateConditions', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'MINUTES_PLAYED');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'BRACKET');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket minimum/i }), '60');
    setInputValue(screen.getByRole('spinbutton', { name: /bracket maximum/i }), '59'); // max < min
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '1');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/maximum must be greater/i);
    expect(api.adminCreateScoringRule).not.toHaveBeenCalled();
  });

  it('T13 PER_N invalid: per_n < 1 is disabled', async () => {
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'SAVES');
    await user.selectOptions(screen.getByRole('combobox', { name: /rule type/i }), 'PER_N');
    // Leave per_n empty — button should be disabled
    expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled();
    expect(api.adminCreateScoringRule).not.toHaveBeenCalled();
  });
});

describe('FantasyAdminPage — scoring rule types: edit existing rule', () => {

  it('T14 existing PER_UNIT rule can be edited (backward compatible)', async () => {
    const rule = scoreRuleWithType({ rule_type: 'PER_UNIT', conditions: {} });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'GOALS', label: 'Goals', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });

    // rule_type selector should be PER_UNIT
    const rtSelect = within(dialog).getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement;
    expect(rtSelect.value).toBe('PER_UNIT');
    // Points pre-populated
    const pts = within(dialog).getByRole('spinbutton', { name: 'points per unit' }) as HTMLInputElement;
    expect(pts.value).toBe('5.00');

    setInputValue(pts, '7');
    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    await waitFor(() => expect(api.adminUpdateScoringRule).toHaveBeenCalledWith(
      'sr1',
      expect.objectContaining({ points: '7', enabled: true, rule_type: 'PER_UNIT', conditions: {} })
    ));
  });

  it('T15 legacy rule without rule_type defaults to PER_UNIT in edit modal', async () => {
    // Simulate a rule that came from before Phase 1 — no rule_type field
    const legacyRule = { id: 'sr-legacy', fantasy_competition: 'c1', statistic_type: 'ASSISTS', points: '3.00', conditions: {}, enabled: true } as typeof scoringRule;
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [legacyRule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'ASSISTS', label: 'Assists', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule ASSISTS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });

    // Should default to PER_UNIT
    const rtSelect = within(dialog).getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement;
    expect(rtSelect.value).toBe('PER_UNIT');
  });

  it('T16 backend 400 error is displayed in the alert banner', async () => {
    vi.mocked(api.adminCreateScoringRule).mockRejectedValueOnce(new Error('Duplicate rule for this statistic'));
    const user = userEvent.setup();
    await setupScoringTab(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /statistic type/i }), 'GOALS');
    setInputValue(screen.getByRole('spinbutton', { name: /points per unit/i }), '5');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Duplicate rule for this statistic');
  });

  it('BRACKET rule pre-populates min and max in edit modal', async () => {
    const bracketRule = scoreRuleWithType({
      rule_type: 'BRACKET',
      points: '1.00',
      conditions: { min: 1, max: 59 },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [bracketRule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'GOALS', label: 'Goals', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });

    expect((within(dialog).getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement).value).toBe('BRACKET');
    expect((within(dialog).getByRole('spinbutton', { name: /bracket minimum/i }) as HTMLInputElement).value).toBe('1');
    expect((within(dialog).getByRole('spinbutton', { name: /bracket maximum/i }) as HTMLInputElement).value).toBe('59');
    expect((within(dialog).getByRole('spinbutton', { name: 'points per unit' }) as HTMLInputElement).value).toBe('1.00');
  });

  it('BRACKET no-upper-bound rule pre-populates empty max in edit modal', async () => {
    const bracketRule = scoreRuleWithType({
      rule_type: 'BRACKET',
      points: '2.00',
      conditions: { min: 60, max: null },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [bracketRule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'GOALS', label: 'Goals', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    expect((within(dialog).getByRole('spinbutton', { name: /bracket minimum/i }) as HTMLInputElement).value).toBe('60');
    expect((within(dialog).getByRole('spinbutton', { name: /bracket maximum/i }) as HTMLInputElement).value).toBe('');
  });

  it('PER_N rule pre-populates per_n in edit modal', async () => {
    const perNRule = scoreRuleWithType({
      rule_type: 'PER_N',
      points: '1.00',
      conditions: { per_n: 3 },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [perNRule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'SAVES', label: 'Saves', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    expect((within(dialog).getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement).value).toBe('PER_N');
    expect((within(dialog).getByRole('spinbutton', { name: /per n value/i }) as HTMLInputElement).value).toBe('3');
  });

  it('POSITION rule pre-populates position points in edit modal', async () => {
    const posRule = scoreRuleWithType({
      rule_type: 'POSITION',
      points: '0.00',
      conditions: { positions: { GK: 10, DEF: 6, MID: 5, FWD: 4 } },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{
      ...competitionWithPositions,
      scoring_rules: [posRule],
    }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([{ code: 'GOALS', label: 'Goals', observed: true }]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));

    await user.click(await screen.findByRole('button', { name: 'Edit scoring rule GOALS' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit scoring rule' });
    expect((within(dialog).getByRole('combobox', { name: /rule type/i }) as HTMLSelectElement).value).toBe('POSITION');
    expect((within(dialog).getByRole('spinbutton', { name: 'position points GK' }) as HTMLInputElement).value).toBe('10');
    expect((within(dialog).getByRole('spinbutton', { name: 'position points FWD' }) as HTMLInputElement).value).toBe('4');
  });
});

describe('FantasyAdminPage — rule description display', () => {

  it('PER_UNIT rule shows readable description in table', async () => {
    const rule = scoreRuleWithType({ rule_type: 'PER_UNIT', points: '5.00', statistic_type: 'GOALS' });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));
    expect(await screen.findByText('5.00 pts per goals')).toBeInTheDocument();
  });

  it('BRACKET rule shows range description in table', async () => {
    const rule = scoreRuleWithType({
      rule_type: 'BRACKET', points: '1.00', statistic_type: 'MINUTES_PLAYED',
      conditions: { min: 1, max: 59 },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));
    expect(await screen.findByText(/1–59 → 1 pt/)).toBeInTheDocument();
  });

  it('BRACKET no-max rule shows plus description in table', async () => {
    const rule = scoreRuleWithType({
      rule_type: 'BRACKET', points: '2.00', statistic_type: 'MINUTES_PLAYED',
      conditions: { min: 60, max: null },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));
    expect(await screen.findByText(/60\+ → 2 pts/)).toBeInTheDocument();
  });

  it('PER_N rule shows per-N description in table', async () => {
    const rule = scoreRuleWithType({
      rule_type: 'PER_N', points: '1.00', statistic_type: 'SAVES',
      conditions: { per_n: 3 },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));
    expect(await screen.findByText('1.00 pt per 3 saves')).toBeInTheDocument();
  });

  it('POSITION rule shows position summary in table', async () => {
    const rule = scoreRuleWithType({
      rule_type: 'POSITION', points: '0.00', statistic_type: 'GOALS',
      conditions: { positions: { GK: 10, DEF: 6, MID: 5, FWD: 4 } },
    });
    vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([{ ...competition, scoring_rules: [rule] }]);
    vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<FantasyAdminPage />);
    await user.click(await screen.findByRole('button', { name: 'Scoring' }));
    expect(await screen.findByText('GK 10 • DEF 6 • MID 5 • FWD 4')).toBeInTheDocument();
  });
});
