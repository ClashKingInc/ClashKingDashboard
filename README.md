# ClashKing Dashboard

A modern web dashboard for configuring ClashKing bot settings, built with Next.js, React, TypeScript, and shadcn/ui.

## Features

- 🎨 **Modern UI** - Built with shadcn/ui components and TailwindCSS
- 📱 **Responsive Design** - Fully responsive, works on mobile and desktop
- 🔐 **Discord OAuth2** - Secure authentication with Discord
- ⚙️ **Modern Interface** - Familiar and intuitive settings management
- 🚀 **Fast & Performant** - Built on Next.js 15 with App Router

## Project Structure

```
clashking-dashboard/
├── app/                              # Next.js app directory
│   ├── [locale]/                     # Localized routes (i18n)
│   │   ├── auth/callback/            # OAuth callback
│   │   ├── dashboard/[guildId]/      # Dashboard pages
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── page.tsx              # Overview page
│   │   │   ├── autoboards/           # Auto-board configuration
│   │   │   ├── bans-and-strikes/     # Ban and strike management
│   │   │   ├── clans/                # Clan management
│   │   │   ├── embeds/               # Embed management
│   │   │   ├── family-settings/      # Family-wide settings
│   │   │   ├── general/              # General settings
│   │   │   ├── giveaways/            # Giveaway management
│   │   │   ├── leaderboards/         # Leaderboards
│   │   │   ├── links/                # Account links
│   │   │   ├── logs/                 # Event logs
│   │   │   ├── panels/               # Panel management
│   │   │   ├── reminders/            # Reminders
│   │   │   ├── roles/                # Role management
│   │   │   ├── rosters/              # Roster management
│   │   │   ├── tickets/              # Ticket configuration
│   │   │   └── wars/                 # War history and stats
│   │   ├── features/                 # Public features page
│   │   ├── help/                     # Help page
│   │   ├── login/                    # Login page
│   │   ├── open-source/              # Open-source page
│   │   ├── privacy/                  # Privacy page
│   │   ├── servers/                  # Server selection
│   │   ├── support/                  # Support page
│   │   ├── terms/                    # Terms page
│   │   └── page.tsx                  # Landing page
│   └── api/                          # Next.js API routes (proxy layer)
│       ├── v1/leaderboard/           # Legacy leaderboard endpoints
│       └── v2/                       # Current API version
│           ├── auth/                 # Authentication
│           ├── ban/                  # Ban management
│           ├── clan/                 # Clan endpoints
│           ├── cwl/                  # CWL rankings
│           ├── guild/                # Guild operations
│           ├── guilds/               # Guild listings
│           ├── internal/             # Internal bot endpoints
│           ├── player/               # Player lookups
│           ├── roster/               # Roster endpoints
│           ├── roster-automation/    # Roster automation endpoints
│           ├── roster-group/         # Roster group endpoints
│           ├── roster-signup-category/ # Signup category endpoints
│           ├── roster-token/         # Roster token endpoints
│           ├── search/               # Search endpoints
│           ├── server/               # Server settings
│           ├── static/               # Static metadata endpoints
│           └── war/                  # War data
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── dashboard/                    # Dashboard-specific components
│   └── landing/                      # Landing page components
├── i18n/                             # next-intl routing/request config
│   ├── routing.ts
│   └── request.ts
├── lib/                              # SDK, auth, and shared utilities
│   ├── api/                          # Modular API client (type-safe SDK)
│   │   ├── client.ts                 # Main ClashKingApiClient
│   │   ├── core/
│   │   │   └── base-client.ts        # HTTP request logic
│   │   ├── clients/                  # Domain-specific clients (13 clients)
│   │   │   ├── auth-client.ts
│   │   │   ├── clan-client.ts
│   │   │   ├── family-roles-client.ts
│   │   │   ├── leaderboard-client.ts
│   │   │   ├── link-client.ts
│   │   │   ├── panels-client.ts
│   │   │   ├── player-client.ts
│   │   │   ├── roles-client.ts
│   │   │   ├── roster-client.ts
│   │   │   ├── server-client.ts
│   │   │   ├── tickets-client.ts
│   │   │   ├── utility-client.ts
│   │   │   └── war-client.ts
│   │   └── types/                    # TypeScript interfaces per domain
│   │       ├── common.ts
│   │       ├── auth.ts
│   │       ├── clan.ts
│   │       ├── family-roles.ts
│   │       ├── leaderboard.ts
│   │       ├── link.ts
│   │       ├── panels.ts
│   │       ├── player.ts
│   │       ├── roles.ts
│   │       ├── roster.ts
│   │       ├── server.ts
│   │       ├── tickets.ts
│   │       └── war.ts
│   ├── auth/                         # Discord auth and redirect utilities
│   │   ├── discord-login.ts
│   │   ├── logout.ts
│   │   └── redirect.ts
│   ├── api-client.ts                 # Legacy auth client
│   ├── api-cache.ts                  # Request caching
│   ├── dashboard-cache.ts            # Dashboard-level caching
│   ├── locale-preference.ts          # Locale preference helpers
│   ├── pkce.ts                       # PKCE code generation
│   ├── theme.ts                      # Theme utilities
│   └── utils.ts                      # General utility functions
└── messages/                         # i18n translations
    ├── en.json                       # English
    ├── fr.json                       # French
    └── nl.json                       # Dutch
```

### Architecture Overview

**`/lib/api` - Type-Safe SDK:**
- Modular client architecture with 13 specialized domain clients
- Full TypeScript coverage for 85+ endpoints
- Automatic token management and error handling
- Smart context detection (browser uses `/api` proxy, server uses direct backend)

**`/app/api` - Proxy Layer:**
- 50+ Next.js API routes that proxy requests to the ClashKing backend
- Transparent authorization header pass-through
- Enables secure browser-to-backend communication

**How they work together:**
```
React Component → lib/api client → /app/api proxy → ClashKing Backend
```

## Getting Started

### Prerequisites

- Node.js 25+ (or Node.js 18+ minimum)
- npm 11+ or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3002](http://localhost:3002) to view the dashboard.

## Running with the API

⚠️ **Important:** The dashboard requires `ClashKingAPI` `v2`. You can run `ClashKingAPI` locally from the `v2` branch, or point the dashboard to the beta `ClashKingAPI` deployment by setting `NEXT_PUBLIC_API_URL` as described in [Environment Variables](#environment-variables).

### Quick Start

```bash
# Terminal 1 - Start API
cd ../ClashKingAPI
git checkout v2
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python main.py

# Terminal 2 - Start Dashboard
cd ../clashking-dashboard
npm run dev
```

Dashboard: http://localhost:3002
API Docs: http://localhost:8000/docs

## Pages Overview

### Completed Pages

- **Landing Page** (`/`) - Main marketing page
- **Auth Callback** (`/auth/callback`) - OAuth2 callback handling
- **Login** (`/login`) - Discord OAuth2 authentication
- **Server Selection** (`/servers`) - Choose which server to configure
- **Features** (`/features`) - Public feature overview
- **Help** (`/help`) - Help and documentation page
- **Open Source** (`/open-source`) - Open-source information
- **Privacy** (`/privacy`) - Privacy policy page
- **Support** (`/support`) - Support page
- **Terms** (`/terms`) - Terms and conditions page
- **Dashboard Overview** (`/dashboard/[guildId]`) - Server dashboard overview
- **Autoboards** (`/dashboard/[guildId]/autoboards`) - Auto-board configuration
- **Bans and Strikes** (`/dashboard/[guildId]/bans-and-strikes`) - Ban and strike management
- **Clan Management** (`/dashboard/[guildId]/clans`) - View and configure clans
- **Embeds** (`/dashboard/[guildId]/embeds`) - Custom embed management
- **Family Settings** (`/dashboard/[guildId]/family-settings`) - Family-level server settings
- **General Settings** (`/dashboard/[guildId]/general`) - Core server settings
- **Giveaways** (`/dashboard/[guildId]/giveaways`) - Giveaway management
- **Leaderboards** (`/dashboard/[guildId]/leaderboards`) - Leaderboard views
- **Links** (`/dashboard/[guildId]/links`) - Player account links
- **Logs** (`/dashboard/[guildId]/logs`) - Log configuration
- **Panels** (`/dashboard/[guildId]/panels`) - Panel configuration
- **Reminders** (`/dashboard/[guildId]/reminders`) - Reminder settings
- **Roles** (`/dashboard/[guildId]/roles`) - Role configuration
- **Rosters** (`/dashboard/[guildId]/rosters`) - Roster management
- **Tickets** (`/dashboard/[guildId]/tickets`) - Ticket system settings
- **Wars** (`/dashboard/[guildId]/wars`) - War data and summaries

### Planned Pages

- **Ranking** - Expanded ranking pages and ranking-focused analytics.

## API Integration

The dashboard connects to ClashKingAPI endpoints. See [.github/api-reference/openapi-private.json](./.github/api-reference/openapi-private.json) for complete API documentation.

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript 5
- **UI Library:** React 19.2
- **Styling:** TailwindCSS 4
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **i18n:** next-intl
- **State Management:** Zustand
- **API Client:** Tanstack Query + Axios
- **Authentication:** NextAuth.js v5

## Development

### Code Style

- TypeScript for all code
- Next.js 16 conventions (async Server Components by default)
- Use "use client" only for client-side interactivity
- Small, reusable components
- shadcn/ui components for UI consistency
- English for all code and documentation

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```
### Environment Variables

Required for production:

```bash
NEXT_PUBLIC_API_URL=https://go.api.clashk.ing
NEXT_PUBLIC_DISCORD_CLIENT_ID=824653933347209227
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run build`
4. Submit a pull request

## License

See the main ClashKing repository for license information.

## Support

- [ClashKing Discord](https://discord.gg/clashking)
- [ClashKing Bot GitHub](https://github.com/ClashKingInc/ClashKingBot)
- [ClashKing API Docs](https://api.clashk.ing/docs)
