# Fantasy Competition Module Documentation

## Overview

The `pages/fan/fantasy/` module implements a complete fantasy sports experience supporting **Football**, **Rugby**, and **Basketball**. Users can discover competitions, review rules, join leagues, build squads, set lineups, make transfers, and view standings.

---

## File Structure

| File | Purpose |
|------|---------|
| `../FantasyCompetitions.tsx` | **Main orchestrator** — contains all state, mock data, business logic, and step routing |
| `section/CompetitionCard.tsx` | Displays a single competition card with media, stats, and join CTA |
| `section/PlayerRow.tsx` | Reusable player list item used across squad, lineup, and transfer flows |
| `section/SportFilter.tsx` | Top-bar tab switcher for Football / Rugby / Basketball |
| `section/StandingsTable.tsx` | Leaderboard table plus transparent scoring corrections log |
| `section/FootballPitch.tsx` | Interactive SVG pitch with draggable-style formation markers (Football only) |
| `../FantasyCompetitions.css` | Full module styles — dark theme, responsive, reduced-motion aware |

---

## Types & Data Model

### Core Types (`FantasyCompetitions.tsx`)

```typescript
export type Sport = 'football' | 'rugby' | 'basketball';

export interface Competition {
  id: string;
  sport: Sport;
  name: string;
  image: string;
  entryType: 'public' | 'private';
  managers: number;
  prizePool: string;
  gameweek: string;
  rulesSummary: string;
}

export interface Player {
  id: string;
  sport: Sport;
  name: string;
  club: string;
  position: string;
  price: number;
  expectedPoints: number;
  status: 'available' | 'injured' | 'suspended' | 'doubtful';
  image: string;
  number?: number;
}

export interface StandingEntry {
  rank: number;
  manager: string;
  teamName: string;
  points: number;
  captainPoints: number;
  transferHits: number;
  isCurrentUser?: boolean;
}

export interface ScoringCorrection {
  id: string;
  type: string;
  description: string;
  player: string;
  gameweek: number;
  pointsDelta: number;
}

interface PositionRule {
  name: string;
  min: number;
  max: number;
}

interface SquadRules {
  budget: number;
  squadSize: number;
  startingSize: number;
  positions: PositionRule[];
}
```

### Step Flow

```typescript
type StepId =
  | 'discover'
  | 'rules'
  | 'join'
  | 'team-setup'
  | 'squad'
  | 'lineup'
  | 'gameweek'
  | 'live-points'
  | 'transfers'
  | 'standings'
  | 'notifications';
```

Steps 4–10 (`team-setup` through `standings`) require league membership AND team setup completion. `notifications` is publicly accessible.

---

## Component Breakdown

### `FantasyCompetitions` (Main Page)

**State managed:**
- `sport` — active sport filter
- `selectedCompetitionId` — currently viewed competition
- `step` — current flow step
- Join state: `privateOpen`, `inviteCode`, `joinError`, `myLeagues`, `createModalOpen`, `createdLeague`
- Team setup: `teamName`, `favoriteClub`, `teamAvatar`, `teamSetupComplete`
- Squad state: `squadIds`, `squadError`, `formation`, `saveMessage`
- Lineup state: `startingIds`, `captainId`, `viceId`, `lineupError`, `selectedPlayerId`, `benchOrder`
- Transfer state: `freeTransfers`, `transferHits`, `transferOutId`, `pendingTransferInId`, `transferMessage`, `showTransferConfirm`
- Gameweek state: `minutesPlayed`, `simulated`
- Notifications: `notifications`

**Key behaviors:**
- Resets all downstream state when sport changes
- Guards against accessing join-required steps without a league
- Guards against accessing team-dependent steps without team setup
- Validates squad/lineup/transfer rules before allowing progression
- Provides `EmptyPrompt` fallback when steps are accessed out of order
- Two-tier step locking: `requiresJoin` and `requiresTeamSetup`

### `SportFilter`

**Props:** `active`, `onChange`, `accents`

Renders three pill-shaped tabs. Active tab receives a tinted background and border using the sport-specific accent color.

### `CompetitionCard`

**Props:** `competition`, `accent`, `isSelected`, `onSelect`

Displays competition image, entry-type pill (Public/Private), gameweek badge, name, rules summary, manager count, prize pool, and a CTA button.

### `PlayerRow`

**Props:** `player`, `mode` (`pick` | `squad` | `starting`), `selected`, `isCaptain`, `isVice`, `disabledReason`, `actionLabel`, `onAction`, `secondaryAction`

Universal player row used in:
- **pick** — available players to add to squad
- **squad** — players in current squad (remove action)
- **starting** — squad players with captain/vice-captain options

Shows avatar, name, club, position, status chip, expected points, price, and action buttons. Injured/suspended players are visually dimmed and disabled in `pick` mode.

### `FootballPitch`

**Props:** `formationId`, `goalkeepers`, `defenders`, `midfielders`, `forwards`, `onPlayerClick`

Renders an SVG football pitch with:
- Penalty boxes, center circle, goal areas
- Position markers for GK, DEF, MID, FWD according to selected formation
- Empty slots show dashed placeholders
- Filled slots are clickable buttons that fire `onPlayerClick`

**Supported formations:** `4-3-3`, `4-4-2`, `3-5-2`, `4-2-3-1`, `3-4-3`

### `StandingTable`

**Props:** `standings`, `corrections`, `accent`

Renders:
- Leaderboard table (Rank, Manager, Team, Captain pts, Transfer hits, Total)
- Top-3 rows highlighted with accent color
- Current user row highlighted with accent border
- Scoring corrections log with type tags, descriptions, and point deltas

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                     │
│     • Select sport (Football / Rugby / Basketball)              │
│     • Browse competition cards                                  │
│     • Click "View & join" on a competition                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. RULES                                                        │
│     • View squad basics (size, budget, captain, transfers)      │
│     • View position quotas                                     │
│     • View sport-specific scoring examples                      │
│     • Click "Continue to join a league"                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. JOIN                                                         │
│     • Option A: "Join public league"                            │
│     • Option B: "Join existing private league" → enter code     │
│     • Option C: "Create a new league" → opens modal             │
│     • After join/create → shows success with invite code/link   │
│     • Click "Continue to Team Setup"                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. TEAM SETUP (Join required 🔒)                               │
│     • Enter team name (min 3 characters)                        │
│     • Optional: favorite club, team avatar URL                  │
│     • Mock duplicate name validation                            │
│     • Click "Create Team & Continue"                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. SQUAD (Join + Team Setup required 🔒)                       │
│     • Budget: 100 credits                                        │
│     • Sport-specific squad size and position quotas             │
│     • Real-time quota chips (Goalkeepers: 1/2 ✔)               │
│     • Add/remove players from position groups                   │
│     • Validation: injured/suspended blocked, budget enforced    │
│     • Click "Save team" → "Continue to Lineup"                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. LINEUP (Join + Team Setup required 🔒)                      │
│     • Select starting XI / 6 / 5 depending on sport             │
│     • Choose captain (2x points)                                │
│     • Choose vice-captain                                       │
│     • Deadline banner with formatted date/time                  │
│     • Auto-substitution rule explanation                        │
│     • Formation switching (Football only)                       │
│     • Validation: exact starting count, captain + vice required │
│     • Click "Confirm lineup" → "Gameweek"                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. GAMEWEEK (Join + Team Setup required 🔒)                    │
│     • View current gameweek fixtures                            │
│     • Simulate gameweek results                                 │
│     • Apply auto-substitutions                                  │
│     • Auto-substitution rule explanation                        │
│     • Click "Live Points" or "Transfers"                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. LIVE POINTS (Join + Team Setup required 🔒)                 │
│     • View live points breakdown                                │
│     • See captain/vice-captain impact                           │
│     • Review scoring details                                    │
│     • Rank change indicator                                     │
│     • Click "Transfers" or "Standings"                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. TRANSFERS (Join + Team Setup required 🔒)                   │
│     • Transfer summary card (free transfers, cost, budget)      │
│     • Select player OUT → select replacement IN                 │
│     • Confirmation modal with budget/projected gain             │
│     • Budget enforced, injured/suspended blocked                │
│     • Auto-updates starting lineup if transferred player was    │
│       starting (captain/vice cleared if affected)               │
│     • Click "View standings"                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. STANDINGS (Join + Team Setup required 🔒)                  │
│     • Leaderboard table with current user highlight             │
│     • Top-3 rows highlighted                                    │
│     • Scoring corrections log with transparent deltas          │
│     • Click "View notifications"                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  11. NOTIFICATIONS (Public)                                      │
│     • Deadline reminders                                        │
│     • Injury updates                                            │
│     • Captain scored notifications                              │
│     • Transfer confirmations                                    │
│     • Scoring corrections                                       │
│     • Mark as read/unread                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Step | Rule | Consequence |
|------|------|-------------|
| Join | Invite code < 5 chars | Error message |
| Team Setup | Team name < 3 chars | Button disabled |
| Squad | Injured / Suspended | Cannot add |
| Squad | Max position count | Blocked |
| Squad | Budget > 100 | Blocked |
| Squad | Squad size reached | Blocked |
| Lineup | Starting count != required | Cannot confirm |
| Lineup | Captain not selected | Cannot confirm |
| Lineup | Vice not selected | Cannot confirm |
| Gameweek | No starters selected | Cannot simulate |
| Transfers | Inbound player injured/suspended | Blocked |
| Transfers | Budget exceeded | Blocked |
| Transfers | No player selected OUT | Prompt to select first |

---

## Private League Creation & Invitation Flow

### Creation
1. User clicks "Create a new league" on Join step
2. Modal opens with league configuration form
3. User fills: name, visibility, max managers, season length, entry fee
4. On submit:
   - League created with unique ID
   - If private: auto-generates invite code (format: `ABC-1234`)
   - Creates shareable link: `https://leagueos.app/fantasy/join?code={code}`
   - Shows success screen in modal with code
5. Modal closes, parent shows expanded success screen with:
   - League name
   - Invite code (with copy button)
   - Invite link (with copy button)
   - "Continue to Team Setup" button

### Joining
1. User clicks "Join existing private league"
2. Form expands for invite code entry
3. Validates: minimum 5 characters
4. On success: joins league and proceeds to Team Setup
5. On error: shows validation message

---

## Mock Data Summary

- **9 competitions** (3 per sport: 6 public, 3 private)
- **26 players** (Football: 14, Rugby: 12, Basketball: 12)
- **6 standings entries** per sport (including current user)
- **4 scoring corrections** per sport
- **7 notifications** (various types)

---

## Styling Notes

- **Dark theme** with CSS variables for accent, panel, and text colors
- **Sports accent colors:** Football = `#22c55e` (green), Rugby = `#f97316` (orange), Basketball = `#a855f7` (purple)
- **Fonts:** Rajdhani (headings), Inter (body), JetBrains Mono (numbers)
- **Responsive breakpoints:** 900px (stack grids), 560px (compact pitch and padding)
- **Accessibility:** `aria-label`, `aria-pressed`, `aria-hidden`, focus-visible outlines, reduced-motion support
- **Sidebar:** Fixed position on desktop (260px), slides in from left on mobile
- **Sticky elements:** Topbar (top: 0), Step nav (top: 73px), Scoreboard (top: 117px)

---

## Integration

The module is consumed via:

```tsx
// App.tsx (or route)
import FantasyCompetitions from './pages/fan/fantasy/FantasyCompetitions';

<FantasyCompetitions />
```

No external routing or API calls — fully self-contained with in-memory mock data.

---

## Key Features

### Squad Builder
- Real-time quota chips showing position counts
- Budget tracking with remaining credits
- Player status indicators (available, injured, suspended, doubtful)
- Save team with validation feedback

### Lineup Management
- Interactive pitch/court/field visualization
- Formation switching (Football)
- Captain and vice-captain selection with badges
- Bench order management with up/down controls
- Deadline banner with formatted date/time

### Gameweek Hub
- Fixture list with status indicators
- Simulate results button with auto-substitution
- Links to Live Points and Transfers

### Live Points
- Mock real-time scoring dashboard
- Captain points impact display
- Rank change indicator
- Player-by-player breakdown

### Transfers
- Transfer summary card
- Two-panel layout (current squad vs replacements)
- Confirmation modal with projected gain
- Budget and hit tracking

### Standings
- Leaderboard with current user highlight
- Top-3 row highlighting
- Transparent scoring corrections log

### Notifications
- Multiple notification types
- Read/unread status
- Mark as read toggle
- Timestamps

---

## State Management

### Team Setup State
```typescript
const [teamName, setTeamName] = useState('');
const [favoriteClub, setFavoriteClub] = useState('');
const [teamAvatar, setTeamAvatar] = useState<string | null>(null);
const [teamSetupComplete, setTeamSetupComplete] = useState(false);
```

### League Creation State
```typescript
const [createModalOpen, setCreateModalOpen] = useState(false);
const [createdLeague, setCreatedLeague] = useState<{
  name: string;
  inviteCode: string;
  inviteLink: string;
} | null>(null);
```

### Transfer Confirmation State
```typescript
const [showTransferConfirm, setShowTransferConfirm] = useState(false);
```

### Step Access Control
```typescript
const canAccessStep = (targetStep: StepId): boolean => {
  const meta = STEPS.find((s) => s.id === targetStep);
  if (!meta) return false;
  if (meta.requiresJoin && !joinedLeague) return false;
  if (meta.requiresTeamSetup && !teamSetupComplete) return false;
  return true;
};
```

---

## Accessibility

- All buttons have `aria-label` or visible text
- Toggle buttons use `aria-pressed`
- Navigation has `aria-label="Fantasy league flow"`
- Form inputs have associated labels
- Focus-visible outlines on all interactive elements
- Reduced-motion support via `prefers-reduced-motion`
- Locked steps show visual lock icon and are disabled
- Empty prompts guide users back to required steps