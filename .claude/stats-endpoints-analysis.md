# Statistics Pages & API Endpoints Analysis

## Overview

This document outlines the proposed statistics pages for the ClashKing Dashboard, based on available API endpoints and ClashKingBot v2.0 capabilities.

---

## Current API Endpoints (ClashKingAPI v2)

### War Statistics
- ✅ `GET /v2/war/{clan_tag}/previous` - Historical clan war records
- ✅ `GET /v2/war/{clan_tag}/previous/{end_time}` - Specific war at given endtime
- ✅ `GET /v2/war/{clan_tag}/basic` - Current war information
- ✅ `GET /v2/war/clan/stats` - Clan war statistics with filters
- ✅ `GET /v2/player/{player_tag}/warhits` - Player war attack records
- ✅ `GET /v2/cwl/{clan_tag}/ranking-history` - CWL ranking history
- ✅ `GET /v2/cwl/league-thresholds` - CWL league thresholds
- ✅ `POST /v2/exports/war/cwl-summary` - Export CWL summary
- ✅ `POST /v2/exports/war/player-stats` - Export player war stats

### Clan Statistics
- ✅ `GET /v2/clan/{clan_tag}/ranking` - Clan ranking data
- ✅ `GET /v2/clan/{clan_tag}/board/totals` - Clan board totals
- ✅ `GET /v2/clan/{clan_tag}/donations/{season}` - Single clan donations
- ✅ `GET /v2/clan/donations/{season}` - Multi-clan donations (supports multiple clan tags)
- ✅ `GET /v2/clan/compo` - Clan composition (TH distribution)
- ✅ `GET /v2/clan/{clan_tag}/join-leave` - Member join/leave history
- ✅ `GET /v2/clan/{clan_tag}/historical` - Historical player events

### Capital Raids
- ✅ `GET /v2/capital/{clan_tag}` - Raid weekend logs
- ✅ `POST /v2/capital/bulk` - Bulk raid data (up to 100 clans)
- ✅ `GET /v2/capital/stats/district` - District performance metrics
- ✅ `GET /v2/capital/stats/leagues` - Capital league statistics
- ✅ `GET /v2/leaderboard/clans/capital` - Clan capital rankings
- ✅ `GET /v2/leaderboard/players/capital` - Player capital loot rankings

### Legends League
- ✅ `GET /v2/player/{player_tag}/legends` - Player legend league performance
- ✅ `GET /v2/player/{player_tag}/legend_rankings` - Player legend ranking history
- ✅ `GET /v2/legends/clan/{clan_tag}/{date}` - Clan legend stats for specific date
- ✅ `GET /v2/legends/streaks` - Top legend win streaks
- ✅ `GET /v2/legends/trophy-buckets` - Trophy distribution
- ✅ `GET /v2/legends/eos-winners` - End-of-season #1 players

### Player Statistics
- ✅ `GET /v2/player/{player_tag}/stats` - Comprehensive player stats
- ✅ `POST /v2/players/sorted/{attribute}` - Sort players by attribute
- ✅ `POST /v2/players/summary/{season}/top` - Top players for season
- ✅ `POST /v2/players/location` - Player locations
- ✅ `GET /v2/player/{player_tag}/historical/{season}` - Historical player data

### Activity Tracking
- ✅ `GET /v2/player/{player_tag}/raids` - Raid participation records
- ✅ `GET /v2/player/to-do` - Pending in-game objectives

---

## Proposed Statistics Pages

### 1. Donations Page (High Priority) ⭐⭐⭐

**Status:** ✅ All endpoints available

**Available Endpoints:**
- `GET /v2/clan/{clan_tag}/donations/{season}`
- `GET /v2/clan/donations/{season}` with `clan_tags[]` and `only_current_members` params

**Features:**
- Season-based donation rankings
- Donated vs Received comparison charts
- Multi-season trend analysis
- Cross-clan comparison
- Top donors leaderboard (all-time & seasonal)
- Donation ratio analysis (donate/receive ratio)

**Implementation Difficulty:** Easy - All data readily available

---

### 2. Capital Raids Page (High Priority) ⭐⭐⭐

**Status:** ⚠️ Most endpoints available, some missing

**Available Endpoints:**
- `GET /v2/capital/{clan_tag}` - Raid weekend logs
- `POST /v2/capital/bulk` - Multi-clan data
- `GET /v2/capital/stats/district` - District stats
- `GET /v2/capital/stats/leagues` - League stats
- `GET /v2/leaderboard/players/capital` - Player rankings

**Missing Endpoints:**
- ❌ `GET /v2/capital/player-stats` - Individual player raid statistics
  - **Parameters:** `guild_id`, `clan_tags[]`, `season?`, `limit?`
  - **Returns:** Player raid stats (attacks, loot, participation rate)

- ❌ `GET /v2/capital/guild-leaderboard` - Server-specific raid leaderboard
  - **Parameters:** `guild_id`, `season?`, `metric` (loot/attacks/participation)
  - **Returns:** Ranked list of players from server's clans

**Features:**
- Raid weekend performance history
- District performance breakdown
- Player leaderboards (loot, attacks, participation)
- Capital league progression tracking
- Participation rate analysis
- Best/worst performing districts

**Implementation Difficulty:** Medium - Need 2 new endpoints for complete functionality

---

### 3. Legends League Page (Medium Priority) ⭐⭐

**Status:** ⚠️ Good coverage, missing aggregation endpoints

**Available Endpoints:**
- `GET /v2/player/{player_tag}/legends`
- `GET /v2/legends/clan/{clan_tag}/{date}`
- `GET /v2/legends/streaks`
- `GET /v2/legends/trophy-buckets`
- `GET /v2/legends/eos-winners`

**Missing Endpoints:**
- ❌ `GET /v2/legends/guild-stats` - Aggregate legend stats for guild
  - **Parameters:** `guild_id`, `season?`, `limit?`
  - **Returns:** Combined legend stats from all server members

- ❌ `GET /v2/legends/daily-tracking` - Daily trophy progression
  - **Parameters:** `player_tag`, `start_date`, `end_date`
  - **Returns:** Daily trophy counts for trending charts

**Features:**
- Server legend leaderboard
- Daily trophy progression graphs
- Win/loss streak tracking
- Trophy distribution visualization
- End-of-season top finishers
- Personal bests tracking

**Implementation Difficulty:** Medium - Requires aggregation logic for guild stats

---

### 4. Activity & Member Tracking (Medium Priority) ⭐⭐

**Status:** ⚠️ Basic data available, needs enhancement endpoints

**Available Endpoints:**
- `GET /v2/clan/{clan_tag}/join-leave`
- `GET /v2/player/{player_tag}/stats` (includes activity data)

**Missing Endpoints:**
- ❌ `GET /v2/activity/guild-summary` - Server-wide activity overview
  - **Parameters:** `guild_id`, `days?` (default: 30)
  - **Returns:** Active player count, retention rate, join/leave trends

- ❌ `GET /v2/activity/inactive-players` - List of inactive members
  - **Parameters:** `guild_id`, `clan_tags[]`, `days` (inactivity threshold)
  - **Returns:** Players who haven't been active in X days

- ❌ `GET /v2/activity/retention-metrics` - Member retention analytics
  - **Parameters:** `guild_id`, `period` (weekly/monthly)
  - **Returns:** Retention rates, churn analysis

**Features:**
- Join/leave history graphs
- Member retention rate
- Inactive player detection (configurable threshold)
- Activity heatmap (hourly/daily)
- Most active members
- Clan growth trends

**Implementation Difficulty:** Medium - Requires new activity tracking endpoints

---

### 5. Player Performance (Low Priority) ⭐

**Status:** ✅ Good coverage with existing endpoints

**Available Endpoints:**
- `POST /v2/players/sorted/{attribute}`
- `POST /v2/players/summary/{season}/top`
- `GET /v2/player/{player_tag}/stats`

**Missing Endpoints:**
- ❌ `GET /v2/players/comparison` - Side-by-side player comparison
  - **Parameters:** `player_tags[]` (2-5 players)
  - **Returns:** Comparative stats across multiple metrics

- ❌ `GET /v2/players/progress-tracking` - Historical progression
  - **Parameters:** `player_tag`, `metric`, `start_date`, `end_date`
  - **Returns:** Time-series data for specific metric

**Features:**
- Multi-criteria leaderboards
- Player comparison tool
- Progress tracking charts
- Achievement tracking
- TH upgrade timeline
- Trophy progression

**Implementation Difficulty:** Easy-Medium - Most data available via existing endpoints

---

### 6. Clan Games (Low Priority) ⭐

**Status:** ❌ Limited coverage, needs dedicated endpoints

**Available Endpoints:**
- Partial data in `GET /v2/player/{player_tag}/stats`

**Missing Endpoints:**
- ❌ `GET /v2/clan-games/{clan_tag}/current` - Current clan games stats
  - **Parameters:** `clan_tag`
  - **Returns:** Current games progress, participant scores

- ❌ `GET /v2/clan-games/{clan_tag}/history` - Historical clan games
  - **Parameters:** `clan_tag`, `limit?`
  - **Returns:** Past clan games results and participation

- ❌ `GET /v2/clan-games/leaderboard` - Participant rankings
  - **Parameters:** `clan_tag`, `event_id?`
  - **Returns:** Ranked list of participants

**Features:**
- Real-time clan games tracking
- Participant leaderboard
- Historical performance
- Participation rate analysis
- Point contribution breakdown

**Implementation Difficulty:** High - Requires new data collection infrastructure

---

## Required API Endpoints (Priority Order)

### High Priority (Implement First)

1. **`GET /v2/capital/player-stats`**
   - Required for: Capital Raids page
   - Complexity: Medium
   - Impact: High (enables complete raid analytics)

2. **`GET /v2/activity/guild-summary`**
   - Required for: Activity & Overview pages
   - Complexity: Medium
   - Impact: High (core dashboard metric)

3. **`GET /v2/activity/inactive-players`**
   - Required for: Activity page & admin features
   - Complexity: Low
   - Impact: High (critical for clan management)

### Medium Priority (Implement Second)

4. **`GET /v2/legends/guild-stats`**
   - Required for: Legends page
   - Complexity: Medium
   - Impact: Medium (nice-to-have for competitive servers)

5. **`GET /v2/legends/daily-tracking`**
   - Required for: Legends page graphs
   - Complexity: Medium
   - Impact: Medium (enhances visualization)

6. **`GET /v2/capital/guild-leaderboard`**
   - Required for: Capital Raids page
   - Complexity: Low
   - Impact: Medium (complements existing data)

### Low Priority (Future Enhancement)

7. **`GET /v2/players/comparison`**
   - Required for: Player Performance page
   - Complexity: Low
   - Impact: Low (optional feature)

8. **`GET /v2/activity/retention-metrics`**
   - Required for: Advanced analytics
   - Complexity: High
   - Impact: Low (admin-focused)

9. **`GET /v2/clan-games/*` (all endpoints)**
   - Required for: Clan Games page
   - Complexity: High
   - Impact: Low (seasonal feature)

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)
- ✅ **Donations Page** - Use existing endpoints
- ✅ **Wars Page Simplification** - Already implemented

### Phase 2: High-Value Features (Week 3-4)
- Create Capital Raids endpoints
- Implement Capital Raids page
- Create Activity tracking endpoints
- Implement Activity page

### Phase 3: Enhancement (Week 5-6)
- Create Legends aggregation endpoints
- Implement Legends page
- Add Overview page improvements

### Phase 4: Polish (Week 7+)
- Player Performance page
- Clan Games infrastructure
- Advanced analytics

---

## Dashboard Overview Page Recommendations

Based on the statistics pages, the Overview should show:

1. **Quick Stats** (Last 30 days)
   - War Record: X wins - Y losses (Z% win rate)
   - Top Donator: Player name (amount)
   - Active Members: Count

2. **Recent Activity Feed**
   - Latest war results
   - New members joined
   - Recent achievements

3. **Quick Actions**
   - View detailed stats (links to stats pages)
   - Export reports

4. **Configuration Status** (collapsible for new users)
   - Setup checklist
   - Missing configurations

---

## Technical Notes

### API Client Structure
All API calls are already structured in `/lib/api/clients/`:
- `war-client.ts` - War statistics
- `clan-client.ts` - Clan data
- `player-client.ts` - Player data

New clients needed:
- `capital-client.ts` - Capital raids (extend existing)
- `legends-client.ts` - Legends tracking
- `activity-client.ts` - Activity metrics

### Data Caching Strategy
- Cache war stats: 1 hour
- Cache donations: 6 hours
- Cache legends: 30 minutes (during active season)
- Cache activity: 15 minutes

### Performance Considerations
- Use pagination for large datasets
- Implement virtual scrolling for leaderboards
- Pre-aggregate common queries
- Use background jobs for heavy calculations

---

## Missing API Endpoints - Detailed Specifications

This section provides the complete endpoint specifications ready for implementation in ClashKingAPI.

### High Priority Endpoints

#### 1. Capital Raids - Player Statistics

```python
@router.get("/v2/capital/player-stats")
async def get_capital_player_stats(
    rest: hikari.RESTApp,
    guild_id: int,
    clan_tags: list[str] = Query(...),
    season: str | None = None,
    limit: int = 100,
    offset: int = 0
) -> dict:
    """
    Get individual player raid statistics for guild's clans.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - clan_tags: list[str] - List of clan tags to include
    - season: str | None - Specific raid weekend (YYYY-MM-DD format), None for all
    - limit: int - Max number of players to return (default: 100)
    - offset: int - Pagination offset (default: 0)

    Returns:
    {
      "items": [
        {
          "player_tag": str,
          "player_name": str,
          "clan_tag": str,
          "total_raids": int,
          "total_attacks": int,
          "total_loot": int,
          "average_loot": float,
          "participation_rate": float,  # percentage of raids participated
          "best_raid": {
            "date": str,
            "attacks": int,
            "loot": int
          }
        }
      ],
      "total": int,
      "page": int,
      "page_size": int
    }
    """
```

#### 2. Capital Raids - Guild Leaderboard

```python
@router.get("/v2/capital/guild-leaderboard")
async def get_capital_guild_leaderboard(
    rest: hikari.RESTApp,
    guild_id: int,
    season: str | None = None,
    metric: str = Query("loot", regex="^(loot|attacks|participation)$"),
    limit: int = 50
) -> dict:
    """
    Get server-specific raid leaderboard.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - season: str | None - Specific raid weekend, None for current
    - metric: str - Sort by: "loot", "attacks", or "participation"
    - limit: int - Number of players to return (default: 50)

    Returns:
    {
      "season": str,
      "metric": str,
      "leaderboard": [
        {
          "rank": int,
          "player_tag": str,
          "player_name": str,
          "clan_tag": str,
          "clan_name": str,
          "value": int | float,  # based on metric
          "attacks": int,
          "loot": int,
          "participation_rate": float
        }
      ]
    }
    """
```

#### 3. Activity - Guild Summary

```python
@router.get("/v2/activity/guild-summary")
async def get_activity_guild_summary(
    rest: hikari.RESTApp,
    guild_id: int,
    days: int = 30
) -> dict:
    """
    Get server-wide activity overview.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - days: int - Look-back period in days (default: 30)

    Returns:
    {
      "period": {
        "start": str,  # ISO datetime
        "end": str,
        "days": int
      },
      "totals": {
        "total_members": int,
        "active_members": int,
        "inactive_members": int,
        "new_members": int,
        "left_members": int
      },
      "activity_rate": float,  # percentage active
      "retention_rate": float,  # percentage retained
      "trends": {
        "daily_active": [
          {"date": str, "count": int}
        ],
        "join_leave": [
          {"date": str, "joined": int, "left": int}
        ]
      },
      "clan_breakdown": [
        {
          "clan_tag": str,
          "clan_name": str,
          "members": int,
          "active": int,
          "activity_rate": float
        }
      ]
    }
    """
```

### Medium Priority Endpoints

#### 4. Activity - Inactive Players

```python
@router.get("/v2/activity/inactive-players")
async def get_inactive_players(
    rest: hikari.RESTApp,
    guild_id: int,
    clan_tags: list[str] = Query(...),
    days: int = 7
) -> dict:
    """
    List players who haven't been active in X days.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - clan_tags: list[str] - List of clan tags to check
    - days: int - Inactivity threshold in days (default: 7)

    Returns:
    {
      "threshold_days": int,
      "total_inactive": int,
      "players": [
        {
          "player_tag": str,
          "player_name": str,
          "clan_tag": str,
          "clan_name": str,
          "last_seen": str,  # ISO datetime
          "days_inactive": int,
          "townhall": int,
          "trophies": int,
          "last_activity": {
            "type": str,  # "attack", "donation", "clan_games", etc.
            "timestamp": str
          }
        }
      ]
    }
    """
```

#### 5. Legends - Guild Statistics

```python
@router.get("/v2/legends/guild-stats")
async def get_legends_guild_stats(
    rest: hikari.RESTApp,
    guild_id: int,
    season: str | None = None,
    limit: int = 50
) -> dict:
    """
    Aggregate legend league stats for guild members.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - season: str | None - Season ID (YYYY-MM), None for current
    - limit: int - Max players in leaderboard (default: 50)

    Returns:
    {
      "season": str,
      "summary": {
        "total_players": int,
        "active_players": int,  # currently in legends
        "average_trophies": float,
        "total_attacks": int,
        "total_defenses": int
      },
      "leaderboard": [
        {
          "rank": int,
          "player_tag": str,
          "player_name": str,
          "clan_tag": str,
          "current_trophies": int,
          "best_trophies": int,
          "attacks_won": int,
          "attacks_lost": int,
          "defenses_won": int,
          "defenses_lost": int,
          "win_rate": float
        }
      ],
      "trophy_distribution": {
        "5000-5100": int,
        "5100-5200": int,
        "5200-5300": int,
        "5300-5400": int,
        "5400+": int
      }
    }
    """
```

#### 6. Legends - Daily Tracking

```python
@router.get("/v2/legends/daily-tracking")
async def get_legends_daily_tracking(
    rest: hikari.RESTApp,
    player_tag: str,
    start_date: str,
    end_date: str
) -> dict:
    """
    Get daily trophy progression for trending charts.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - player_tag: str - Player tag
    - start_date: str - Start date (YYYY-MM-DD)
    - end_date: str - End date (YYYY-MM-DD)

    Returns:
    {
      "player_tag": str,
      "player_name": str,
      "period": {
        "start": str,
        "end": str,
        "days": int
      },
      "daily_data": [
        {
          "date": str,
          "trophies": int,
          "attacks_won": int,
          "attacks_lost": int,
          "defenses_won": int,
          "defenses_lost": int,
          "trophy_change": int,  # from previous day
          "rank": int | None
        }
      ],
      "summary": {
        "starting_trophies": int,
        "ending_trophies": int,
        "net_change": int,
        "best_day": {"date": str, "trophies": int},
        "worst_day": {"date": str, "trophies": int},
        "average_daily_change": float
      }
    }
    """
```

### Low Priority Endpoints

#### 7. Activity - Retention Metrics

```python
@router.get("/v2/activity/retention-metrics")
async def get_retention_metrics(
    rest: hikari.RESTApp,
    guild_id: int,
    period: str = Query("monthly", regex="^(weekly|monthly)$")
) -> dict:
    """
    Get member retention analytics.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - guild_id: int - Discord server ID
    - period: str - "weekly" or "monthly" analysis

    Returns:
    {
      "period": str,
      "current": {
        "total_members": int,
        "retention_rate": float,
        "churn_rate": float,
        "growth_rate": float
      },
      "historical": [
        {
          "period": str,  # "2024-W01" or "2024-01"
          "members_start": int,
          "members_end": int,
          "joined": int,
          "left": int,
          "retention_rate": float,
          "churn_rate": float
        }
      ],
      "cohort_analysis": [
        {
          "join_period": str,
          "initial_size": int,
          "current_size": int,
          "retention_rate": float,
          "average_tenure_days": float
        }
      ]
    }
    """
```

#### 8. Players - Comparison

```python
@router.get("/v2/players/comparison")
async def compare_players(
    rest: hikari.RESTApp,
    player_tags: list[str] = Query(..., min_items=2, max_items=5)
) -> dict:
    """
    Side-by-side player comparison.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - player_tags: list[str] - 2-5 player tags to compare

    Returns:
    {
      "players": [
        {
          "tag": str,
          "name": str,
          "townhall": int,
          "trophies": int,
          "best_trophies": int,
          "war_stars": int,
          "donations": int,
          "donations_received": int,
          "attack_wins": int,
          "defense_wins": int,
          "clan": {
            "tag": str,
            "name": str,
            "role": str
          },
          "heroes": {
            "barbarian_king": int,
            "archer_queen": int,
            "grand_warden": int,
            "royal_champion": int
          },
          "season_stats": {
            "season": str,
            "loot_gold": int,
            "loot_elixir": int,
            "loot_dark_elixir": int,
            "capital_loot": int,
            "war_stars": int
          }
        }
      ],
      "comparison_metrics": {
        "highest_trophies": str,  # player tag
        "most_donations": str,
        "most_war_stars": str,
        "highest_heroes": str
      }
    }
    """
```

#### 9. Players - Progress Tracking

```python
@router.get("/v2/players/progress-tracking")
async def get_player_progress(
    rest: hikari.RESTApp,
    player_tag: str,
    metric: str = Query(..., regex="^(trophies|townhall|donations|war_stars|loot)$"),
    start_date: str,
    end_date: str
) -> dict:
    """
    Track player progression over time for specific metric.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - player_tag: str - Player tag
    - metric: str - Metric to track
    - start_date: str - Start date (YYYY-MM-DD)
    - end_date: str - End date (YYYY-MM-DD)

    Returns:
    {
      "player_tag": str,
      "player_name": str,
      "metric": str,
      "period": {
        "start": str,
        "end": str
      },
      "timeline": [
        {
          "timestamp": str,
          "value": int | float,
          "change": int | float,
          "event": str | None  # "TH upgrade", "Season reset", etc.
        }
      ],
      "summary": {
        "starting_value": int | float,
        "ending_value": int | float,
        "total_change": int | float,
        "average_daily_change": float,
        "milestones": [
          {"date": str, "description": str, "value": int | float}
        ]
      }
    }
    """
```

#### 10. Clan Games - Current Event

```python
@router.get("/v2/clan-games/{clan_tag}/current")
async def get_current_clan_games(
    rest: hikari.RESTApp,
    clan_tag: str
) -> dict:
    """
    Get current clan games progress.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - clan_tag: str - Clan tag

    Returns:
    {
      "event_id": str,
      "start_time": str,
      "end_time": str,
      "status": str,  # "ongoing", "ended", "none"
      "clan": {
        "tag": str,
        "name": str,
        "points": int,
        "tier_reached": int,
        "max_tier": int
      },
      "participants": [
        {
          "player_tag": str,
          "player_name": str,
          "points": int,
          "tasks_completed": int
        }
      ],
      "stats": {
        "total_participants": int,
        "total_points": int,
        "average_points": float,
        "participation_rate": float
      }
    }
    """
```

#### 11. Clan Games - History

```python
@router.get("/v2/clan-games/{clan_tag}/history")
async def get_clan_games_history(
    rest: hikari.RESTApp,
    clan_tag: str,
    limit: int = 10
) -> dict:
    """
    Get historical clan games results.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - clan_tag: str - Clan tag
    - limit: int - Number of past events to return (default: 10)

    Returns:
    {
      "items": [
        {
          "event_id": str,
          "start_time": str,
          "end_time": str,
          "points": int,
          "tier_reached": int,
          "participants": int,
          "top_contributors": [
            {"player_tag": str, "player_name": str, "points": int}
          ]
        }
      ],
      "total": int
    }
    """
```

#### 12. Clan Games - Leaderboard

```python
@router.get("/v2/clan-games/leaderboard")
async def get_clan_games_leaderboard(
    rest: hikari.RESTApp,
    clan_tag: str,
    event_id: str | None = None
) -> dict:
    """
    Get participant rankings for clan games.

    Parameters:
    - rest: hikari.RESTApp - Discord REST client
    - clan_tag: str - Clan tag
    - event_id: str | None - Specific event ID, None for current

    Returns:
    {
      "event_id": str,
      "event_status": str,
      "leaderboard": [
        {
          "rank": int,
          "player_tag": str,
          "player_name": str,
          "points": int,
          "tasks_completed": int,
          "percentage_of_max": float
        }
      ]
    }
    """
```

---

## Implementation Notes

### Common Patterns

1. **Authentication**: All endpoints require Discord bot authentication via hikari.RESTApp
2. **Pagination**: Use `limit` and `offset` for large datasets
3. **Date Formats**:
   - Dates: `YYYY-MM-DD`
   - Seasons: `YYYY-MM`
   - Datetimes: ISO 8601 format
4. **Error Responses**: Return standard HTTP error codes with descriptive messages

### Database Considerations

- Ensure indexes on:
  - `guild_id` for all guild-scoped queries
  - `player_tag` for player lookups
  - `timestamp`/`date` fields for time-range queries
- Consider materialized views for complex aggregations
- Use Redis/memory cache for frequently accessed data

### Testing Requirements

For each endpoint:
- Unit tests with mocked hikari.RESTApp
- Integration tests with test database
- Load testing for pagination
- Edge case testing (no data, invalid dates, etc.)

---

## Conclusion

**Recommended Implementation Order:**
1. Donations (immediate - all endpoints exist)
2. Capital Raids (high priority - 2 endpoints needed)
3. Activity Tracking (high priority - 3 endpoints needed)
4. Legends League (medium priority - 2 endpoints needed)
5. Player Performance (low priority - mostly exists)
6. Clan Games (future - significant infrastructure needed)

**Total New Endpoints Required:** 10
- High Priority: 3
- Medium Priority: 3
- Low Priority: 4

**Estimated Development Time:**
- Phase 1: 1-2 weeks
- Phase 2: 2-3 weeks
- Phase 3: 2 weeks
- Phase 4: 3+ weeks

Total: ~8-10 weeks for complete statistics suite
