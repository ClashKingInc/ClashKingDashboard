# ClashKing Dashboard

A modern web dashboard for configuring ClashKing bot settings, built with Next.js, React, TypeScript, and shadcn/ui.

## Features

- 🎨 **Modern UI** - Built with shadcn/ui components and TailwindCSS
- 📱 **Responsive Design** - Fully responsive, works on mobile and desktop
- 🔐 **Discord OAuth2** - Secure authentication with Discord
- ⚙️ **MEE6-style Interface** - Familiar and intuitive settings management
- 🚀 **Fast & Performant** - Built on Next.js 15 with App Router

## Project Structure

```
clashking-dashboard/
├── app/                          # Next.js app directory
│   ├── [locale]/                 # Localized routes (i18n)
│   │   ├── page.tsx              # Landing page
│   │   └── dashboard/[guildId]/  # Dashboard pages
│   │       ├── layout.tsx        # Dashboard layout with sidebar
│   │       ├── page.tsx          # Overview page
│   │       ├── general/          # General settings
│   │       └── clans/            # Clan management
│   ├── login/                    # Login page
│   ├── servers/                  # Server selection
│   └── auth/callback/            # OAuth callback
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard components
│   └── landing/                  # Landing page components
├── lib/
│   └── utils.ts                  # Utility functions
├── messages/                     # i18n translations
│   ├── en.json                   # English
│   └── fr.json                   # French
└── .claude/
    └── context.md                # Project documentation
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
