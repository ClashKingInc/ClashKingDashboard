# Reminders API Integration

This document describes how the Reminders page integrates with the ClashKingAPI endpoints from branch `claude/dashboard-reminders-01NDuY7i56DZpGcHgWHpkxsJ`.

## API Endpoints Used

The reminders page (`/app/[locale]/dashboard/[guildId]/reminders/page.tsx`) integrates with the following API endpoints:

### 1. GET `/v2/server/{server_id}/reminders`
**Purpose**: Fetch all reminders for a specific server

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Response**:
```json
{
  "war_reminders": [
    {
      "id": "string",
      "type": "War",
      "clan_tag": "string|null",
      "channel_id": "string|null",
      "time": "string",
      "custom_text": "string|null",
      "townhall_filter": [int],
      "roles": ["string"],
      "war_types": ["Random", "Friendly", "CWL"]
    }
  ],
  "capital_reminders": [
    {
      "id": "string",
      "type": "Clan Capital",
      "clan_tag": "string|null",
      "channel_id": "string|null",
      "time": "string",
      "custom_text": "string|null",
      "townhall_filter": [int],
      "roles": ["string"],
      "attack_threshold": int
    }
  ],
  "clan_games_reminders": [
    {
      "id": "string",
      "type": "Clan Games",
      "clan_tag": "string|null",
      "channel_id": "string|null",
      "time": "string",
      "custom_text": "string|null",
      "townhall_filter": [int],
      "roles": ["string"],
      "point_threshold": int
    }
  ],
  "inactivity_reminders": [
    {
      "id": "string",
      "type": "Inactivity",
      "clan_tag": "string|null",
      "channel_id": "string|null",
      "time": "string",
      "custom_text": "string|null",
      "townhall_filter": [int],
      "roles": ["string"]
    }
  ],
  "roster_reminders": [
    {
      "id": "string",
      "type": "roster",
      "clan_tag": "string|null",
      "channel_id": "string|null",
      "time": "string",
      "custom_text": "string|null",
      "roster_id": "string|null",
      "ping_type": "string|null"
    }
  ]
}
```

### 2. POST `/v2/server/{server_id}/reminders`
**Purpose**: Create a new reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "type": "War|Clan Capital|Clan Games|Inactivity|roster",
  "clan_tag": "string|null",
  "channel_id": "string",
  "time": "string",
  "custom_text": "string|null",
  "townhall_filter": [int],
  "roles": ["string"],
  "war_types": ["Random", "Friendly", "CWL"],
  "point_threshold": int,
  "attack_threshold": int,
  "roster_id": "string|null",
  "ping_type": "string|null"
}
```

**Response**:
```json
{
  "message": "Reminder created successfully",
  "reminder_id": "string",
  "server_id": int
}
```

### 3. PUT `/v2/server/{server_id}/reminders/{reminder_id}`
**Purpose**: Update an existing reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "channel_id": "string|null",
  "time": "string|null",
  "custom_text": "string|null",
  "townhall_filter": [int],
  "roles": ["string"],
  "war_types": ["string"],
  "point_threshold": int,
  "attack_threshold": int,
  "ping_type": "string|null"
}
```

**Response**:
```json
{
  "message": "Reminder updated successfully",
  "reminder_id": "string",
  "updated_fields": int
}
```

### 4. DELETE `/v2/server/{server_id}/reminders/{reminder_id}`
**Purpose**: Delete a reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Response**:
```json
{
  "message": "Reminder deleted successfully",
  "reminder_id": "string"
}
```

## Reminder Types

The page supports the following reminder types:

- **War**: Regular clan wars - includes war_types filter (Random, Friendly, CWL)
- **Clan Capital**: Raid weekend events - includes attack_threshold
- **Clan Games**: Clan games reminders - includes point_threshold
- **Inactivity**: Inactive member tracking
- **roster**: Roster-based reminders - includes roster_id and ping_type

## Data Model

### Time Format
The `time` field is a string representing the time before an event (e.g., "6h", "30m", "1d")

### Townhall Filter
Array of integers representing Town Hall levels (e.g., [14, 15, 16])

### Roles
Array of Discord role IDs as strings

### War Types
For War reminders only: ["Random", "Friendly", "CWL"]

### Point Threshold
For Clan Games reminders: minimum points (default: 4000)

### Attack Threshold
For Clan Capital reminders: minimum attacks (default: 1)

## Features Implemented

1. **Fetch Reminders**: Automatically loads all reminders when the page loads, grouped by type from API
2. **Flatten Response**: Frontend converts the grouped API response into a single flat array for UI
3. **Create Reminder**: Users can add new reminders with the "Add Reminder" button
4. **Update Reminder**: All changes are saved when clicking "Save Changes"
5. **Delete Reminder**: Each reminder has a delete button with API confirmation
6. **Type-Specific Fields**:
   - War reminders show war type selector (Random, Friendly, CWL)
   - Clan Games show point threshold input
   - Clan Capital show attack threshold input
7. **Validation**:
   - Time format validation (e.g., "6h", "30m")
   - All required fields validated before saving

## Authentication

The page uses the standard authentication flow:
- Access token is retrieved from `localStorage.getItem("access_token")`
- If the token is invalid (401), user is redirected to `/login`
- Token is passed in the `Authorization` header as a Bearer token

## Error Handling

The page includes comprehensive error handling:
- Network errors show toast notifications
- Failed API calls display error messages
- Loading states during API calls
- Retry mechanism for failed operations
- Proper error messages for 404 (not found) and 401 (unauthorized)

## UI Components Used

- **Card**: Container for each reminder
- **Select**: Reminder type dropdown
- **Input**: Text fields for time, channel ID, clan tag, messages, and numeric thresholds
- **Button**: Action buttons (Save, Delete, Add)
- **Badge**: Type badges and war type selectors
- **Toast**: Success/error notifications
- **Loader**: Loading spinner during API calls

## Environment Variables

Ensure the following environment variable is set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, update this to point to your API server.

## Development Notes

- All comments in the code are in English
- The page uses TypeScript for type safety
- API response types are defined at the top of the file matching the ClashKingAPI schema
- The page is a client component (`"use client"`) for interactivity
- Temporary IDs (starting with `temp-`) are used for new reminders before they're saved to the API
- The frontend flattens the grouped API response for easier state management

## API Source

The API implementation is available on the ClashKingAPI repository:
- Branch: `claude/dashboard-reminders-01NDuY7i56DZpGcHgWHpkxsJ`
- Router: `/routers/v2/server/reminders.py`
- Models: `/routers/v2/server/reminders_models.py`
