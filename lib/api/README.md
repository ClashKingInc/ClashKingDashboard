# ClashKing API Client

Modular TypeScript client for the ClashKing Dashboard API.

> **Note**: This is a comprehensive API client covering all 100+ endpoints of the ClashKing API.
> The existing `lib/api-client.ts` (3 methods for auth only) is still available for basic authentication needs.
> This client provides full coverage for players, clans, rosters, wars, servers, and more.

## Features

- 🎯 **Modular Architecture** - Organized by domain (auth, players, clans, etc.)
- 📦 **Tree-shakeable** - Import only what you need
- 🔒 **Type-safe** - Full TypeScript support
- 🧩 **Composable** - Use individual clients or the main client
- 📚 **Well-documented** - JSDoc comments on all methods

## Installation

```typescript
import { createApiClient } from '@/lib/api';
```

## Quick Start

```typescript
import { createApiClient } from '@/lib/api';

// Create client instance
const api = createApiClient('https://api.clashk.ing', 'your-access-token');

// Authentication
const { data: user } = await api.auth.getCurrentUser();
await api.auth.loginWithEmail({ email, password });

// Players
const { data: locations } = await api.players.getLocations(['#TAG1', '#TAG2']);
const { data: sorted } = await api.players.getSorted('trophies', ['#TAG1']);

// Clans
const { data: ranking } = await api.clans.getRanking('#CLANTAG');
const { data: donations } = await api.clans.getDonations('#CLANTAG', '2024-01');

// Rosters
const { data: rosters } = await api.rosters.list(serverId);
await api.rosters.create(serverId, { name: 'CWL Roster', roster_type: 'cwl' });

// Wars
const { data: wars } = await api.wars.getPrevious('#CLANTAG');
const { data: cwlHistory } = await api.wars.getCwlRankingHistory('#CLANTAG');

// Servers
const { data: settings } = await api.servers.getSettings(serverId);
await api.servers.updateEmbedColor(serverId, 'FF5733');

// Links
const { data: accounts } = await api.links.getLinkedAccounts('#TAG');
await api.links.linkAccount({ player_tag: '#TAG', api_token: 'token' });

// Utilities
const { data: dates } = await api.utils.getCurrentDates();
const { data: legends } = await api.utils.getLegendsSeason('2024-01');
```

## Modular Usage

You can also use individual clients for smaller bundle sizes:

```typescript
import { AuthClient } from '@/lib/api/clients/auth-client';
import { ClanClient } from '@/lib/api/clients/clan-client';

const config = { baseUrl: 'https://api.clashk.ing', accessToken: 'token' };

const authClient = new AuthClient(config);
const clanClient = new ClanClient(config);

const user = await authClient.getCurrentUser();
const clans = await clanClient.search('Warriors');
```

## API Structure

### Main Client

```typescript
const api = createApiClient(baseUrl, accessToken?, refreshToken?);

api.auth      // Authentication endpoints
api.players   // Player endpoints
api.clans     // Clan endpoints
api.rosters   // Roster management endpoints
api.wars      // War endpoints
api.servers   // Server/guild endpoints
api.links     // Account linking endpoints
api.utils     // Utility endpoints (dates, legends, search, app)
```

### Available Clients

- **`AuthClient`** - Authentication and user management
- **`PlayerClient`** - Player data and tracking
- **`ClanClient`** - Clan information and composition
- **`RosterClient`** - Roster management, groups, categories, automation
- **`WarClient`** - War history, CWL, statistics, exports
- **`ServerClient`** - Server settings, bans, clan settings
- **`LinkClient`** - Account linking and management
- **`UtilityClient`** - Dates, legends, search, app utilities

## Token Management

```typescript
// Update access token
api.setAccessToken('new-access-token');

// Update refresh token
api.setRefreshToken('new-refresh-token');

// Clear all tokens
api.clearTokens();

// Get current config
const config = api.getConfig();
```

## Error Handling

```typescript
const { data, error, status } = await api.clans.getRanking('#CLANTAG');

if (error) {
  console.error(`Error ${status}: ${error}`);
} else {
  console.log(data);
}
```

## Type Imports

```typescript
import type {
  ApiResponse,
  AuthResponse,
  ClanRanking,
  CreateRosterModel,
  PlayerWarhitsFilter,
} from '@/lib/api';
```

## File Structure

```
lib/api/
├── index.ts                    # Main exports
├── client.ts                   # Main client (composes all clients)
├── README.md                   # This file
├── core/
│   └── base-client.ts         # Base HTTP client
├── types/
│   ├── common.ts              # Common types (ApiResponse, etc.)
│   ├── auth.ts                # Authentication types
│   ├── player.ts              # Player types
│   ├── clan.ts                # Clan types
│   ├── roster.ts              # Roster types
│   ├── war.ts                 # War types
│   ├── server.ts              # Server types
│   └── link.ts                # Link types
└── clients/
    ├── auth-client.ts         # Authentication endpoints (11 methods)
    ├── player-client.ts       # Player endpoints (5 methods)
    ├── clan-client.ts         # Clan endpoints (6 methods)
    ├── roster-client.ts       # Roster endpoints (27 methods)
    ├── war-client.ts          # War endpoints (6 methods)
    ├── server-client.ts       # Server endpoints (7 methods)
    ├── link-client.ts         # Link endpoints (6 methods)
    └── utility-client.ts      # Utility endpoints (17 methods)
```

## Comparison with Existing Client

### `lib/api-client.ts` (Simple Auth Client)
```typescript
import { apiClient } from '@/lib/api-client';

// Only 3 auth methods available
await apiClient.loginWithDiscord(code, verifier);
await apiClient.getCurrentUser(token);
await apiClient.refreshToken(refreshToken);
```

### `lib/api/*` (Full Featured Client - 85+ methods)
```typescript
import { createApiClient } from '@/lib/api';

const api = createApiClient('https://api.clashk.ing', token);

// Full API coverage
api.auth.*       // 11 authentication methods
api.players.*    // 5 player methods
api.clans.*      // 6 clan methods
api.rosters.*    // 27 roster methods
api.wars.*       // 6 war methods
api.servers.*    // 7 server methods
api.links.*      // 6 link methods
api.utils.*      // 17 utility methods
```

**Advantages of Modular Architecture:**
- ✅ Complete API coverage (100+ endpoints)
- ✅ Organized by domain for easy navigation
- ✅ Tree-shakeable for smaller bundles
- ✅ Independent testing of each module
- ✅ Type-safe with full TypeScript support
- ✅ Easy to extend and maintain

## Examples

See [ENDPOINTS_DOCUMENTATION.md](../../ENDPOINTS_DOCUMENTATION.md) for complete API reference.
