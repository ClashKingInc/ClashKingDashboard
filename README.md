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
├── app/                          # Next.js app directory
│   ├── [locale]/                 # Localized routes (i18n)
│   │   ├── auth/callback/        # OAuth callback
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Login page
│   │   ├── servers/              # Server selection
│   │   └── dashboard/[guildId]/  # Dashboard pages
│   │       ├── layout.tsx        # Dashboard layout with sidebar
│   │       ├── page.tsx          # Overview page
│   │       ├── general/          # General settings
│   │       ├── clans/            # Clan management
│   │       ├── wars/             # War history & stats
│   │       ├── links/            # Account links
│   │       ├── logs/             # Event logs
│   │       ├── leaderboards/     # Leaderboards
│   │       ├── roles/            # Role management
│   │       ├── rosters/          # Roster management
│   │       └── reminders/        # Reminders
│   └── api/                      # Next.js API routes (proxy layer)
│       ├── v1/                   # Legacy API endpoints
│       └── v2/                   # Current API version
│           ├── auth/             # Authentication
│           ├── ban/              # Ban management
│           ├── cwl/              # CWL rankings
│           ├── guild/            # Guild operations
│           ├── roster/           # Roster endpoints
│           ├── server/           # Server settings
│           └── war/              # War data             
├── components/
│   ├── ui/                       # shadcn/ui components (40+ components)
│   ├── dashboard/                # Dashboard-specific components
│   ├── landing/                  # Landing page components
│   └── providers/                # Context providers
├── lib/                          # SDK & utilities
│   ├── api/                      # Modular API client (type-safe SDK)
│   │   ├── client.ts             # Main ClashKingApiClient
│   │   ├── core/
│   │   │   └── base-client.ts    # HTTP request logic
│   │   ├── clients/              # Domain-specific clients (11 clients)
│   │   │   ├── auth-client.ts    # Authentication
│   │   │   ├── player-client.ts  # Player data
│   │   │   ├── clan-client.ts    # Clan data
│   │   │   ├── roster-client.ts  # Roster management
│   │   │   ├── war-client.ts     # War history
│   │   │   ├── server-client.ts  # Server settings
│   │   │   ├── link-client.ts    # Account links
│   │   │   ├── utility-client.ts # Utilities
│   │   │   ├── roles-client.ts   # Role management
│   │   │   └── leaderboard-client.ts # Leaderboards
│   │   └── types/                # TypeScript interfaces
│   │       ├── common.ts         # ApiResponse, ApiConfig
│   │       ├── auth.ts           # User & auth types
│   │       ├── player.ts         # Player types
│   │       ├── clan.ts           # Clan types
│   │       ├── roster.ts         # Roster types
│   │       ├── war.ts            # War types
│   │       ├── server.ts         # Server types
│   │       ├── link.ts           # Link types
│   │       ├── roles.ts          # Role types
│   │       └── leaderboard.ts    # Leaderboard types
│   ├── api-client.ts             # Legacy auth client
│   ├── api-cache.ts              # Request caching (30s TTL)
│   ├── auth/
│   │   ├── discord-login.ts      # OAuth2 PKCE flow
│   │   └── redirect.ts           # Redirect handling
│   ├── pkce.ts                   # PKCE code generation
│   ├── utils.ts                  # Utility functions
│   ├── theme.ts                  # Theme utilities
│   └── constants.ts              # App constants
├── messages/                     # i18n translations
│   ├── en.json                   # English
│   └── fr.json                   # French
├── public/                       # Static assets
│   └── images/                   # Images & icons
├── store/                        # Zustand state management
└── .claude/
    └── context.md                # Project documentation
```

### Architecture Overview

**`/lib/api` - Type-Safe SDK:**
- Modular client architecture with 11 specialized domain clients
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

⚠️ **Important:** The dashboard requires the `v2` branch of ClashKingAPI which is not yet in production. You **must** run the API locally.

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

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

- **Landing Page** (`/`) - Hero section with login button
- **Login** (`/login`) - Discord OAuth2 authentication
- **Server Selection** (`/servers`) - Choose which server to configure
- **Dashboard Overview** (`/[guildId]`) - Quick stats and getting started guide
- **General Settings** (`/[guildId]/general`) - Nickname conventions, appearance, advanced features
- **Clan Management** (`/[guildId]/clans`) - View and configure clans

### Planned Pages

- **Logs** - Configure join/leave, donation, war, capital, legend logs
- **Roles** - Automatic role assignment (Town Hall, Legend League, achievements)
- **Permissions** - Command whitelist management
- **Reminders** - War reminders, legend reminders, custom reminders
- **Strikes** - Strike/warning system configuration
- **Tickets** - Ticket system settings
- **Advanced** - API tokens, webhooks, custom embeds

## API Integration

The dashboard connects to ClashKingAPI endpoints. See [.claude/context.md](./.claude/context.md) for complete API documentation.

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

### Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Example:
```bash
npx shadcn@latest add dialog form tabs
```

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

### Docker

```bash
docker build -t clashking-dashboard .
docker run -p 3000:3000 clashking-dashboard
```

### Environment Variables

Required for production:

```bash
NEXT_PUBLIC_API_URL=https://api.clashk.ing
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
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
