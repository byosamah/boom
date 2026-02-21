# BOOM Game Analytics Platform — Specification

## Context & Vision

BOOM is a Three.js top-down 3D shooter being repurposed for **educational and behavioral assessment**. The goal is to collect detailed player interaction data to understand decision-making patterns, engagement levels, and learning outcomes.

BOOM is the **first game** in a planned multi-game platform. The sign-in, tracking, and progress systems must be **game-agnostic** — reusable across future games.

### Audiences
- Students in schools/universities (teacher assigns game)
- Corporate training participants (HR/trainer assigns)
- Open public (anyone with a shared link)

### Core Principle
> **Zero-friction access**: Player clicks a link and plays. No sign-up forms. No passwords. Just a name prompt.

---

## 1. Player Identity System

### 1.1 Sign-In Flow (Name + Browser Fingerprint)

```
Player clicks shared link
    → Game loads
    → Modal appears: "What's your name?"
    → Player enters name (e.g. "Ahmed")
    → System generates browser fingerprint (invisible)
    → Unique player ID created: fingerprint hash
    → Player stored in localStorage + synced to server
    → Game starts
```

**Returning player detection:**
```
Game loads
    → Check localStorage for existing player
    → If found: "Welcome back, Ahmed!" (auto-resume)
    → If not found: Show name prompt
```

### 1.2 Browser Fingerprint (Lightweight)

Use a lightweight fingerprint combining:
- `navigator.userAgent`
- `screen.width` + `screen.height`
- `navigator.language`
- Canvas fingerprint (draw hidden text, hash the pixels)
- Timezone offset

**NOT** a tracking library — just enough to recognize the same browser. ~50 lines of code.

### 1.3 Player Data Model

```
player {
    id: string (fingerprint hash, e.g. "PLR_a7f3b2c1")
    name: string ("Ahmed")
    fingerprint: string (raw hash)
    created_at: datetime
    last_seen: datetime
    device_info: {
        user_agent: string
        screen: string ("1920x1080")
        platform: string ("MacIntel")
        touch: bool
    }
    games_played: int
    total_play_time_seconds: int
}
```

### 1.4 Future Extensions (NOT built now)
- Name + short code for cross-device resume
- Session codes from teachers (group players by class)
- Full sign-up with email/password
- OAuth (Google/Apple)

---

## 2. Behavioral Event Tracking System

### 2.1 Architecture: Configurable Event Bus

The game emits events through a central `EventTracker`. Each event type can be toggled on/off via a config object. This enables "maximum replay data" capability while letting you decide per-event what to collect.

```
Game Loop
    → Game events happen (kill, death, move, etc.)
    → EventTracker.track(eventName, data)
    → EventTracker checks: is this event type enabled?
    → If yes: push to in-memory buffer
    → Buffer flushes to localStorage every N seconds
    → Background sync pushes localStorage → server API
```

### 2.2 Event Categories & Types

#### Category: SESSION (always tracked)
| Event | Data | When |
|-------|------|------|
| `session_start` | game_version, device_info, timestamp | Game loads |
| `session_end` | duration, final_score, final_state | Game closes/navigates away |
| `session_pause` | timestamp, game_state | ESC pressed |
| `session_resume` | pause_duration | Resume from pause |

#### Category: GAMEPLAY (default: on)
| Event | Data | When |
|-------|------|------|
| `level_start` | level_id, weapon, health | Level begins |
| `level_complete` | level_id, duration, score, kills, damage_taken | Level cleared |
| `game_over` | level_id, duration, cause, score | Player dies |
| `weapon_switch` | from_weapon, to_weapon, context | Weapon changed |
| `enemy_kill` | enemy_type, weapon_used, distance, time_in_level | Enemy killed |
| `player_damage` | source, amount, health_remaining | Player takes damage |
| `pickup_collected` | pickup_type, health_before, health_after | Pickup grabbed |
| `barrel_exploded` | enemies_hit, player_hit, triggered_by | Barrel detonates |

#### Category: CINEMATIC (default: on)
| Event | Data | When |
|-------|------|------|
| `dialogue_advance` | node_id, time_on_node | Click to advance |
| `dialogue_choice` | node_id, choice_index, choice_text | Branching choice selected |
| `cinematic_skip` | cinematic_id, skipped_at_node | ESC to skip |

#### Category: ENGAGEMENT (default: on)
| Event | Data | When |
|-------|------|------|
| `idle_detected` | duration, game_state | No input for 10+ seconds |
| `tab_hidden` | timestamp | Browser tab hidden |
| `tab_visible` | hidden_duration | Browser tab visible again |
| `window_resize` | new_size | Window resized |

#### Category: POSITION (default: OFF — high volume)
| Event | Data | When |
|-------|------|------|
| `position_snapshot` | x, z, aim_angle, health, enemies_alive | Every 2 seconds during PLAYING |
| `movement_heatmap` | grid_cell, time_spent | Aggregated per grid cell |

### 2.3 Event Config (toggleable)

```javascript
// src/config.js — add to CONFIG object
TRACKING: {
    enabled: true,              // Master switch
    buffer_flush_interval: 5,   // Seconds between localStorage writes
    sync_interval: 30,          // Seconds between server syncs
    categories: {
        SESSION: true,          // Always on
        GAMEPLAY: true,         // Game events
        CINEMATIC: true,        // Dialogue tracking
        ENGAGEMENT: true,       // Attention tracking
        POSITION: false,        // High-volume, off by default
    }
}
```

### 2.4 Minimal Data Model: 2 Tables Only

> **Design principle** (inspired by MeemAin's Malee & Waqf Youth proposal):
> Collect raw events. Calculate everything else later with Python.
> One table for identity. One table for everything that happens.

#### Why 2 tables, not 3+?

| Old approach (3 tables) | New approach (2 tables) | Why simpler wins |
|-------------------------|------------------------|------------------|
| `player` + `game_event` + `player_progress` | `player` + `event` | Progress IS computable from events. `session_start` has device info. `level_complete` has score. No need to store it twice. |

**Progress = a query, not a table.**
```surql
-- "What level is Ahmed on?" = latest level_complete event
SELECT data.level FROM event
  WHERE player = $player AND event_type = 'level_complete'
  ORDER BY timestamp DESC LIMIT 1;
```

**KPIs = a Python script, not a schema.**
Like Malee's 24 KPIs computed from 41,170 raw actions — you compute KPIs in a batch script and optionally store results in a `report` table later.

#### Table 1: `player` (WHO is playing)

```
player {
    id: string              -- fingerprint hash (e.g. "PLRa7f3b2c1")
    name: string            -- "Ahmed"
    fingerprint: string     -- raw hash for dedup
    created_at: datetime
    last_seen: datetime
    meta: object FLEXIBLE   -- device_info, preferences, anything else
}
```

#### Table 2: `event` (EVERYTHING that happens)

```
event {
    id: string              -- timestamp-based (e.g. "EVT1708646400000")
    player: record<player>  -- FK to player
    session: string         -- groups events per play session
    game: string            -- "boom", "malee", "waqf" (multi-game)
    ver: string             -- game version "1.0.0"
    t: string               -- event type: "session_start", "enemy_kill", etc.
    cat: string             -- category: "SESSION", "GAMEPLAY", "DECISION"
    ts: datetime            -- when it happened
    seq: int                -- sequence number within session (for ordering)
    data: object FLEXIBLE   -- the payload (varies per event type)
}
```

**The `data` field carries EVERYTHING — it's different per event type:**

```javascript
// BOOM: enemy_kill
{ weapon: "shotgun", enemy_type: "rusher", distance: 4.2, level: 1 }

// BOOM: session_start
{ device: { ua: "...", screen: "1920x1080", touch: false }, level: 1 }

// BOOM: dialogue_choice
{ node_id: "choice_1", choice_index: 0, choice_text: "Let's go!", time_on_node: 3200 }

// Malee-style: purchase_decision
{ item: "book", cost: 50, is_need: true, purchase_order: 1, points_remaining: 200 }

// Waqf-style: waqf_decision
{ scenario_id: "S3", choice: "endowment_fund", amount: 5000, framing: "social_norm", time_ms: 8400 }

// BOOM: position_snapshot (high-volume, toggleable)
{ x: 12.5, z: -8.3, aim: 135.2, health: 80, enemies_alive: 5 }
```

The `seq` field (sequence number) ensures events stay in order even if timestamps collide — critical for replay and behavioral analysis.

### 2.5 Progress = Events, Not a Separate Table

Progress is reconstructed from events, stored only in localStorage for fast game resume:

```
localStorage: {
    "boom_progress": {
        current_level: 2,
        score: 4500,
        weapon: "shotgun",
        sound: true
    }
}
```

**On game start**: read localStorage. Instant resume. No server call needed.
**On server**: query events to reconstruct progress when needed (reports, cross-device).

### 2.6 How Future KPI Computation Works

```
Phase 1 (NOW):  Game → events → localStorage → server (2 tables)
Phase 2 (LATER): Python script reads events → computes KPIs → writes to `report` table

Example KPI script (like Malee's 24 KPIs):
┌─────────────────────────────────────────────────────┐
│  kpi_calculator.py                                   │
│                                                       │
│  1. Query: SELECT * FROM event WHERE game = 'boom'   │
│     AND session = $session ORDER BY seq               │
│                                                       │
│  2. Compute:                                          │
│     - Decision speed (avg time between decisions)     │
│     - Aggression index (rushes vs hides)              │
│     - Weapon preference distribution                  │
│     - Engagement score (active time / total time)     │
│     - Learning curve (deaths per level over sessions) │
│                                                       │
│  3. Store: CREATE report SET player=$p, game='boom',  │
│     kpis = { aggression: 0.72, engagement: 0.85 }    │
└─────────────────────────────────────────────────────┘
```

---

## 4. Technical Architecture

### 4.1 File Structure (New files in the game)

```
boom/
  src/
    ...existing 19 files...

    # NEW FILES (analytics layer — 3 files, not 4)
    PlayerManager.js       ← Identity (fingerprint + name + localStorage)
    EventTracker.js        ← Event bus + buffer + config + progress via events
    SyncManager.js         ← localStorage ↔ server sync (offline-first)
    # ProgressManager.js is NOT needed — progress lives in localStorage
    # and is reconstructable from events on the server

  # BACKEND (new directory alongside game)
  server/
    main.py               ← FastAPI app
    config.py             ← Settings
    database/
      connection.py       ← SurrealDB connection
      schema.surql        ← 2 tables only: player, event
    routes/
      players.py          ← POST /api/players (upsert by fingerprint)
      events.py           ← POST /api/events/batch (bulk event upload)
    core/
      players.py          ← Player lookup/create logic
      events.py           ← Event ingestion + validation
    # FUTURE: scripts/kpi_calculator.py — computes reports from events
```

### 4.2 Game Integration Points (Where code hooks in)

The analytics layer hooks into the existing game WITHOUT modifying core game logic. It observes — it doesn't control.

```
main.js
    → import PlayerManager
    → import EventTracker
    → import ProgressManager
    → Initialize before Game.init()
    → Pass references to Game

Game.js (minimal changes)
    → In _setupFSM() state enter/exit: emit state events
    → In _updatePlaying(): emit gameplay events
    → On level complete: save progress
    → On game over: save progress + end session

No changes needed to:
    Enemy.js, Player.js, Projectile.js, etc.
    (Game.js already has all the data — it just needs to emit events)
```

### 4.3 Offline-First Sync Strategy

```
┌──────────────────────────────────────────────────────┐
│                    BROWSER                            │
│                                                       │
│  Game Events → EventTracker → In-Memory Buffer        │
│                                    │                  │
│                              (every 5s)               │
│                                    ▼                  │
│                              localStorage             │
│                              ┌──────────┐            │
│                              │ events[] │            │
│                              │ progress │            │
│                              │ player   │            │
│                              └────┬─────┘            │
│                                   │                  │
│                             (every 30s)              │
│                             SyncManager              │
│                                   │                  │
│                         ┌─────────┴─────────┐       │
│                         │  Online?           │       │
│                         │  Yes → POST /api   │       │
│                         │  No  → Queue       │       │
│                         └───────────────────┘       │
└──────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────┐
│                    SERVER (Railway)                    │
│                                                       │
│  FastAPI                                              │
│  POST /api/players       → SurrealDB player          │
│  POST /api/events/batch  → SurrealDB event           │
│                                                       │
│  SurrealDB (Railway)                                  │
│  ├── namespace: games                                │
│  ├── database: analytics                             │
│  ├── tables: player, event (just 2!)                 │
│  └── future: report table (computed by Python)       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 4.4 Deployment (Railway)

```
Railway Project: "game-analytics"
├── Service 1: boom-game (nginx, static files)
│   └── Dockerfile: nginx serving boom/ files
│
├── Service 2: game-api (FastAPI)
│   └── Dockerfile: Python + FastAPI + uvicorn
│   └── Env: SURREALDB_URL, CORS_ORIGINS
│
├── Service 3: surrealdb
│   └── Image: surrealdb/surrealdb
│   └── Port: 8000
│   └── Volume: persistent storage
```

---

## 5. SurrealDB Schema (Minimal: 2 Tables)

```surql
-- Namespace: games, Database: analytics

-- ═══════════════════════════════════════════════════════
-- TABLE 1: player — WHO is playing
-- ═══════════════════════════════════════════════════════
DEFINE TABLE player SCHEMAFULL;
DEFINE FIELD name        ON player TYPE string;
DEFINE FIELD fingerprint ON player TYPE string;
DEFINE FIELD created_at  ON player TYPE datetime DEFAULT time::now();
DEFINE FIELD last_seen   ON player TYPE datetime DEFAULT time::now();
DEFINE FIELD meta        ON player TYPE option<object> FLEXIBLE;
-- meta holds: device_info, preferences, whatever else comes later

DEFINE INDEX fingerprint_idx ON player FIELDS fingerprint UNIQUE;

-- ═══════════════════════════════════════════════════════
-- TABLE 2: event — EVERYTHING that happens (universal log)
-- ═══════════════════════════════════════════════════════
DEFINE TABLE event SCHEMAFULL;
DEFINE FIELD player  ON event TYPE record<player>;
DEFINE FIELD session ON event TYPE string;              -- groups events per play session
DEFINE FIELD game    ON event TYPE string;              -- "boom", "malee", "waqf"
DEFINE FIELD ver     ON event TYPE string;              -- game version
DEFINE FIELD t       ON event TYPE string;              -- event type
DEFINE FIELD cat     ON event TYPE string;              -- category
DEFINE FIELD ts      ON event TYPE datetime;            -- when it happened
DEFINE FIELD seq     ON event TYPE int;                 -- sequence within session
DEFINE FIELD data    ON event TYPE option<object> FLEXIBLE;  -- THE payload (varies per event)

-- Indexes for common query patterns
DEFINE INDEX session_idx    ON event FIELDS session;          -- "all events in this session"
DEFINE INDEX player_idx     ON event FIELDS player;           -- "all events by this player"
DEFINE INDEX game_type_idx  ON event FIELDS game, t;          -- "all enemy_kills in boom"
DEFINE INDEX player_game_idx ON event FIELDS player, game;    -- "Ahmed's boom sessions"

-- ═══════════════════════════════════════════════════════
-- FUTURE (NOT NOW): computed results from Python scripts
-- ═══════════════════════════════════════════════════════
-- DEFINE TABLE report SCHEMAFULL;
-- DEFINE FIELD player  ON report TYPE record<player>;
-- DEFINE FIELD game    ON report TYPE string;
-- DEFINE FIELD session ON report TYPE option<string>;
-- DEFINE FIELD kpis    ON report TYPE option<object> FLEXIBLE;
-- DEFINE FIELD computed_at ON report TYPE datetime DEFAULT time::now();
```

### Why these indexes?

| Query pattern | Index used | Example |
|---------------|-----------|---------|
| Replay a session | `session_idx` | `SELECT * FROM event WHERE session = 'S123' ORDER BY seq` |
| Player's full history | `player_idx` | `SELECT * FROM event WHERE player = player:PLR123` |
| Game-specific analysis | `game_type_idx` | `SELECT * FROM event WHERE game = 'boom' AND t = 'enemy_kill'` |
| Player dashboard | `player_game_idx` | `SELECT * FROM event WHERE player = player:PLR123 AND game = 'boom'` |

### Idempotent batch sync (no duplicates)

Events use **client-generated IDs** based on session + sequence number:
```
event:boom_S1234_0042
      ^^^^^ ^^^^^ ^^^^
      game  session seq
```

If the same event is synced twice, SurrealDB's `CREATE ... CONTENT` with the same ID is a no-op. No duplicates possible.

---

## 6. Implementation Order (Incremental)

### Phase 1: Client-Side Foundation (No backend needed)
1. `PlayerManager.js` — fingerprint + name prompt + localStorage
2. `EventTracker.js` — event bus + config + buffer + localStorage + progress
3. Hook into `Game.js` — emit events at key moments
4. **Test**: Play game, check localStorage has events + player identity

### Phase 2: Backend API
5. FastAPI project setup (`server/`)
6. SurrealDB schema — 2 tables: `player`, `event`
7. API routes: players (upsert), events (batch)
8. **Test**: curl commands to verify API works

### Phase 3: Sync Layer
9. `SyncManager.js` — offline queue + background sync
10. Connect client → server
11. **Test**: Play offline, reconnect, verify data arrives

### Phase 4: Deployment
12. Dockerfile for game (nginx)
13. Dockerfile for API (FastAPI)
14. Railway deployment
15. **Test**: End-to-end on Railway

### Phase 5: KPI Computation (when you have data)
16. `scripts/kpi_calculator.py` — query events, compute metrics
17. `report` table — store computed KPIs per player per session
18. **Test**: Run calculator, verify report data

### Phase 6: Future (NOT NOW)
- Admin dashboard for teachers (reads `report` table)
- Session codes for grouping players
- Cross-device resume with short codes
- Data export (CSV/JSON)
- Graph edges: `player->played->session` for visualization

---

## 7. Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Database tables** | **2 only: `player` + `event`** | Progress is computable from events. KPIs computed later by Python. Inspired by Malee's approach. |
| Identity | Browser fingerprint + name | Zero friction. No sign-up. Works offline. |
| Storage | localStorage first, server sync | Offline-first. No data loss. |
| Event system | Configurable categories | Maximum flexibility. Toggle per-event later. |
| Event data | FLEXIBLE object field | Same table works for shooters, board games, assessments. |
| Backend | FastAPI + SurrealDB | Your known stack. FLEXIBLE fields perfect for this. |
| Game integration | Observer pattern (emit events) | Doesn't modify game logic. Easy to add/remove. |
| Multi-game | Game-agnostic schema | `game` field on every event. Same API for future games. |
| Sync | Batch POST every 30s | Minimal network overhead. Idempotent via client-generated IDs. |
| KPIs | Computed later, not stored live | Like Malee's 24 KPIs — raw data first, analysis second. |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser fingerprint changes (update, clear cache) | Player loses identity | Short-code fallback (Phase 5) |
| localStorage full (5MB limit) | Events lost | Flush to server more aggressively, compress old events |
| Game performance degraded by tracking | Bad player experience | Buffer events in memory, write async, never block game loop |
| CORS issues between game and API | Sync fails | Configure FastAPI CORS properly, same Railway project |
| SurrealDB connection issues | Data not saved | Offline queue handles this gracefully |

---

## 9. Threejs-master Skill Updates — DONE

Created: **`.claude/skills/threejs-master/references/game-analytics.md`**

Contains complete reusable patterns for any future game:
- PlayerManager.js — browser fingerprinting + name prompt (~80 lines)
- EventTracker.js — universal event bus + buffer + localStorage
- SyncManager.js — offline-first batch sync
- Progress via events (no separate table)
- Performance guidelines (never block the game loop)
- SurrealDB 2-table schema (player + event with FLEXIBLE data)
- KPI computation pattern (Python batch scripts)
- Checklist for adding analytics to a new game

Also updated SKILL.md reference table to include the new guide.
