# Fantasy Competition Module — League OS

Complete fantasy sports experience supporting **Football**, **Rugby**, and **Basketball**. Users discover competitions, review rules, join/create leagues, set up teams, build squads, arrange lineups, monitor gameweeks, track live points, make transfers, review standings, and receive notifications.

---

## Quick Start

The module is fully self-contained with in-memory mock data. No external APIs or routing dependencies.

```tsx
// App.tsx (or route)
import FantasyCompetitions from './pages/fan/fantasy/FantasyCompetitions';

<FantasyCompetitions />
```

---

## File Structure

```
src/pages/fan/fantasy/
├── FantasyCompetitions.tsx          # Main orchestrator — state, mock data, business logic, step routing
├── FantasyCompetitions.css          # Full module styles — dark theme, responsive, reduced-motion aware
├── README.md                        # This documentation
└── section/                         # Reusable/presentational components
    ├── BasketballCourt.tsx          # Basketball court SVG visualization
    ├── CompetitionCard.tsx          # Competition card with media, stats, join CTA
    ├── CreateLeagueModal.tsx        # Private/public league creation modal
    ├── FantasyNotifications.tsx     # Notifications panel (mark as read, badge)
    ├── FootballPitch.tsx            # Interactive SVG football pitch (formations)
    ├── GameweekHub.tsx              # Gameweek fixtures, deadlines, simulation
    ├── LineupSurface.tsx            # Sport-adaptive lineup visualization
    ├── lineupUtils.ts               # Auto-substitution & vice-captain fallback logic
    ├── LivePointsPanel.tsx          # Real-time mock points dashboard
    ├── MyLeaguesPanel.tsx           # User's joined leagues quick actions
    ├── PlayerMarker.tsx             # Position marker on pitch/court/field
    ├── PlayerRow.tsx                # Reusable player list row
    ├── README.md                    # Section components documentation
    ├── RugbyField.tsx               # Rugby field SVG visualization
    ├── SportFilter.tsx              # Sport tab switcher (Football/Rugby/Basketball)
    └── StandingsTable.tsx           # Leaderboard + scoring corrections log
```

---

## Step Flow

The module implements a complete 11-step fantasy lifecycle:

```text
1 · Discover      → Browse competitions by sport
2 · Rules         → Squad basics, position quotas, scoring examples
3 · Join          → Public / Existing Private / Create Private league
     ↓ (after private league creation)
     🎉 League Created Successfully (invite code + invite link + copy/share)
4 · Team Setup    → Team name, favorite club, avatar
5 · Squad         → Pick players within budget, meet position quotas
6 · Lineup        → Starters, captain (2x), vice-captain, bench order, formation
7 · Gameweek      → Fixtures, deadlines, auto-substitution, simulate results
8 · Live Points   → Real-time mock scoring, captain impact, rank change
9 · Transfers     → IN/OUT selection, confirmation modal, budget tracking
10 · Standings    → Leaderboard with current-user highlight, corrections log
11 · Notifications → Deadline, injury, transfer, correction alerts
```

### Step Locking Rules

| Step | Requires League Membership | Requires Team Setup |
|------|:---:|:---:|
| Discover | ❌ | ❌ |
| Rules | ❌ | ❌ |
| Join | ❌ | ❌ |
| Team Setup | ✅ | ❌ |
| Squad | ✅ | ✅ |
| Lineup | ✅ | ✅ |
| Gameweek | ✅ | ✅ |
| Live Points | ✅ | ✅ |
| Transfers | ✅ | ✅ |
| Standings | ✅ | ✅ |
| Notifications | ❌ | ❌ |

Locked steps show a 🔒 icon and are visually disabled.

---

## Private League Creation & Invitation Flow

### Flow (Mandatory)

```text
CREATE PRIVATE LEAGUE
        ↓
LEAGUE CREATED SUCCESSFULLY
        ↓
DISPLAY INVITE CODE
        ↓
DISPLAY INVITE LINK
        ↓
COPY / SHARE
        ↓
CONTINUE TO TEAM SETUP
        ↓
SQUAD
```

**Critical:** Private league creation DOES NOT jump directly to Squad. The user must see the invitation success screen and explicitly click "Continue to Team Setup".

### Invite Code Generation

Generated **once** at league creation time inside `handleCreateLeague`:

```text
Format: XXX-XXXX
Example: KLA-7F2Q, UGA-9XLM, FANT-24AB
```

The code is stored in `createdLeague` state and **never regenerates** on re-renders.

### Invite Link

```text
{window.location.origin}/fantasy/join?code={inviteCode}
Example: https://leagueos.app/fantasy/join?code=KLA-7F2Q
```

### Success Screen Actions

| Action | Implementation |
|--------|----------------|
| Copy Code | `navigator.clipboard.writeText(inviteCode)` with "Copied!" feedback |
| Copy Link | `navigator.clipboard.writeText(inviteLink)` with "Copied!" feedback |
| Share Invite | `navigator.share()` with clipboard fallback for unsupported browsers |
| Continue to Team Setup | `setStep('team-setup')` — the only path forward |

### Invite Link URL Handling

When the module loads with `?code=INVITE_CODE` in the URL:

1. Reads code via `new URLSearchParams(window.location.search).get('code')`
2. Pre-fills the invite-code field
3. Opens the "Join existing private league" form
4. User must explicitly confirm joining (no auto-join)

---

## Three Distinct Join Actions

### 1. Join Public League
- Immediately joins the open competition
- No invite code generated
- Proceeds to Team Setup

### 2. Join Existing Private League
- Enter/receive invite code
- Validate code (min 5 characters)
- Join existing private league
- No new invite code generated
- Proceeds to Team Setup
- **Never** shows "League Created Successfully"

### 3. Create Private League
- Opens CreateLeagueModal
- Creates league with unique ID
- Generates invite code + invite link
- Shows success screen with code/link
- Only then proceeds to Team Setup

---

## Key State Management

```typescript
// League creation
const [createdLeague, setCreatedLeague] = useState<{
  name: string;
  inviteCode: string;
  inviteLink: string;
} | null>(null);

const [createModalOpen, setCreateModalOpen] = useState(false);

// Team setup
const [teamName, setTeamName] = useState('');
const [favoriteClub, setFavoriteClub] = useState('');
const [teamAvatar, setTeamAvatar] = useState<string | null>(null);
const [teamSetupComplete, setTeamSetupComplete] = useState(false);

// Copy feedback
const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

// URL invite code pre-fill
const [urlInviteCode] = useState<string>(() => {
  return new URLSearchParams(window.location.search).get('code') || '';
});

// Transfer confirmation
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

## Squad Builder Features

- Real-time quota chips: `Goalkeepers: 1/2 ✔`
- Budget tracking (100.0 credits)
- Player status indicators (available / injured / suspended / doubtful)
- Position-group validation (min/max per position)
- Injured/suspended players blocked from selection

## Lineup Features

- Deadline banner with formatted date/time
- Interactive pitch/court/field visualization
- Football formation switching: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3
- Captain (gold) and vice-captain (silver) badges
- Bench-order management with up/down controls
- Auto-substitution explanation banner

## Gameweek Features

- Fixture list with status (LIVE / upcoming / finished)
- Deadlines and season info
- Simulate Results button (mock)
- Auto-substitution with bench priority
- Vice-captain fallback logic

## Live Points Features

- Current gameweek points summary
- Captain points impact
- Projected total
- Rank change indicator
- Player-by-player breakdown

## Transfers Features

- Transfer summary card (free transfers, cost, budget, hits)
- Two-panel layout (current squad vs available replacements)
- Confirmation modal with OUT/IN details
- Projected gain calculation
- Budget validation
- Doubtful player warnings

## Standings Features

- Leaderboard (Rank, Manager, Team, Captain pts, Transfer hits, Total)
- Current user row highlighted with accent color
- Top-3 rows highlighted
- Transparent scoring corrections log

## Notifications Features

- Types: deadline, injury, captain-scored, invite, correction, transfer, suspension
- Mark as read/unread toggle
- Unread count tracking
- Timestamps

---

## Mock Data Summary

| Data | Count |
|------|:---:|
| Competitions | 9 (3 per sport, mixed public/private) |
| Players | 26 (Football: 14, Rugby: 12, Basketball: 12) |
| Standings entries | 6 per sport (includes current user) |
| Scoring corrections | 4 per sport |
| Notifications | 7 |

---

## Styling & UX

- **Dark theme** with CSS variables
- **Sport accents:** Football `#22c55e`, Rugby `#f97316`, Basketball `#a855f7`
- **Fonts:** Rajdhani (headings), Inter (body), JetBrains Mono (numbers)
- **Respondive:** 900px (stack layouts), 560px (compact pitch/mobile)
- **Sidebar:** Fixed on desktop (260px), slides in on mobile
- **Sticky elements:** Topbar (top: 0), Step nav (top: 73px), Scoreboard (top: 117px)
- **Accessibility:** aria-labels, aria-pressed, focus-visible outlines, reduced-motion support

---

## Validation Rules Summary

| Step | Rule | Consequence |
|------|------|-------------|
| Join | Invite code < 5 chars | Error message, stay on form |
| Team Setup | Team name < 3 chars | Submit disabled |
| Squad | Injured / Suspended player | Cannot add |
| Squad | Max position count exceeded | Blocked |
| Squad | Budget > 100 | Blocked |
| Squad | Squad size reached | Blocked |
| Lineup | Starting count != required | Cannot confirm |
| Lineup | Captain not selected | Cannot confirm |
| Lineup | Vice-captain not selected | Cannot confirm |
| Gameweek | No starters selected | Cannot simulate |
| Transfers | Inbound player injured/suspended | Blocked |
| Transfers | Budget exceeded | Blocked |
| Transfers | No player selected OUT | Prompt first |

---

## Known Limitations (Mock-Data Architecture)

1. **Invite-code validation** is mock-only (min length 5). Backend integration required for real validation.
2. **In-memory data only** — leagues, codes, squads lost on page refresh.
3. **Invite links** require app routing for `/fantasy/join` to reach this component.
4. **No persistence** — all state resets on browser reload.
5. **Web Share API** availability depends on browser support; clipboard fallback provided.