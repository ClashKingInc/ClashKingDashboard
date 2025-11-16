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
