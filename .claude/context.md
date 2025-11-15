# clashking-dashboard - Context & Architecture

## Project Overview

Web dashboard to configure ClashKing bot settings (MEE6-style), compatible with mobile and desktop.

### Chosen Tech Stack

**Frontend:**
- Next.js 14/15 (App Router)
- React + TypeScript
- shadcn/ui (UI components)
- TailwindCSS (styling)
- Tanstack Query (API data management)

**Backend:**
- FastAPI (Python) - Extend existing API
- MongoDB (database)
- Redis (cache)
- Discord OAuth2 (authentication)

---

## Existing Projects Architecture

### 1. ClashKingAPI (v2 branch)

**Structure:**
```
ClashKingAPI/
├── main.py                    # FastAPI entry point
├── startup.py                 # Router configuration
├── routers/
│   ├── v1/                    # API v1 (legacy)
│   │   ├── server_info.py     # Server settings
│   │   ├── clan.py
│   │   ├── player.py
│   │   ├── rosters.py
│   │   ├── stats.py
│   │   ├── war.py
│   │   └── ...
│   └── v2/                    # API v2 (modern)
│       ├── auth/              # Authentication
│       │   └── auth.py        # Discord OAuth2, Email auth
│       ├── rosters/
│       ├── link/              # Link accounts
│       ├── war/
│       ├── ui/                # UI endpoints
│       └── ...
├── utils/
│   ├── config.py              # Configuration
│   ├── database.py            # MongoClient
│   └── ...
```

**Key API v2 Endpoints:**
- `/v2/auth/discord` - Discord OAuth2 auth
- `/v2/auth/me` - Current user info
- `/v2/auth/refresh` - Refresh token
- `/server-settings/{server_id}` - Server settings

**MongoDB Database:**
Main collections:
- `server_db` - Discord server settings
- `clan_db` - Clan settings
- `auth_users` - Authenticated users
- `whitelist` - Command permissions
- `legendleagueroles` - Legend League roles
- `townhallroles` - Town Hall roles
- `builderhallroles` - Builder Hall roles
- `achievementroles` - Achievement roles
- `statusroles` - Status roles (online/offline)
- `builderleagueroles` - Builder League roles

---

### 2. ClashKingBot (v2.0 branch)

**Structure:**
```
ClashKingBot/
├── main.py                    # Bot entry point
├── commands/
│   ├── settings/              # /set, /whitelist commands
│   │   └── commands.py
│   ├── setup/                 # /setup commands
│   │   ├── commands.py
│   │   └── utils.py
│   ├── eval/                  # Role evaluation system
│   ├── reminders/             # Reminders
│   ├── rosters/               # Roster management
│   ├── link/                  # Link CoC accounts
│   ├── war/                   # War logs
│   ├── legends/               # Legend League
│   ├── stats/                 # Statistics
│   └── ...
├── background/
│   ├── logs/                  # Background logs
│   │   ├── autorefresh.py
│   │   ├── donations.py
│   │   ├── joinleave.py
│   │   ├── war.py
│   │   └── ...
│   └── features/
└── classes/
    ├── bot.py
    └── DatabaseClient/
```

**Bot Command Categories:**
- `bans` - Ban management
- `boards` - Leaderboards
- `clan` - Clan commands
- `eval` - Role evaluation system
- `exports` - Data exports
- `family` - Clan family management
- `giveaway` - Giveaways
- `leaderboards` - Leaderboards
- `legends` - Legend League
- `link` - Link Discord ↔ CoC accounts
- `reminders` - Automatic reminders
- `rosters` - Roster management
- `settings` - General settings
- `setup` - Initial setup
- `stats` - Statistics
- `strikes` - Warning system
- `ticketing` - Ticket system
- `war` - War logs and stats

---

## Configurable Settings (Dashboard to create)

### Server Settings (`/setup server`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `ban_log_channel` | Channel | Channel for ban logs |
| `strike_log_channel` | Channel | Channel for strike logs |
| `change_nicknames` | Boolean | Bot automatically changes nicknames |
| `family_nickname_convention` | String | Family nickname convention (e.g., `[{clan_abbr}] {player_name}`) |
| `non_family_nickname_convention` | String | Non-family nickname convention |
| `flair_non_family` | Boolean | Assign flair roles to non-family |
| `api_token` | Boolean | Use API token |
| `leadership_eval` | Boolean | Leadership evaluation enabled |
| `full_whitelist_role` | Role | Role with all permissions |
| `embed_color` | Hex | Embed color |
| `followed_reddit_accounts` | String | Followed Reddit accounts |

**Available placeholders for conventions:**
- `{player_name}` - CoC player name
- `{clan_abbr}` - Clan abbreviation
- `{discord_display_name}` - Discord nickname (must be alone)
- `{townhall}` - TH level
- `{trophies}` - Trophies

### Clan Settings (`/setup clan`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `member_role` | Role | Role assigned to members |
| `leadership_role` | Role | Role assigned to coleads + leader |
| `clan_channel` | Channel | Channel for ban & welcome messages |
| `greeting` | String | Welcome message (custom embed) |
| `auto_greet` | Enum | Never / First Join / Every Join |
| `category` | String | Clan category |
| `ban_alert_channel` | Channel | Ban alerts |
| `clan_abbreviation` | String | Abbreviation (max 16 chars) |
| `strike_button` | Boolean | Strike button enabled |
| `ban_button` | Boolean | Ban button enabled |
| `profile_button` | Boolean | Profile button enabled |

### Clan Logs (Webhooks)

Each clan can have webhooks configured for:
- `join_log` - Join logs
- `leave_log` - Leave logs
- `donation_log` - Donation logs
- `war_log` - War logs
- `war_panel` - War panel
- `capital_attacks` - Capital attacks
- `capital_donations` - Capital donations
- `capital_weekly_summary` - Capital weekly summary
- `raid_panel` - Raid panel
- `super_troop_boost_log` - Super troop boosts
- `role_change` - Role changes
- `troop_upgrade` - Troop upgrades
- `th_upgrade` - TH upgrades
- `league_change` - League changes
- `spell_upgrade` - Spell upgrades
- `hero_upgrade` - Hero upgrades
- `name_change` - Name changes
- `legend_log_defenses` - Legend League defenses
- `legend_log_attacks` - Legend League attacks

### Whitelist System

Per-command permissions:
- Roles or users can be whitelisted for specific commands
- MongoDB structure:
  ```json
  {
    "command": "command_name",
    "server": 123456789,
    "role_user": 987654321,
    "is_role": true
  }
  ```

### Role Evaluation System

Automatic role types:
1. **Legend League Roles** (`legendleagueroles`)
   - Roles based on Legend League trophies

2. **Town Hall Roles** (`townhallroles`)
   - Roles by TH level

3. **Builder Hall Roles** (`builderhallroles`)
   - Roles by BH level

4. **Achievement Roles** (`achievementroles`)
   - Roles by achievements

5. **Status Roles** (`statusroles`)
   - Online/offline roles

6. **Builder League Roles** (`builderleagueroles`)
   - Roles by builder league

7. **General Roles** (`generalrole`)
   - Family roles

8. **Link Roles** (`linkrole`)
   - Non-family roles

9. **Ignored Roles** (`evalignore`)
   - Roles to ignore in evaluation

---

## Dashboard Structure to Create

### Main Pages (MEE6-style)

```
/
├── /login                             # Discord OAuth2 login
├── /servers                           # Server selection
└── /[guildId]/
    ├── /                              # Overview
    ├── /general                       # General settings
    │   ├── Server Settings
    │   ├── Nickname Conventions
    │   └── Embed Customization
    ├── /clans                         # Clan management
    │   ├── Add/Remove Clans
    │   └── /[clanTag]/settings
    ├── /logs                          # Log configuration
    │   ├── Join/Leave Logs
    │   ├── Donation Logs
    │   ├── War Logs
    │   ├── Capital Logs
    │   └── Legend Logs
    ├── /roles                         # Automatic role management
    │   ├── Town Hall Roles
    │   ├── Legend League Roles
    │   ├── Achievement Roles
    │   ├── Status Roles
    │   └── Custom Roles
    ├── /permissions                   # Whitelist
    │   └── Command Permissions
    ├── /reminders                     # Reminders
    │   ├── War Reminders
    │   ├── Legend Reminders
    │   └── Custom Reminders
    ├── /strikes                       # Strike system
    │   └── Strike Settings
    ├── /tickets                       # Ticket system
    │   └── Ticket Settings
    └── /advanced                      # Advanced settings
        ├── API Token
        ├── Webhooks
        └── Custom Embeds
```

---

## API Endpoints to Create/Extend

### New endpoints for dashboard

```python
# Server Settings
GET    /v2/dashboard/servers/{guild_id}/settings
PATCH  /v2/dashboard/servers/{guild_id}/settings

# Clans
GET    /v2/dashboard/servers/{guild_id}/clans
POST   /v2/dashboard/servers/{guild_id}/clans
PATCH  /v2/dashboard/servers/{guild_id}/clans/{clan_tag}
DELETE /v2/dashboard/servers/{guild_id}/clans/{clan_tag}

# Logs
GET    /v2/dashboard/servers/{guild_id}/logs
PATCH  /v2/dashboard/servers/{guild_id}/logs/{log_type}

# Roles
GET    /v2/dashboard/servers/{guild_id}/roles
POST   /v2/dashboard/servers/{guild_id}/roles
DELETE /v2/dashboard/servers/{guild_id}/roles/{role_id}

# Permissions
GET    /v2/dashboard/servers/{guild_id}/permissions
POST   /v2/dashboard/servers/{guild_id}/permissions
DELETE /v2/dashboard/servers/{guild_id}/permissions/{permission_id}

# Discord Data (roles, channels, etc.)
GET    /v2/dashboard/servers/{guild_id}/discord/roles
GET    /v2/dashboard/servers/{guild_id}/discord/channels
```

---

## shadcn/ui Components to Use

### Installation
```bash
npx shadcn@latest add button card dialog form input label select switch tabs table badge separator dropdown-menu avatar tooltip
```

### Key Components for Dashboard

1. **Navigation**
   - `Sidebar` - Main navigation
   - `Tabs` - Secondary navigation
   - `Breadcrumb` - Breadcrumb trail

2. **Forms**
   - `Form` - Configuration forms
   - `Input` - Text fields
   - `Select` - Dropdowns (roles, channels)
   - `Switch` - On/off toggles
   - `Checkbox` - Checkboxes
   - `Textarea` - Multi-line text

3. **Display**
   - `Card` - Settings sections
   - `Table` - Lists (logs, permissions)
   - `Badge` - Status badges
   - `Avatar` - Profile pictures
   - `Separator` - Separators

4. **Interactions**
   - `Dialog` - Confirmation modals
   - `DropdownMenu` - Context menus
   - `Tooltip` - Tooltips
   - `Button` - Action buttons

---

## Discord OAuth2 Authentication

### Authentication Flow

1. User clicks "Login with Discord"
2. Redirect to Discord OAuth2:
   ```
   https://discord.com/api/oauth2/authorize?
     client_id={CLIENT_ID}&
     redirect_uri={REDIRECT_URI}&
     response_type=code&
     scope=identify+guilds
   ```
3. Discord redirects to callback with `code`
4. Frontend sends `code` to `/v2/auth/discord`
5. Backend:
   - Exchanges code for access_token
   - Fetches Discord user info
   - Creates/updates user in DB
   - Generates ClashKing JWT
6. Frontend stores JWT and refresh_token

### Required Discord Scopes
- `identify` - User info
- `guilds` - Server list
- `guilds.members.read` - Server permissions

---

## MongoDB Collections Structure

### server_db
```javascript
{
  _id: ObjectId,
  server: 123456789,            // Guild ID
  banlist_channel: 987654321,
  strike_log_channel: 111222333,
  change_nicknames: true,
  family_nickname_convention: "[{clan_abbr}] {player_name}",
  non_family_nickname_convention: "{player_name}",
  flair_non_family: false,
  api_token: true,
  leadership_eval: true,
  full_whitelist_role: 444555666,
  embed_color: "#FF0000",
  reddit_accounts: ["account1", "account2"]
}
```

### clan_db
```javascript
{
  _id: ObjectId,
  tag: "#CLAN123",
  name: "Clan Name",
  server: 123456789,
  member_role: 987654321,
  leadership_role: 111222333,
  clan_channel: 444555666,
  greeting: "welcome_embed",
  auto_greet: "First Join",    // Never | First Join | Every Join
  category: "Main",
  ban_alert_channel: 777888999,
  clan_abbreviation: "CLAN",
  strike_button: true,
  ban_button: true,
  profile_button: true,
  // Webhooks for logs
  join_log: { webhook: "https://...", thread: null },
  leave_log: { webhook: "https://...", thread: null },
  donation_log: { webhook: "https://...", thread: null },
  war_log: { webhook: "https://...", thread: null },
  // ... other logs
}
```

### whitelist
```javascript
{
  _id: ObjectId,
  command: "clan info",
  server: 123456789,
  role_user: 987654321,
  is_role: true
}
```

---

## Important Notes

### Discord Permissions
- User must have `MANAGE_GUILD` on the server to access dashboard
- Verify permissions on backend for every request

### Rate Limiting
- ClashKing API: 30 req/sec max
- Discord API: respect rate limits

### Security
- CORS configured for dashboard domain only
- JWT with expiration (access_token: 1h, refresh_token: 30 days)
- Backend input validation with Pydantic
- Verify Discord permissions on every API request

### Mobile Responsive
- Mobile-first design with TailwindCSS
- Collapsible sidebar on mobile
- Touch-friendly (min 44x44px buttons)
- Mobile-adapted menus (drawer instead of dropdown)

---

## Development Setup

### Prerequisites

⚠️ **IMPORTANT:** This dashboard requires the `v2` branch of ClashKingAPI, which is **not yet in production**. You must run the API locally.

### Required Branches

- **ClashKingAPI:** `v2`
- **ClashKingBot:** `v2.0` (for reference)
- **ClashKingAssets:** `main`
- **ClashKingProxy:** `main`

### Running Locally

1. **Start ClashKingAPI (v2):**
   ```bash
   cd ../ClashKingAPI
   git checkout v2
   python main.py  # Runs on port 8000
   ```

2. **Start Dashboard:**
   ```bash
   cd ../clashking-dashboard
   npm run dev  # Runs on port 3002
   ```

3. **Access:**
   - Dashboard: http://localhost:3002
   - API Docs: http://localhost:8000/docs

## Next Steps

1. ✅ Explore ClashKingAPI structure
2. ✅ Explore ClashKingBot structure
3. ✅ Create .claude/context.md
4. ✅ Initialize Next.js with shadcn/ui
5. ✅ Create dashboard page structure
6. ✅ Create MEE6-style example pages
7. 🔄 Create dashboard API endpoints (in ClashKingAPI)
8. 🔄 Implement Discord OAuth2 auth flow
9. 🔄 Connect frontend ↔ backend with Tanstack Query
10. 🔄 Add remaining dashboard pages (logs, roles, etc.)
11. 🔄 Implement real data fetching from API
12. 🔄 Add form validation and error handling

---

## Resources

- [ClashKing Bot GitHub](https://github.com/ClashKingInc/ClashKingBot)
- [ClashKing API Docs](https://api.clashk.ing/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Discord OAuth2 Docs](https://discord.com/developers/docs/topics/oauth2)
