# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BOOM is a top-down 3D level-based shooter with cinematic story using Three.js r170 via native ES modules from CDN. No build tools, no bundler, no npm. Modular file structure with one class per file. Features 2 levels (urban + desert), intro/victory cinematics with branching dialogue, 360-degree mouse aiming, and file-based music.

## Running the Game

```bash
# Serve from project root (assets use relative paths)
cd /Users/osamakhalil/dev/boom
python3 -m http.server 8080

# Then open http://localhost:8080
```

There are no tests, no linter, no build step. To validate JS syntax after edits:
```bash
for f in src/*.js; do node --check "$f" && echo "OK: $f" || echo "FAIL: $f"; done
```

## Project Structure

```
boom/
  index.html            ← thin shell (~55 lines: HTML + importmap + script tag)
  styles.css            ← all CSS
  src/
    main.js             ← bootstrap (new Game().init(), window._game debug)
    config.js           ← CONFIG, WEAPON_BONE_NAMES, ARENA_OBJECTS, DESERT_ARENA_OBJECTS, LEVEL_CONFIGS, DIALOGUE (named exports)
    utils.js            ← distXZ() (named export)
    SoundManager.js     ← Web Audio synth SFX + MP3 music playback (default export)
    AssetLoader.js      ← GLTF loading + SkeletonUtils (default export)
    InputManager.js     ← keyboard + mouse click-to-shoot + ground-plane aim raycasting (default export)
    AnimController.js   ← animation state machine (default export)
    CinematicManager.js ← intro/victory dialogues, camera presets, level transitions (default export)
    ParticlePool.js     ← object-pooled VFX (default export)
    Player.js           ← player entity, mouse-based 360° aiming (default export)
    Enemy.js            ← enemy AI (default export)
    Projectile.js       ← bullet entities + module-private _projGeo (default export)
    ExplodingBarrel.js  ← destructible barrels (default export)
    Pickup.js           ← health/weapon drops (default export)
    WaveManager.js      ← wave progression + module-private SPAWN_FORMATIONS (default export)
    UIManager.js        ← HUD, screens, minimap (default export)
    GameStateMachine.js ← generic FSM engine with enter/update/exit lifecycle (default export)
    Game.js             ← orchestrator, uses FSM, imports everything (~1310 lines) (default export)
    TouchController.js  ← mobile virtual joystick + fire button (default export, lazy-loaded)
  assets/
    Characters/glTF/    ← character models
    Environment/glTF/   ← prop models
    Guns/glTF/          ← weapon models
    Texture/            ← shared textures
    music/              ← cinematic.mp3, combat.mp3
```

19 JS files. One class per file. Default exports for classes, named exports for constants/utils.

### Module Dependency DAG (no circular deps)

```
config.js, utils.js                          ← leaf modules (no imports)
SoundManager.js                              ← leaf (no imports)
AssetLoader.js                               ← three/addons (GLTFLoader, SkeletonUtils)
InputManager.js, AnimController.js           ← three
CinematicManager.js                          ← three, AnimController, config (DIALOGUE, WEAPON_BONE_NAMES)
ParticlePool.js                              ← three, config
Player.js                                    ← AnimController, config
Enemy.js                                     ← three, AnimController, config
Projectile.js                                ← three, config
ExplodingBarrel.js                           ← three, config, utils
Pickup.js                                    ← three, config
WaveManager.js                               ← three, config
UIManager.js                                 ← config
GameStateMachine.js                          ← leaf (no imports)
TouchController.js                           ← leaf (no imports, lazy-loaded)
Game.js                                      ← everything above (incl. GameStateMachine)
main.js                                      ← Game
```

### Import Conventions

- `import * as THREE from 'three'` — files using THREE keep existing `THREE.Foo` refs
- All imports use `.js` extension (mandatory for native ES modules)
- importmap lives in `index.html` (browser requirement)
- Asset paths are relative to HTML root, not to `src/`

## Class Hierarchy

| Class | File | Purpose |
|-------|------|---------|
| `Game` | `src/Game.js` | Main orchestrator. Owns scene, camera, renderer, game loop (`_loop()`), all entity arrays. State machine: LOADING→INTRO_CINEMATIC→PLAYING→LEVEL_TRANSITION→PLAYING→VICTORY_CINEMATIC→STATS. Also PAUSED (from PLAYING) and GAME_OVER. |
| `CinematicManager` | `src/CinematicManager.js` | Intro/victory dialogues with typewriter text, branching choices, camera presets (wide/closeS1/closeS2/overS1). Handles level transition fade-out/fade-in. |
| `Player` | `src/Player.js` | Player character. Uses `AnimController`, manages weapon visibility via `WEAPON_BONE_NAMES`. `setAimTarget()` receives mouse world-point each frame for 360° aiming decoupled from movement. |
| `Enemy` | `src/Enemy.js` | Enemy instances. Role-based AI (`rusher`/`flanker`/`circler`). Speed variance per instance. `dying` state plays death anim before removal. |
| `WaveManager` | `src/WaveManager.js` | Internal wave system. 1 wave per level (wave 1 = Level 1, wave 2 = Level 2). Formation cycling (SURROUND/PINCER/SWARM/LANE). WAVE_CLEAR triggers level completion. |
| `Projectile` | `src/Projectile.js` | Bullet entities. Supports piercing (sniper), explosive (rocket), and normal projectiles. |
| `ExplodingBarrel` | `src/ExplodingBarrel.js` | Destructible props. AoE damage on hit, damages both enemies and player. |
| `Pickup` | `src/Pickup.js` | Health/weapon drops. Bobbing animation, glow ring, spawned at level start. |
| `ParticlePool` | `src/ParticlePool.js` | Object-pooled VFX. Pre-allocated mesh pool, gravity-affected particles with fade. |
| `AnimController` | `src/AnimController.js` | Animation state. Wraps `THREE.AnimationMixer` with crossfade and play-once support. |
| `AssetLoader` | `src/AssetLoader.js` | GLTF loading. `cloneCharacter()` uses `SkeletonUtils.clone()` (clones materials per instance). `cloneStatic()` for props. |
| `SoundManager` | `src/SoundManager.js` | Web Audio synth for SFX (oscillators + noise buffers). HTML5 Audio for MP3 music with JS fade in/out. Two tracks: cinematic (dialogue) and combat (gameplay). |
| `InputManager` | `src/InputManager.js` | Keyboard + mouse. `getAimPoint(camera)` raycasts mouse onto ground plane for 360° aim. `mouseDown` fires weapons. WASD/arrows to move. |
| `GameStateMachine` | `src/GameStateMachine.js` | Generic FSM engine. `add(name, state)` registers states, `change(name, game)` transitions (calls exit/enter), `update(game, dt)` ticks current state. Used by Game for all state management. |
| `TouchController` | `src/TouchController.js` | Mobile virtual joystick + fire button. Lazy-loaded only on touch devices. Left joystick for movement, right button for auto-aim fire. |
| `UIManager` | `src/UIManager.js` | HUD + screens. Score, health bar, level banner, minimap (canvas 2D), floating damage text, damage flash. |

## Game Flow / State Machine

```
LOADING → INTRO_CINEMATIC → PLAYING (Level 1) → LEVEL_TRANSITION → PLAYING (Level 2) → VICTORY_CINEMATIC → STATS
                                    ↓                                        ↓
                                GAME_OVER                                GAME_OVER
```

- **LOADING**: Assets load, then auto-transitions to INTRO_CINEMATIC
- **INTRO_CINEMATIC**: Dialogue sequence (Sgt. Reyes briefing). Click advances text, choices branch. ESC skips.
- **PLAYING**: Active gameplay. PAUSED accessible via ESC.
- **LEVEL_TRANSITION**: Fade-out → swap arena (urban→desert) → fade-in → resume PLAYING
- **VICTORY_CINEMATIC**: Post-Level-2 dialogue sequence
- **STATS**: Final score screen
- **GAME_OVER**: Death screen. Restart → INTRO_CINEMATIC
- **PAUSED**: Accessible from PLAYING via ESC. Resume returns to PLAYING.

## Controls

- **WASD / Arrow keys** — Move
- **Mouse** — Aim (360-degree, decoupled from movement direction)
- **Left click** — Shoot
- **ESC** — Pause (during gameplay) / Skip (during cinematics)
- **Click** — Advance dialogue / select choice (during cinematics)

## Cinematic System

`CinematicManager` drives intro and victory dialogue sequences.

- **Dialogue data** in `DIALOGUE` export from `config.js`
- **Node types**: `line` (speaker text + camera), `choice` (branching options), `goto` (jump to node by ID), `end`
- **Camera presets**: `wide`, `closeS1`, `closeS2`, `overS1` — defined in `CAMERA_PRESETS` at top of CinematicManager.js
- **Typewriter effect**: Characters revealed at 40ms intervals, click-to-skip completes instantly
- **Level transition**: `fadeOut()` → `midCallback` (swap arena/lighting) → `fadeIn()` → `doneCallback`

## Music System

Two MP3 tracks in `assets/music/`:
- `cinematic.mp3` — plays during dialogue sequences (volume 0.35)
- `combat.mp3` — plays during gameplay (volume 0.3)

HTML5 Audio (`new Audio()`) with JS-driven fade in/out via `setInterval`.

| Event | Music action |
|-------|-------------|
| Intro/victory cinematic starts | `playDialogueMusic()` — fade in cinematic.mp3 |
| Gameplay starts | `playGameplayMusic()` — fade in combat.mp3 |
| Pause | `_musicAudio.pause()` |
| Resume | `_musicAudio.play()` |
| Level transition / state change | `stopMusic()` — fade out current track |

Music is royalty-free from Pixabay (Stereo_Color, DELOSound).

## Critical Patterns

- **Collision uses `distXZ()`** (`src/utils.js`) — 2D distance on XZ plane, ignoring Y. All collision is top-down circle-circle.
- **`coverColliders[]`** — Array of `{position, radius}` for player/enemy vs environment collision. Both `structure` and `cover` arena objects create entries; `decor` does not.
- **Per-object collider radii** — Each arena object in `ARENA_OBJECTS` has a `collider` property (0.5–3.0) instead of a flat radius.
- **Characters share skeleton** — Soldier/Enemy/Hazmat models all have the same bone names. Weapons are hidden/shown via bone name matching (`WEAPON_BONE_NAMES`).
- **Materials cloned per enemy** — `cloneCharacter()` clones materials to prevent hit-flash bleeding across instances.
- **Mouse aiming decoupled from movement** — `Player.setAimTarget()` called each frame with world point from `InputManager.getAimPoint()`. Player faces mouse cursor independently of WASD movement direction.
- **One internal wave per level** — WaveManager still runs but only 1 wave fires per level. WAVE_CLEAR (all enemies dead + no pending spawns) = level complete.

## Arena Layout

Two arena configurations in `src/config.js`:
- **`ARENA_OBJECTS`** — Urban (Level 1): cross-shaped intersection with 4 themed quadrants (NW=junkyard, NE=checkpoint, SE=warehouse, SW=ruined lot)
- **`DESERT_ARENA_OBJECTS`** — Desert (Level 2): open desert terrain with different cover layout

`LEVEL_CONFIGS` maps level number → name, ground type, arena objects, lighting, fog, hemisphere/directional/fill light settings, and wave number.

Both use 4 categories: `structure` (lane-defining, large colliders), `cover` (barriers/fences, medium colliders), `barrels` (explosive, stored separately in `this.barrels[]`), `decor` (visual only, no collision).

## Enemy AI Roles

- **Rusher (50% basic)**: Direct charge at player
- **Flanker (35% basic)**: 90-degree offset approach via perpendicular vector mixing, switches to direct at <4 units
- **Circler (15% basic + all hazmat)**: Orbits at ~7 units using radial+tangent force, closes in when damaged

## CONFIG Object

All tunable game constants live in `CONFIG` in `src/config.js`. Weapon stats, enemy types, wave scaling, arena dimensions, camera, scoring — all centralized there.

Additional named exports from `config.js`:
- `WEAPON_BONE_NAMES` — skeleton bone names for weapon visibility
- `ARENA_OBJECTS` — urban arena layout (Level 1)
- `DESERT_ARENA_OBJECTS` — desert arena layout (Level 2)
- `LEVEL_CONFIGS` — per-level lighting, fog, ground type, arena objects, wave number
- `DIALOGUE` — intro/victory cinematic dialogue trees

Enemy scaling: `WAVE_BASE_ENEMIES=15`, `HAZMAT_START_WAVE=2`. Level 1 = 15 enemies (basic only, wave 1). Level 2 = 20 enemies (basic + hazmat, wave 2).

## Asset Structure

```
assets/
  Characters/glTF/   → Character_Soldier.gltf, Character_Enemy.gltf, Character_Hazmat.gltf
  Environment/glTF/  → ~55 prop models (barriers, containers, debris, trees, etc.)
  Guns/glTF/         → 16 weapon models (embedded in character skeletons AND as pickup models)
  Texture/           → Fence.png (shared texture)
  music/             → cinematic.mp3, combat.mp3
```

Assets are available in glTF, FBX, OBJ, and Blend formats. The game only loads **glTF**. The manifest in `Game.init()` (`src/Game.js`) maps short keys (e.g. `'barrel'`) to file paths. To add a new asset: add it to the manifest object, then reference it via `assets.cloneStatic(key)` or add to `ARENA_OBJECTS`/`DESERT_ARENA_OBJECTS` in `src/config.js`.

## Key Gotchas

- **Native ES modules** — All `src/*.js` files use native browser ES modules. No bundler. The importmap in `index.html` maps `'three'` and `'three/addons/'` to CDN URLs.
- **No hot reload** — Manual browser refresh after edits. The Python server has no watch mode.
- **SkeletonUtils required** — Animated character cloning MUST use `SkeletonUtils.clone()`, not `scene.clone()`. Regular clone breaks skinned meshes.
- **Barrel collision coupling** — `_updateCollisions()` in `Game.js` checks if a cover collider's position matches a barrel's position to skip dead barrels. Adding barrels outside `ARENA_OBJECTS.barrels` will bypass this.
- **Game loop timing** — Uses `clock.getDelta()` capped at 0.05s (50ms). Slow-mo multiplies dt by `timeScale`. Background tabs cap at 0.5s to prevent physics explosions.
- **Asset paths** — Relative to `index.html` (project root), NOT to `src/`. The `src/` modules reference `'assets/...'` paths which resolve from the HTML root.
- **Module-private state** — `_projGeo` in `Projectile.js` and `SPAWN_FORMATIONS` in `WaveManager.js` are module-scoped (not exported), keeping them private by design.
- **Music autoplay** — Browsers block autoplay until user gesture. `sound.resume()` called on first click to unlock AudioContext. MP3 playback also requires prior interaction.
- **Mouse click fires weapons** — `mouseDown` checked every frame in PLAYING state. Cinematic click handler guards on state so no conflict with shooting.
- **Level transition resets WaveManager** — Wave is set to 1 before Level 2 break starts, so WaveManager increments to wave 2 (more enemies + hazmats via `HAZMAT_START_WAVE=2`).
- **FSM drives game loop** — `Game._loop()` delegates to `this.fsm.update(this, dt)`. State logic lives in `_setupFSM()`. To add a state: register in `_setupFSM()` with `enter/update/exit`.
- **InstancedMesh for decor** — Repeated decor props (>2 placements) use `InstancedMesh` via `_placeInstanced()`. Only non-interactive decor is instanced; barrels/cover stay individual for per-object interaction.
- **Mobile conditional quality** — `this.isMobile` detected in constructor. Shadows 512 vs 2048, ground 1024 vs 2048, DPR 1.5 vs 2. `TouchController` lazy-loaded via dynamic `import()`.
- **Enemy disposal** — `dispose()` clears flash timeout, disposes geometry + materials (handles arrays), nulls mesh to prevent post-dispose access.
