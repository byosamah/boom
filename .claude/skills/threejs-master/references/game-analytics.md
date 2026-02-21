# Game Analytics for Three.js Games

How to add behavioral tracking, player identity, and progress saving to any Three.js game — without breaking the game loop or modifying core game logic.

> **Design philosophy**: Collect raw events. Compute everything else later.
> Inspired by MeemAin's Malee (24 KPIs from 41,170 raw actions) and behavioral assessment games.

---

## Architecture: Observer Pattern

The analytics layer **observes** the game — it never controls it. Three new ES modules sit alongside the game code:

```
src/
  Game.js              ← existing game (minimal changes)
  PlayerManager.js     ← WHO is playing (identity)
  EventTracker.js      ← WHAT happened (event log)
  SyncManager.js       ← WHEN to sync (offline-first)
```

```
Game Loop ──→ Game State Changes ──→ EventTracker.track()
                                           │
                                    In-Memory Buffer
                                           │
                                    (every 5s) flush to
                                           │
                                      localStorage
                                           │
                                    (every 30s) sync to
                                           │
                                      Server API
```

**Rule**: Never call `EventTracker.track()` inside hot loops (collision checks, per-frame updates). Only track at **state transitions** (kill, death, level complete, weapon switch).

---

## PlayerManager.js — Identity

Lightweight browser fingerprinting + name prompt. ~80 lines of code.

### Fingerprint Generation

```javascript
export default class PlayerManager {
    constructor() {
        this.player = null;
    }

    async init() {
        // Check localStorage first (returning player)
        const saved = localStorage.getItem('game_player');
        if (saved) {
            this.player = JSON.parse(saved);
            this.player.last_seen = new Date().toISOString();
            this._save();
            return this.player;
        }

        // New player — generate fingerprint + ask name
        const fingerprint = await this._generateFingerprint();
        const name = await this._promptName();

        this.player = {
            id: 'PLR' + fingerprint.substring(0, 12),
            name,
            fingerprint,
            created_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            meta: {
                ua: navigator.userAgent,
                screen: `${screen.width}x${screen.height}`,
                platform: navigator.platform,
                touch: 'ontouchstart' in window,
                lang: navigator.language,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
        this._save();
        return this.player;
    }

    async _generateFingerprint() {
        // Combine multiple signals into a hash
        const signals = [
            navigator.userAgent,
            `${screen.width}x${screen.height}x${screen.colorDepth}`,
            navigator.language,
            new Date().getTimezoneOffset().toString(),
            await this._canvasFingerprint()
        ].join('|');

        // SHA-256 hash via Web Crypto API
        const buffer = new TextEncoder().encode(signals);
        const hash = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async _canvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        return canvas.toDataURL().substring(0, 50);
    }

    _promptName() {
        // Replace with your game's UI modal
        return new Promise(resolve => {
            const name = prompt("What's your name?") || 'Player';
            resolve(name);
        });
    }

    _save() {
        localStorage.setItem('game_player', JSON.stringify(this.player));
    }
}
```

### Returning Player Detection

```javascript
// In main.js
const playerMgr = new PlayerManager();
const player = await playerMgr.init();

if (player.created_at !== player.last_seen) {
    // Show: "Welcome back, Ahmed!"
}
```

---

## EventTracker.js — Universal Event Log

One class that buffers events in memory, flushes to localStorage, and provides a clean API for the game to emit events.

### Core Pattern

```javascript
import { CONFIG } from './config.js';

export default class EventTracker {
    constructor(player, game, version) {
        this.player = player;
        this.game = game;
        this.version = version;
        this.session = this._newSession();
        this.buffer = [];
        this.seq = 0;

        // Periodic flush to localStorage
        this._flushInterval = setInterval(
            () => this.flush(),
            (CONFIG.TRACKING?.buffer_flush_interval || 5) * 1000
        );

        // Track tab visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.track('tab_hidden', 'ENGAGEMENT', {});
                this.flush(); // Save immediately when tab hides
            } else {
                this.track('tab_visible', 'ENGAGEMENT', {});
            }
        });

        // Save on page close
        window.addEventListener('beforeunload', () => {
            this.track('session_end', 'SESSION', {
                duration: Date.now() - this._sessionStart
            });
            this.flush();
        });

        // Track session start
        this._sessionStart = Date.now();
        this.track('session_start', 'SESSION', {
            device: player.meta
        });
    }

    track(type, category, data) {
        // Check if category is enabled
        const cats = CONFIG.TRACKING?.categories || {};
        if (cats[category] === false) return;
        if (CONFIG.TRACKING?.enabled === false) return;

        this.buffer.push({
            id: `${this.game}_${this.session}_${String(this.seq).padStart(6, '0')}`,
            player: this.player.id,
            session: this.session,
            game: this.game,
            ver: this.version,
            t: type,
            cat: category,
            ts: new Date().toISOString(),
            seq: this.seq++,
            data
        });
    }

    flush() {
        if (this.buffer.length === 0) return;

        // Append to localStorage queue
        const key = `events_${this.game}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const merged = existing.concat(this.buffer);

        // Keep max 5000 events in localStorage (~2MB)
        const trimmed = merged.slice(-5000);
        localStorage.setItem(key, JSON.stringify(trimmed));

        this.buffer = [];
    }

    _newSession() {
        return 'S' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    destroy() {
        clearInterval(this._flushInterval);
        this.flush();
    }
}
```

### Game Integration (Minimal Changes to Game.js)

Hook into **state transitions only** — NOT per-frame updates:

```javascript
// In Game.js constructor or init
this.tracker = tracker; // Passed from main.js

// In _setupFSM() — each state's enter/exit:
add('PLAYING', {
    enter: (game) => {
        game.tracker.track('level_start', 'GAMEPLAY', {
            level: game.currentLevel,
            weapon: game.player?.currentWeapon,
            health: game.player?.health
        });
    }
});

// In _updatePlaying() — on specific events, NOT every frame:
// Enemy killed:
tracker.track('enemy_kill', 'GAMEPLAY', {
    enemy_type: enemy.role,
    weapon: this.currentWeaponKey,
    distance: distXZ(this.player.mesh.position, enemy.mesh.position),
    level: this.currentLevel
});

// Player damaged:
tracker.track('player_damage', 'GAMEPLAY', {
    source: 'enemy',
    amount: damage,
    health_remaining: this.player.health
});

// Level complete:
tracker.track('level_complete', 'GAMEPLAY', {
    level: this.currentLevel,
    score: this.score,
    duration: levelTime,
    kills: levelKills,
    damage_taken: levelDamage
});
```

### Cinematic/Decision Tracking

For assessment games (like Waqf-style behavioral measurement):

```javascript
// Dialogue choice — captures decision-making patterns
tracker.track('dialogue_choice', 'DECISION', {
    node_id: currentNode.id,
    choice_index: selectedIndex,
    choice_text: selectedOption.text,
    time_on_node_ms: Date.now() - nodeShownAt,
    alternatives: currentNode.options.length
});
```

The `time_on_node_ms` field is critical for behavioral analysis — it reveals decision confidence (fast = certain, slow = conflicted).

---

## SyncManager.js — Offline-First Sync

```javascript
export default class SyncManager {
    constructor(apiUrl, game) {
        this.apiUrl = apiUrl;
        this.game = game;
        this.syncing = false;

        // Sync periodically
        this._syncInterval = setInterval(
            () => this.sync(),
            30000 // every 30 seconds
        );
    }

    async sync() {
        if (this.syncing || !navigator.onLine) return;
        this.syncing = true;

        try {
            // 1. Sync player
            const player = JSON.parse(localStorage.getItem('game_player'));
            if (player) {
                await fetch(`${this.apiUrl}/players`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(player)
                });
            }

            // 2. Sync events (batch)
            const key = `events_${this.game}`;
            const events = JSON.parse(localStorage.getItem(key) || '[]');
            if (events.length > 0) {
                const res = await fetch(`${this.apiUrl}/events/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                });

                if (res.ok) {
                    // Clear synced events
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            // Offline or server error — will retry next interval
            console.debug('[SyncManager] Sync failed, will retry:', e.message);
        } finally {
            this.syncing = false;
        }
    }

    destroy() {
        clearInterval(this._syncInterval);
    }
}
```

---

## Progress via Events (No Separate Table)

Progress is **derived from events**, stored only in localStorage for fast resume:

```javascript
// Save progress after key events (in Game.js)
function saveProgress(game) {
    localStorage.setItem(`${game.gameId}_progress`, JSON.stringify({
        current_level: game.currentLevel,
        score: game.score,
        weapon: game.currentWeaponKey,
        highest_level: Math.max(game.currentLevel, savedProgress?.highest_level || 0),
        total_kills: game.totalKills,
        sound: game.sound.enabled
    }));
}

// Load progress on game start (in main.js)
const progress = JSON.parse(localStorage.getItem('boom_progress'));
if (progress) {
    // Show "Continue from Level 2?" prompt
}
```

On the **server side**, progress is reconstructable:
```surql
-- Highest level completed by Ahmed
SELECT data.level FROM event
    WHERE player = player:PLR123 AND t = 'level_complete'
    ORDER BY ts DESC LIMIT 1;

-- Total kills across all sessions
SELECT count() FROM event
    WHERE player = player:PLR123 AND t = 'enemy_kill'
    GROUP ALL;
```

---

## Performance Guidelines

### DO:
- Track at **state transitions** (kill, death, level start/end)
- Buffer in memory, flush every 5 seconds
- Use `requestIdleCallback` for localStorage writes if available
- Generate event IDs on the client (no server round-trip needed)

### DON'T:
- Track inside `_loop()` or `requestAnimationFrame` callbacks
- Track per-frame position (unless explicitly enabled in config)
- Call `fetch()` synchronously during gameplay
- Block the game loop waiting for sync

### localStorage Budget:
- Each event ≈ 200-400 bytes
- 5,000 events ≈ 1-2 MB
- localStorage limit ≈ 5 MB
- Keep a buffer cap of 5,000 events, oldest dropped first

---

## Config Pattern

Add a **separate named export** (not nested inside CONFIG) to your game's `config.js`:

```javascript
// config.js — TRACKING is a separate export from the game's CONFIG
export const CONFIG = {
    // ... existing game config (weapons, enemies, arena, etc.) ...
};

export const TRACKING = {
    enabled: true,                // Master switch
    buffer_flush_interval: 5,     // Seconds between localStorage writes
    sync_interval: 30,            // Seconds between server syncs
    max_local_events: 5000,       // localStorage cap (~2MB)
    game: 'boom',                 // Game identifier (multi-game platform)
    version: '1.0.0',             // For tracking across versions
    categories: {
        SESSION: true,            // Game start/end, pause/resume
        GAMEPLAY: true,           // Kills, damage, pickups, level events
        CINEMATIC: true,          // Dialogue choices, cinematic skips
        DECISION: true,           // For assessment/behavioral games
        ENGAGEMENT: true,         // Tab visibility, idle detection
        POSITION: false,          // Player position every 2s (high volume)
    }
};
```

**Why separate?** The game's `CONFIG` uses `CONFIG.WEAPONS.Pistol.damage` etc. — mixing tracking config in there gets messy. A separate `TRACKING` export keeps things clean and is imported independently in `main.js`.

---

## Database: 2 Tables Only (SurrealDB)

```surql
-- player: WHO is playing
DEFINE TABLE player SCHEMAFULL;
DEFINE FIELD name        ON player TYPE string;
DEFINE FIELD fingerprint ON player TYPE string;
DEFINE FIELD created_at  ON player TYPE datetime DEFAULT time::now();
DEFINE FIELD last_seen   ON player TYPE datetime DEFAULT time::now();
DEFINE FIELD meta        ON player TYPE option<object> FLEXIBLE;
DEFINE INDEX fingerprint_idx ON player FIELDS fingerprint UNIQUE;

-- event: EVERYTHING that happens (universal log)
DEFINE TABLE event SCHEMAFULL;
DEFINE FIELD player  ON event TYPE record<player>;
DEFINE FIELD session ON event TYPE string;
DEFINE FIELD game    ON event TYPE string;
DEFINE FIELD ver     ON event TYPE string;
DEFINE FIELD t       ON event TYPE string;
DEFINE FIELD cat     ON event TYPE string;
DEFINE FIELD ts      ON event TYPE datetime;
DEFINE FIELD seq     ON event TYPE int;
DEFINE FIELD data    ON event TYPE option<object> FLEXIBLE;
DEFINE INDEX session_idx     ON event FIELDS session;
DEFINE INDEX player_idx      ON event FIELDS player;
DEFINE INDEX game_type_idx   ON event FIELDS game, t;
DEFINE INDEX player_game_idx ON event FIELDS player, game;
```

The FLEXIBLE `data` field makes one table work for ANY game:
- Shooter: `{ weapon, enemy_type, distance }`
- Board game: `{ item, cost, is_need, purchase_order }`
- Assessment: `{ scenario_id, choice, framing, time_ms }`

---

## KPI Computation (Later, with Python)

```python
# scripts/kpi_calculator.py — runs as batch job
async def compute_session_kpis(db, session_id):
    events = await db.query("""
        SELECT * FROM event WHERE session = $session ORDER BY seq
    """, {"session": session_id})

    kills = [e for e in events if e['t'] == 'enemy_kill']
    deaths = [e for e in events if e['t'] == 'game_over']
    decisions = [e for e in events if e['cat'] == 'DECISION']

    return {
        "aggression_index": len(kills) / max(len(deaths), 1),
        "avg_decision_time_ms": mean([d['data']['time_ms'] for d in decisions]),
        "weapon_diversity": len(set(k['data']['weapon'] for k in kills)),
        "engagement_score": compute_engagement(events),
    }
```

---

## Data Diagnostic Page (check-data.html)

Every game should include a `check-data.html` page for inspecting analytics data during development. This page MUST be served from the same origin as the game (localStorage is per-origin).

Place it in the game root alongside `index.html`:

```html
<!DOCTYPE html>
<html><head><title>Analytics Data Check</title></head>
<body style="background:#1a1a2e;color:#fff;font-family:monospace;padding:20px;line-height:1.6">
<h2 style="color:#e94560">Analytics Data Check</h2>
<pre id="output">Loading...</pre>
<script>
const GAME = 'boom'; // Change per game
const out = document.getElementById('output');
let text = '';

// Player identity
const player = localStorage.getItem('game_player');
text += '=== PLAYER IDENTITY ===\n';
text += player ? JSON.stringify(JSON.parse(player), null, 2) : '(none)';

// Events
const events = localStorage.getItem('events_' + GAME);
text += '\n\n=== EVENTS ===\n';
if (events) {
  const arr = JSON.parse(events);
  text += 'Total: ' + arr.length + ' events\n';
  text += 'Session: ' + (arr[0]?.session || '?') + '\n\n';
  arr.forEach(e => {
    text += `  [${String(e.seq).padStart(3,'0')}] ${e.t.padEnd(20)} ${e.cat.padEnd(12)} ${JSON.stringify(e.data)}\n`;
  });
} else { text += '(none)'; }

// Progress
const progress = localStorage.getItem(GAME + '_progress');
text += '\n\n=== PROGRESS ===\n';
text += progress ? JSON.stringify(JSON.parse(progress), null, 2) : '(none)';

out.textContent = text;
</script>
</body></html>
```

**Usage**: Open `http://localhost:8080/check-data.html` after playing the game.

**Why not just use DevTools?** You can — but this page is:
- Formatted and readable at a glance
- Shareable with non-technical teammates (teachers, designers)
- Bookmarkable for quick access during playtesting
- Shows event sequence in chronological order

**Important**: Add `check-data.html` to `.gitignore` or remove before production deploy.

---

## Wiring Tracker to Subsystems

When your game has subsystems (CinematicManager, DialogueSystem, etc.), the tracker reference needs to be passed from the main Game class:

```javascript
// In Game.init() — wire tracker to subsystems BEFORE FSM starts
if (this.tracker) {
  this.cinematic.tracker = this.tracker;
  this.dialogue.tracker = this.tracker;  // if you have one
}
this._setupFSM();
```

In the subsystem, declare the property and use optional chaining:

```javascript
// In CinematicManager constructor
this.tracker = null;  // Set by Game.js

// In the event handler
this.tracker?.track('dialogue_choice', 'CINEMATIC', { ... });
```

**Rule**: Always use `?.` (optional chaining) so the subsystem works fine without analytics.

---

## Decision Timing Pattern

For behavioral assessment games, measuring HOW LONG a player takes to decide is critical (fast = confident, slow = conflicted). Use the timestamp-capture pattern:

```javascript
// When choices are shown to the player
this._choiceShownAt = Date.now();

// When player selects a choice
this.tracker?.track('dialogue_choice', 'CINEMATIC', {
  choice_text: chosen.text,
  time_ms: Date.now() - this._choiceShownAt,  // Decision time!
  alternatives: node.options.length
});
```

This `time_ms` field is one of the most valuable behavioral signals — it reveals:
- Decision confidence (fast decisions = high confidence)
- Cognitive load (slow decisions = weighing options)
- Engagement (very fast = not reading, very slow = disengaged or overthinking)

---

## Name Prompt UI Pattern

Never use `window.prompt()` for player identity — it's ugly, blocks the thread, and breaks on mobile. Instead, create a styled HTML overlay:

```javascript
_promptName() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 200;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.9);
    `;
    overlay.innerHTML = `
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; width: 90%;">
        <h2 style="color: #e94560; font-size: 28px; margin-bottom: 24px;">GAME TITLE</h2>
        <input id="name-input" type="text" placeholder="Your name"
          style="width:100%; padding:12px; font-size:18px; background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; text-align:center;" />
        <button id="name-btn" style="display:block; width:100%; margin-top:16px; padding:14px;
          font-size:18px; font-weight:700; background:linear-gradient(135deg,#e94560,#ff6b6b);
          color:#fff; border:none; border-radius:8px; cursor:pointer;">PLAY</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('name-input');
    const btn = document.getElementById('name-btn');
    setTimeout(() => input.focus(), 100);

    const submit = () => { overlay.remove(); resolve(input.value.trim() || 'Player'); };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
}
```

**Tips**:
- Match your game's visual style (colors, fonts, dark/light theme)
- Auto-focus the input field after a small delay
- Handle Enter key submission
- Provide a sensible default name ("Player", "Soldier", etc.)
- Remove the overlay from DOM after submission (no leftover elements)

---

## Boot Sequence Pattern

The analytics layer MUST initialize BEFORE the game so events are captured from the very start:

```javascript
// main.js — correct boot sequence
async function boot() {
  // 1. Identity first (may show name prompt)
  const playerMgr = new PlayerManager();
  const player = await playerMgr.init();

  // 2. Event tracking (starts session_start event)
  const tracker = new EventTracker(player, TRACKING);

  // 3. Sync manager (background — stub until server exists)
  const sync = new SyncManager(tracker, TRACKING);

  // 4. Game LAST (receives tracker reference)
  const game = new Game();
  game.tracker = tracker;
  window._game = game;
  window._tracker = tracker;  // Debug access from console
  await game.init();
}
boot();
```

**Why this order matters**:
- `PlayerManager.init()` is `async` — it awaits the name prompt
- `EventTracker` constructor fires `session_start` immediately
- `game.tracker` must be set BEFORE `game.init()` calls `_setupFSM()`
- `window._tracker` lets you inspect from the browser console: `_tracker.getEventCount()`

---

## Optional Chaining Safety Pattern

Every `tracker.track()` call in the game MUST use optional chaining (`?.`). This ensures:
- The game works perfectly without analytics (tracker is null)
- Analytics can be disabled by simply not setting `game.tracker`
- No error if tracker is removed for a production build

```javascript
// CORRECT — game works with or without tracker
this.tracker?.track('enemy_kill', 'GAMEPLAY', { ... });
this.tracker?.saveProgress({ ... });

// WRONG — crashes if tracker is null
this.tracker.track('enemy_kill', 'GAMEPLAY', { ... });
```

---

## Checklist: Adding Analytics to a New Game

- [ ] Copy `PlayerManager.js`, `EventTracker.js`, `SyncManager.js` to `src/`
- [ ] Add `TRACKING` config as named export in `config.js`
- [ ] Update `main.js` with async boot sequence (PlayerManager → EventTracker → SyncManager → Game)
- [ ] Set `game.tracker = tracker` before `game.init()`
- [ ] Wire tracker to subsystems in `init()`: `this.cinematic.tracker = this.tracker`
- [ ] Add `tracker?.track()` calls at FSM state enter/exit hooks
- [ ] Add `tracker?.track()` at combat events (kills, damage, pickups)
- [ ] Add `tracker?.track()` at dialogue choices with `time_ms` measurement
- [ ] Add `tracker?.saveProgress()` at level complete and game over
- [ ] Add `check-data.html` to game root for development inspection
- [ ] Test: play game, open `check-data.html`, verify events + player identity
- [ ] Test: refresh page, verify returning player detection works
- [ ] Test: set `TRACKING.enabled = false`, verify no events are tracked
- [ ] Connect `SyncManager` to your API URL (Phase 2)
- [ ] Define game-specific event types in a comment block at top of main game file
