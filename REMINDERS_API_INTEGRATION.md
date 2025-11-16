# Reminders API Integration

This document describes how the Reminders page integrates with the ClashKingAPI endpoints from branch `claude/wars-dashboard-page-01EREbuX2id7T7qBme3xvJfw`.

## API Endpoints Used

The reminders page (`/app/[locale]/dashboard/[guildId]/reminders/page.tsx`) integrates with the following API endpoints:

### 1. GET `/v2/reminders/{guild_id}`
**Purpose**: Fetch all reminders for a specific guild

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Response**:
```json
{
  "reminders": [
    {
      "id": "string",
      "guild_id": "string",
      "reminder_type": "war|cwl|raid|games|custom",
      "enabled": boolean,
      "time_before_hours": number,
      "channel_id": "string|null",
      "role_id": "string|null",
      "message": "string|null",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

### 2. POST `/v2/reminders`
**Purpose**: Create a new reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "guild_id": "string",
  "reminder_type": "war|cwl|raid|games|custom",
  "enabled": boolean,
  "time_before_hours": number,
  "channel_id": "string|null",
  "role_id": "string|null",
  "message": "string|null"
}
```

**Response**: Returns the created reminder object

### 3. PUT `/v2/reminders/{reminder_id}`
**Purpose**: Update an existing reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**: Same as POST endpoint

**Response**: Returns the updated reminder object

### 4. DELETE `/v2/reminders/{reminder_id}`
**Purpose**: Delete a reminder

**Request Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Response**: Success/error status

## Reminder Types

The page supports the following reminder types:

- **war**: Regular clan wars
- **cwl**: Clan War League battles
- **raid**: Raid weekend events
- **games**: Clan Games
- **custom**: Custom reminders

## Features Implemented

1. **Fetch Reminders**: Automatically loads all reminders when the page loads
2. **Create Reminder**: Users can add new reminders with the "Add Reminder" button
3. **Update Reminder**: All changes are saved when clicking "Save Changes"
4. **Delete Reminder**: Each reminder has a delete button
5. **Enable/Disable**: Toggle reminders on/off with a switch
6. **Validation**:
   - Hours before event: 1-72 hours
   - All required fields are validated before saving

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

## UI Components Used

- **Card**: Container for each reminder
- **Switch**: Enable/disable toggle
- **Select**: Reminder type dropdown
- **Input**: Text fields for hours, IDs, and messages
- **Button**: Action buttons (Save, Delete, Add)
- **Badge**: Status indicators (Active/Disabled)
- **Toast**: Success/error notifications

## Environment Variables

Ensure the following environment variable is set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, update this to point to your API server.

## Development Notes

- All comments in the code are in English
- The page uses TypeScript for type safety
- API response types are defined at the top of the file
- The page is a client component (`"use client"`) for interactivity
