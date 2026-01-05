# ClashKing API - Endpoints Documentation

**API Base URL:** `https://api.clashk.ing`
**Branch:** `feat/dashboard`
**Version:** v2

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Server/Guild Endpoints](#serverguild-endpoints)
3. [Player Endpoints](#player-endpoints)
4. [Clan Endpoints](#clan-endpoints)
5. [Roster Management Endpoints](#roster-management-endpoints)
6. [Roster Groups Endpoints](#roster-groups-endpoints)
7. [Signup Categories Endpoints](#signup-categories-endpoints)
8. [Roster Automation Endpoints](#roster-automation-endpoints)
9. [Legends Endpoints](#legends-endpoints)
10. [War Endpoints](#war-endpoints)
11. [Link Endpoints](#link-endpoints)
12. [Export Endpoints](#export-endpoints)
13. [Search Endpoints](#search-endpoints)
14. [App Endpoints](#app-endpoints)
15. [Tracking Endpoints](#tracking-endpoints)
16. [Dates Endpoints](#dates-endpoints)
17. [Ban Endpoints](#ban-endpoints)
18. [UI Endpoints](#ui-endpoints)

---

## Authentication Endpoints

### 1. Verify Email Code
- **Method:** `POST`
- **Path:** `/v2/auth/verify-email-code`
- **Description:** Verify email with 6-digit verification code
- **Request Body:**
  ```json
  {
    "email": "string",
    "code": "string (6 digits)"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "user": {
      "user_id": "string",
      "username": "string",
      "avatar_url": "string"
    }
  }
  ```

### 2. Get Current User
- **Method:** `GET`
- **Path:** `/v2/auth/me`
- **Description:** Get current authenticated user information
- **Authentication:** Bearer token required
- **Response:**
  ```json
  {
    "user_id": "string",
    "username": "string",
    "avatar_url": "string"
  }
  ```

### 3. Discord Authentication
- **Method:** `POST`
- **Path:** `/v2/auth/discord`
- **Description:** Authenticate using Discord OAuth
- **Request Body:**
  ```json
  {
    "code": "string",
    "code_verifier": "string",
    "device_id": "string (optional)",
    "device_name": "string (optional)",
    "redirect_uri": "string (optional)"
  }
  ```
- **Response:** `AuthResponse`

### 4. Refresh Token
- **Method:** `POST`
- **Path:** `/v2/auth/refresh`
- **Description:** Refresh access token using refresh token
- **Request Body:**
  ```json
  {
    "refresh_token": "string",
    "device_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "string"
  }
  ```

### 5. Register with Email
- **Method:** `POST`
- **Path:** `/v2/auth/register`
- **Description:** Register new user with email
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string",
    "username": "string",
    "device_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "string",
    "verification_code": "string (dev only)"
  }
  ```

### 6. Resend Verification
- **Method:** `POST`
- **Path:** `/v2/auth/resend-verification`
- **Description:** Resend verification email
- **Request Body:**
  ```json
  {
    "email": "string"
  }
  ```
- **Response:**
  ```json
  {
    "message": "string",
    "verification_code": "string (dev only)"
  }
  ```

### 7. Login with Email
- **Method:** `POST`
- **Path:** `/v2/auth/email`
- **Description:** Login with email and password
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string",
    "device_id": "string (optional)"
  }
  ```
- **Response:** `AuthResponse`

### 8. Link Discord Account
- **Method:** `POST`
- **Path:** `/v2/auth/link-discord`
- **Description:** Link Discord account to existing account
- **Authentication:** Bearer token required
- **Request Body:**
  ```json
  {
    "access_token": "string",
    "refresh_token": "string (optional)",
    "expires_in": "number (optional)",
    "device_id": "string (optional)",
    "device_name": "string (optional)"
  }
  ```

### 9. Link Email Account
- **Method:** `POST`
- **Path:** `/v2/auth/link-email`
- **Description:** Link email account to existing account
- **Authentication:** Bearer token required
- **Request Body:** Same as Register

### 10. Forgot Password
- **Method:** `POST`
- **Path:** `/v2/auth/forgot-password`
- **Description:** Request password reset
- **Request Body:**
  ```json
  {
    "email": "string"
  }
  ```

### 11. Reset Password
- **Method:** `POST`
- **Path:** `/v2/auth/reset-password`
- **Description:** Reset password with reset code
- **Request Body:**
  ```json
  {
    "email": "string",
    "reset_code": "string",
    "new_password": "string",
    "device_id": "string (optional)"
  }
  ```
- **Response:** `AuthResponse`

---

## Server/Guild Endpoints

### 1. Get Server Settings
- **Method:** `GET`
- **Path:** `/v2/server/{server_id}/settings`
- **Query Parameters:**
  - `clan_settings` (boolean, default: false)
- **Authentication:** Required
- **Response:** Server settings with roles and optional clan data

### 2. Get Clan Settings
- **Method:** `GET`
- **Path:** `/v2/server/{server_id}/clan/{clan_tag}/settings`
- **Authentication:** Required
- **Response:** Clan settings for the specified server

### 3. Update Server Embed Color
- **Method:** `PUT`
- **Path:** `/v2/server/{server_id}/embed-color/{hex_code}`
- **Authentication:** Required
- **Response:**
  ```json
  {
    "message": "string",
    "server_id": "number",
    "hex_code": "number"
  }
  ```

---

## Player Endpoints

### 1. Get Player Locations
- **Method:** `POST`
- **Path:** `/v2/players/location`
- **Request Body:**
  ```json
  {
    "player_tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "items": [
      {
        "tag": "string",
        "country_name": "string",
        "country_code": "string"
      }
    ]
  }
  ```

### 2. Get Players Sorted by Attribute
- **Method:** `POST`
- **Path:** `/v2/players/sorted/{attribute}`
- **Description:** Get players sorted by specific attribute (e.g., trophies, donations, etc.)
- **Request Body:**
  ```json
  {
    "player_tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "items": [
      {
        "tag": "string",
        "name": "string",
        "value": "number",
        "clan": "string (optional)"
      }
    ]
  }
  ```

### 3. Get Player Summary Top Stats
- **Method:** `POST`
- **Path:** `/v2/players/summary/{season}/top`
- **Query Parameters:**
  - `limit` (number, default: 10)
- **Request Body:**
  ```json
  {
    "player_tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "items": {
      "gold": [],
      "elixir": [],
      "dark_elixir": [],
      "activity": [],
      "attack_wins": [],
      "season_trophies": [],
      "donations": [],
      "capital_donated": [],
      "capital_raided": [],
      "war_stars": []
    }
  }
  ```

---

## Clan Endpoints

### 1. Get Clan Ranking
- **Method:** `GET`
- **Path:** `/v2/clan/{clan_tag}/ranking`
- **Response:**
  ```json
  {
    "tag": "string",
    "global_rank": "number",
    "country_code": "string",
    "country_name": "string",
    "local_rank": "number"
  }
  ```

### 2. Get Clan Board Totals
- **Method:** `GET`
- **Path:** `/v2/clan/{clan_tag}/board/totals`
- **Request Body:**
  ```json
  {
    "player_tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "tag": "string",
    "tracked_player_count": "number",
    "clan_games_points": "number",
    "troops_donated": "number",
    "troops_received": "number",
    "clan_capital_donated": "number",
    "activity_metrics": {}
  }
  ```

### 3. Get Clan Donations (Single Clan)
- **Method:** `GET`
- **Path:** `/v2/clan/{clan_tag}/donations/{season}`
- **Response:**
  ```json
  {
    "items": [
      {
        "tag": "string",
        "donated": "number",
        "received": "number"
      }
    ]
  }
  ```

### 4. Get Clan Composition
- **Method:** `GET`
- **Path:** `/v2/clan/compo`
- **Query Parameters:**
  - `clan_tags` (required, array, 1-100 items)
- **Response:**
  ```json
  {
    "townhall": {},
    "trophies": {},
    "location": {},
    "role": {},
    "league": {},
    "member_count": "number",
    "clan_count": "number"
  }
  ```

### 5. Get Clan Donations (Multiple Clans)
- **Method:** `GET`
- **Path:** `/v2/clan/donations/{season}`
- **Query Parameters:**
  - `clan_tags` (required, array, 1-100 items)
  - `only_current_members` (boolean, optional)
- **Response:** Array of donation objects

---

## Roster Management Endpoints

### 1. Create Roster
- **Method:** `POST`
- **Path:** `/v2/roster`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "name": "string",
    "roster_type": "string",
    "clan_tag": "string (optional)",
    "alias": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "string",
    "roster_id": "string"
  }
  ```

### 2. Update Roster
- **Method:** `PATCH`
- **Path:** `/v2/roster/{roster_id}`
- **Query Parameters:**
  - `server_id` (number, required)
  - `group_id` (string, optional)
- **Request Body:**
  ```json
  {
    "min_th": "number (optional)",
    "max_th": "number (optional)",
    "clan_tag": "string (optional)",
    "roster_type": "string (optional)"
  }
  ```

### 3. Get Roster
- **Method:** `GET`
- **Path:** `/v2/roster/{roster_id}`
- **Query Parameters:**
  - `server_id` (number, required)

### 4. Delete Roster
- **Method:** `DELETE`
- **Path:** `/v2/roster/{roster_id}`
- **Query Parameters:**
  - `server_id` (number, required)
  - `members_only` (boolean, optional)

### 5. List Rosters
- **Method:** `GET`
- **Path:** `/v2/roster/{server_id}/list`
- **Query Parameters:**
  - `group_id` (string, optional)
  - `clan_tag` (string, optional)
- **Response:**
  ```json
  {
    "items": [],
    "server_id": "number",
    "group_id": "string (optional)",
    "clan_tag": "string (optional)"
  }
  ```

### 6. Clone Roster
- **Method:** `POST`
- **Path:** `/v2/roster/{roster_id}/clone`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "new_alias": "string",
    "copy_members": "boolean (optional)",
    "group_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "string",
    "new_roster_id": "string",
    "new_alias": "string",
    "target_server_id": "number",
    "is_cross_server": "boolean",
    "members_copied": "number"
  }
  ```

### 7. Refresh Rosters
- **Method:** `POST`
- **Path:** `/v2/roster/refresh`
- **Query Parameters:**
  - `server_id` (number, optional)
  - `group_id` (string, optional)
  - `roster_id` (string, optional)
- **Response:**
  ```json
  {
    "message": "string",
    "refreshed_rosters": []
  }
  ```

### 8. Bulk Update Roster Members
- **Method:** `POST`
- **Path:** `/v2/roster/{roster_id}/members`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "add": [
      {
        "player_tag": "string",
        "signup_group": "string (optional)"
      }
    ],
    "remove": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "message": "string",
    "added": "number",
    "removed": "number",
    "success_count": "number",
    "error_count": "number"
  }
  ```

### 9. Update Individual Roster Member
- **Method:** `PATCH`
- **Path:** `/v2/roster/{roster_id}/members/{member_tag}`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "signup_group": "string (optional)",
    "member_status": "string (optional)"
  }
  ```

### 10. Remove Member from Roster
- **Method:** `DELETE`
- **Path:** `/v2/roster/{roster_id}/members/{player_tag}`
- **Query Parameters:**
  - `server_id` (number, required)

### 11. Get Missing Members
- **Method:** `GET`
- **Path:** `/v2/roster/missing-members`
- **Query Parameters:**
  - `server_id` (number, required)
  - `roster_id` (string, optional)
  - `group_id` (string, optional)
- **Response:**
  ```json
  {
    "query_type": "string",
    "query_value": "string",
    "server_id": "number",
    "results": [],
    "total_rosters_checked": "number"
  }
  ```

### 12. Get Server Clan Members
- **Method:** `GET`
- **Path:** `/v2/roster/server/{server_id}/members`
- **Response:**
  ```json
  {
    "members": []
  }
  ```

### 13. Generate Roster Access Token
- **Method:** `POST`
- **Path:** `/v2/roster-token`
- **Query Parameters:**
  - `server_id` (number, required)
  - `roster_id` (string, optional)
- **Response:**
  ```json
  {
    "message": "string",
    "server_info": {},
    "access_url": "string",
    "token": "string",
    "expires_at": "string"
  }
  ```

---

## Roster Groups Endpoints

### 1. Create Roster Group
- **Method:** `POST`
- **Path:** `/v2/roster-group`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "alias": "string",
    "description": "string (optional)"
  }
  ```

### 2. Get Roster Group
- **Method:** `GET`
- **Path:** `/v2/roster-group/{group_id}`
- **Query Parameters:**
  - `server_id` (number, required)

### 3. Update Roster Group
- **Method:** `PATCH`
- **Path:** `/v2/roster-group/{group_id}`
- **Query Parameters:**
  - `server_id` (number, required)
- **Request Body:**
  ```json
  {
    "alias": "string (optional)",
    "description": "string (optional)"
  }
  ```

### 4. List Roster Groups
- **Method:** `GET`
- **Path:** `/v2/roster-group/list`
- **Query Parameters:**
  - `server_id` (number, required)

### 5. Delete Roster Group
- **Method:** `DELETE`
- **Path:** `/v2/roster-group/{group_id}`
- **Query Parameters:**
  - `server_id` (number, required)
- **Response:**
  ```json
  {
    "message": "string",
    "affected_rosters": "number"
  }
  ```

---

## Signup Categories Endpoints

### 1. Create Signup Category
- **Method:** `POST`
- **Path:** `/v2/roster-signup-category`
- **Request Body:**
  ```json
  {
    "alias": "string",
    "server_id": "number",
    "custom_id": "string",
    "description": "string (optional)"
  }
  ```

### 2. List Signup Categories
- **Method:** `GET`
- **Path:** `/v2/roster-signup-category/list`
- **Query Parameters:**
  - `server_id` (number, required)

### 3. Update Signup Category
- **Method:** `PATCH`
- **Path:** `/v2/roster-signup-category/{custom_id}`
- **Query Parameters:**
  - `server_id` (number, required)

### 4. Delete Signup Category
- **Method:** `DELETE`
- **Path:** `/v2/roster-signup-category/{custom_id}`
- **Query Parameters:**
  - `server_id` (number, required)

---

## Roster Automation Endpoints

### 1. Create Automation Rule
- **Method:** `POST`
- **Path:** `/v2/roster-automation`
- **Request Body:**
  ```json
  {
    "action": "string",
    "roster_id": "string (optional)",
    "group_id": "string (optional)",
    "schedule": {}
  }
  ```

### 2. List Automation Rules
- **Method:** `GET`
- **Path:** `/v2/roster-automation/list`
- **Query Parameters:**
  - `server_id` (number, required)
  - `roster_id` (string, optional)
  - `group_id` (string, optional)
  - `active_only` (boolean, optional)

### 3. Update Automation Rule
- **Method:** `PATCH`
- **Path:** `/v2/roster-automation/{automation_id}`
- **Query Parameters:**
  - `server_id` (number, required)

### 4. Delete Automation Rule
- **Method:** `DELETE`
- **Path:** `/v2/roster-automation/{automation_id}`
- **Query Parameters:**
  - `server_id` (number, required)

---

## Legends Endpoints

### 1. Get Legends Stats for Day
- **Method:** `GET`
- **Path:** `/v2/legends/players/day/{day}`
- **Query Parameters:**
  - `players` (array of strings, optional)
- **Response:** Array of player legends data for specific day

### 2. Get Legends Stats for Season
- **Method:** `GET`
- **Path:** `/v2/legends/players/season/{season}`
- **Query Parameters:**
  - `players` (array of strings, optional)
- **Response:** Array of player legends data for entire season

---

## War Endpoints

### 1. Get Previous Wars
- **Method:** `GET`
- **Path:** `/v2/war/{clan_tag}/previous`
- **Query Parameters:**
  - `timestamp_start` (number, default: 0)
  - `timestamp_end` (number, default: 9999999999)
  - `include_cwl` (boolean, default: false)
  - `limit` (number, default: 50)
- **Response:**
  ```json
  {
    "items": []
  }
  ```

### 2. Get CWL Ranking History
- **Method:** `GET`
- **Path:** `/v2/cwl/{clan_tag}/ranking-history`
- **Response:**
  ```json
  {
    "items": [
      {
        "season": "string",
        "league": "string",
        "rank": "number",
        "name": "string",
        "tag": "string",
        "stars": "number",
        "destruction": "number",
        "rounds": {
          "won": "number",
          "tied": "number",
          "lost": "number"
        }
      }
    ]
  }
  ```

### 3. Get CWL League Thresholds
- **Method:** `GET`
- **Path:** `/v2/cwl/league-thresholds`
- **Response:**
  ```json
  {
    "items": [
      {
        "id": "string",
        "name": "string",
        "promo_threshold": "number",
        "demotion_threshold": "number"
      }
    ]
  }
  ```

### 4. Get Clan War Statistics
- **Method:** `GET`
- **Path:** `/v2/war/clan/stats`
- **Query Parameters:**
  - `clan_tags` (array, required, 1-100 items)
  - `timestamp_start` (number, default: 0)
  - `timestamp_end` (number, default: 9999999999)
  - `war_types` (number, default: 7)
  - `townhall_filter` (string, default: "all")
  - `limit` (number, default: 1000)

---

## Link Endpoints

### 1. Link Account (Authenticated)
- **Method:** `POST`
- **Path:** `/v2/link`
- **Authentication:** Bearer token required
- **Request Body:**
  ```json
  {
    "player_tag": "string",
    "api_token": "string",
    "player_token": "string (optional)"
  }
  ```
- **Response:** Account details with verification status

### 2. Link Account (No Auth)
- **Method:** `POST`
- **Path:** `/v2/link/no-auth`
- **Description:** Requires Discord user ID
- **Request Body:**
  ```json
  {
    "user_id": "string",
    "player_tag": "string",
    "api_token": "string",
    "player_token": "string (optional)"
  }
  ```

### 3. Get Linked Accounts
- **Method:** `GET`
- **Path:** `/v2/links/{tag_or_id}`
- **Description:** Get linked accounts for player tag or user ID
- **Response:** Array of account objects

### 4. Unlink Account (Authenticated)
- **Method:** `DELETE`
- **Path:** `/v2/link/{tag}`
- **Authentication:** Bearer token required

### 5. Unlink Account (No Auth)
- **Method:** `DELETE`
- **Path:** `/v2/link/no-auth/{tag}`
- **Query Parameters:**
  - `api_token` (string, required)

### 6. Reorder Linked Accounts
- **Method:** `PUT`
- **Path:** `/v2/links/reorder`
- **Authentication:** Bearer token required
- **Request Body:**
  ```json
  {
    "ordered_tags": ["string"]
  }
  ```

---

## Export Endpoints

### 1. Export CWL Summary
- **Method:** `GET`
- **Path:** `/v2/exports/war/cwl-summary`
- **Query Parameters:**
  - `tag` (string, required) - Clan tag
- **Response:** Excel file (FileResponse)

### 2. Export Player War Statistics
- **Method:** `POST`
- **Path:** `/v2/exports/war/player-stats`
- **Request Body:**
  ```json
  {
    "player_tags": ["string"],
    "timestamp_start": "number",
    "timestamp_end": "number",
    "limit": "number (optional)",
    "season": "string (optional)",
    "type": "number (optional)",
    "own_th": "number (optional)",
    "enemy_th": "number (optional)",
    "stars": "number (optional)",
    "min_destruction": "number (optional)",
    "max_destruction": "number (optional)",
    "map_position_min": "number (optional)",
    "map_position_max": "number (optional)",
    "fresh_only": "boolean (optional)"
  }
  ```
- **Response:** Excel file (FileResponse)

---

## Search Endpoints

### 1. Search Clan
- **Method:** `GET`
- **Path:** `/v2/search/clan`
- **Query Parameters:**
  - `query` (string)
  - `user_id` (number, optional)
  - `guild_id` (number, optional)
- **Response:**
  ```json
  {
    "items": [
      {
        "name": "string",
        "tag": "string",
        "memberCount": "number",
        "level": "number",
        "warLeague": "string",
        "type": "string"
      }
    ]
  }
  ```

### 2. Search Banned Players
- **Method:** `GET`
- **Path:** `/v2/search/{guild_id}/banned-players`
- **Query Parameters:**
  - `query` (string)

### 3. Bookmark Search
- **Method:** `POST`
- **Path:** `/v2/search/bookmark/{user_id}/{type}/{tag}`

### 4. Add Recent Search
- **Method:** `POST`
- **Path:** `/v2/search/recent/{user_id}/{type}/{tag}`

### 5. Create Search Group
- **Method:** `POST`
- **Path:** `/v2/search/groups/create/{user_id}/{name}/{type}`

### 6. Add to Search Group
- **Method:** `POST`
- **Path:** `/v2/search/groups/{group_id}/add/{tag}`

### 7. Remove from Search Group
- **Method:** `POST`
- **Path:** `/v2/search/groups/{group_id}/remove/{tag}`

### 8. Get Search Group
- **Method:** `GET`
- **Path:** `/v2/search/groups/{group_id}`

### 9. List Search Groups
- **Method:** `GET`
- **Path:** `/v2/search/groups/{user_id}/list`

### 10. Delete Search Group
- **Method:** `DELETE`
- **Path:** `/v2/search/groups/{group_id}`

---

## App Endpoints

### 1. Get Public Configuration
- **Method:** `GET`
- **Path:** `/v2/app/public-config`
- **Authentication:** Not required
- **Response:**
  ```json
  {
    "sentry_dsn": "string"
  }
  ```

### 2. Initialize App Data
- **Method:** `POST`
- **Path:** `/v2/app/initialization`
- **Description:** Consolidates 8 parallel API calls for mobile app initialization
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "player_tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "players": [],
    "players_basic": [],
    "clans": {
      "clan_details": {},
      "clan_stats": {},
      "war_data": [],
      "join_leave_data": {},
      "capital_data": [],
      "war_log_data": [],
      "clan_war_stats": []
    },
    "war_stats": [],
    "clan_tags": [],
    "metadata": {}
  }
  ```

---

## Tracking Endpoints

### 1. Add Players to Tracking
- **Method:** `POST`
- **Path:** `/v2/tracking/players/add`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "players_added": ["string"],
    "players_already_tracked": ["string"]
  }
  ```

### 2. Remove Players from Tracking
- **Method:** `POST`
- **Path:** `/v2/tracking/players/remove`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "tags": ["string"]
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "players_removed": ["string"]
  }
  ```

---

## Dates Endpoints

### 1. Get Season Dates
- **Method:** `GET`
- **Path:** `/v2/dates/seasons`
- **Query Parameters:**
  - `number_of_seasons` (number, default: 0)
  - `as_text` (boolean, default: false)
- **Response:**
  ```json
  {
    "items": []
  }
  ```

### 2. Get Raid Weekend Dates
- **Method:** `GET`
- **Path:** `/v2/dates/raid-weekends`
- **Query Parameters:**
  - `number_of_weeks` (number, default: 0)

### 3. Get Current Dates
- **Method:** `GET`
- **Path:** `/v2/dates/current`
- **Response:**
  ```json
  {
    "season": "...",
    "raid": "...",
    "legend": "...",
    "clan-games": "..."
  }
  ```

### 4. Get Season Start and End
- **Method:** `GET`
- **Path:** `/v2/dates/season-start-end`
- **Query Parameters:**
  - `season` (string, default: "")
  - `gold_pass_season` (boolean, default: false)
- **Response:**
  ```json
  {
    "season_start": "...",
    "season_end": "..."
  }
  ```

### 5. Get Season Raid Dates
- **Method:** `GET`
- **Path:** `/v2/dates/season-raid-dates`
- **Query Parameters:**
  - `season` (string, default: "")

---

## Ban Endpoints

### 1. Get Bans for Server
- **Method:** `GET`
- **Path:** `/v2/ban/list/{server_id}`
- **Authentication:** Required
- **Response:**
  ```json
  {
    "items": []
  }
  ```

### 2. Add or Update Ban
- **Method:** `POST`
- **Path:** `/v2/ban/add/{server_id}/{player_tag}`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "reason": "string",
    "added_by": "number",
    "image": "optional"
  }
  ```
- **Response:**
  ```json
  {
    "status": "created|updated",
    "player_tag": "string",
    "server_id": "number"
  }
  ```

### 3. Remove Ban
- **Method:** `DELETE`
- **Path:** `/v2/ban/remove/{server_id}/{player_tag}`
- **Authentication:** Required
- **Response:**
  ```json
  {
    "status": "deleted",
    "player_tag": "string",
    "server_id": "string"
  }
  ```

---

## UI Endpoints

### 1. Roster Dashboard Page
- **Method:** `GET`
- **Path:** `/ui/roster/dashboard`
- **Query Parameters:**
  - `server_id` (number, required)
  - `token` (string, required)
  - `roster_id` (string, optional)
- **Response:** HTML page
- **Description:** Returns a complete roster dashboard page with context data including current roster, all rosters, groups, categories, server clans, and timestamp

---

## Summary Statistics

**Total Endpoints Documented:** 100+

**Breakdown by Category:**
- Authentication: 11 endpoints
- Server/Guild: 3 endpoints
- Player: 3 endpoints
- Clan: 5 endpoints
- Roster Management: 13 endpoints
- Roster Groups: 5 endpoints
- Signup Categories: 4 endpoints
- Roster Automation: 4 endpoints
- Legends: 2 endpoints
- War: 4 endpoints
- Link: 6 endpoints
- Export: 2 endpoints
- Search: 10 endpoints
- App: 2 endpoints
- Tracking: 2 endpoints
- Dates: 5 endpoints
- Ban: 3 endpoints
- UI: 1 endpoint

---

## Usage Notes

1. **Authentication:** Most endpoints require a Bearer token in the Authorization header
2. **Base URL:** All endpoints are prefixed with the base URL (e.g., `https://api.clashk.ing`)
3. **Content Type:** All POST/PATCH requests expect `application/json`
4. **Player Tags:** Should be properly formatted (with # symbol or URL-encoded as %23)
5. **Clan Tags:** Should be properly formatted (with # symbol or URL-encoded as %23)
6. **Error Responses:** Follow standard HTTP status codes (400, 401, 403, 404, 500, etc.)

---

## Integration Example

```typescript
import { createApiClient } from './lib/api-client';

// Initialize client
const client = createApiClient('https://api.clashk.ing', 'your-access-token');

// Example: Get current user
const { data, error } = await client.getCurrentUser();

// Example: Search for clans
const clans = await client.searchClan('Warriors', userId, guildId);

// Example: Get roster list
const rosters = await client.listRosters(serverId);
```
