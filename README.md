# BOOM

A top-down 3D shooter with cinematic storytelling, built entirely with Three.js and native ES modules. No build tools. No bundler. No npm. Just pure browser-powered action.

![BOOM Preview](assets/Preview.jpg)

## The Story

Jordan's eastern border is compromised. Hostiles are pouring through. You and Sgt. Reyes are the only ones standing between them and total collapse. No backup for six hours.

Two levels. Two arenas. One mission: **Hold the line.**

- **Level 1 — Urban Warfare**: Street fighting in a bombed-out intersection. Junkyard to the northwest, checkpoint northeast, warehouse southeast, ruins southwest.
- **Level 2 — Desert Storm**: Push east into open desert terrain for the final stand against tougher enemies, including hazmat units.

The game features fully voiced cinematic dialogues with branching choices that shape how Sgt. Reyes responds to you. Your choices don't change the gameplay — but they change the vibe.

## Features

- **Cinematic Story** — Intro and victory dialogue sequences with typewriter text, multiple-choice branching, and dynamic camera angles
- **Two Distinct Arenas** — Urban intersection (Level 1) and desert terrain (Level 2), each with unique lighting, fog, and cover layouts
- **6 Weapons** — Pistol, Shotgun, AK, SMG, Sniper (piercing rounds), and Rocket Launcher (explosive AoE)
- **360-Degree Mouse Aiming** — Aim independently of movement direction. Point and click to shoot.
- **Enemy AI with Roles** — Rushers charge head-on, Flankers approach from 90-degree offsets, Circlers orbit and close in when damaged
- **Hazmat Enemies** — Tougher, slower, always circlers. Appear in Level 2.
- **Destructible Barrels** — Exploding barrels deal AoE damage to enemies AND the player
- **Weapon Pickups** — Grab weapon drops scattered across the arena to upgrade your firepower
- **HUD & Minimap** — Live health bar, score with kill-streak multiplier, weapon display, and a minimap showing enemy positions
- **Music** — Original MP3 tracks for cinematics and combat (royalty-free, Pixabay)
- **Synthesized SFX** — All sound effects generated in real-time via Web Audio API oscillators and noise buffers. No audio files for SFX.
- **Object-Pooled Particles** — Pre-allocated VFX pool for blood splatter and explosions. No garbage collection spikes.
- **Stats Screen** — Final score, enemies eliminated, levels completed, and time tracked

## Controls

| Input | Action |
|-------|--------|
| **WASD** / **Arrow Keys** | Move |
| **Mouse** | Aim (360-degree, independent of movement) |
| **Left Click** | Shoot |
| **ESC** | Pause (gameplay) / Skip (cinematics) |
| **Click** | Advance dialogue / Select choice (cinematics) |

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- Python 3 (for local server) — or any static file server

### Run the Game

```bash
# Clone the repo
git clone https://github.com/byosamah/boom.git
cd boom

# Start a local server
python3 -m http.server 8080

# Open in your browser
open http://localhost:8080
```

That's it. No `npm install`. No `webpack`. No waiting 45 seconds for a build. Just serve and play.

> **Note**: The game must be served over HTTP (not opened as a local file) because ES modules require proper MIME types.

## Tech Stack

| Technology | Usage |
|-----------|-------|
| **Three.js r170** | 3D rendering, scene management, lighting, animation |
| **Native ES Modules** | Zero-config module system via browser `<script type="module">` and importmap |
| **Web Audio API** | Real-time synthesized sound effects (oscillators + noise buffers) |
| **HTML5 Audio** | MP3 music playback with JS-driven fade in/out |
| **Canvas 2D** | Minimap rendering |
| **GLTF** | All 3D models (characters, weapons, environment props) |

### Architecture

```
index.html              ← Entry point (importmap + single script tag)
styles.css              ← All CSS (HUD, overlays, dialogue, screens)
src/
  main.js               ← Bootstrap: new Game().init()
  Game.js               ← Orchestrator (~1151 lines). State machine, game loop, entity management.
  config.js             ← All constants: CONFIG, WEAPON_BONE_NAMES, ARENA_OBJECTS, DESERT_ARENA_OBJECTS, LEVEL_CONFIGS, DIALOGUE
  CinematicManager.js   ← Dialogue system with typewriter, branching choices, camera presets, level transitions
  Player.js             ← Player entity with 360° mouse-based aiming
  Enemy.js              ← AI with 3 behavioral roles (rusher/flanker/circler)
  WaveManager.js        ← Internal wave system (1 wave = 1 level)
  Projectile.js         ← Bullet physics (normal, piercing, explosive)
  ExplodingBarrel.js    ← Destructible props with AoE damage
  Pickup.js             ← Weapon/health drops with bobbing animation
  ParticlePool.js       ← Object-pooled particle VFX
  SoundManager.js       ← Web Audio synth SFX + MP3 music
  InputManager.js       ← Keyboard + mouse input with ground-plane raycasting
  UIManager.js          ← HUD, minimap, screens, floating damage text
  AnimController.js     ← Animation state machine wrapping THREE.AnimationMixer
  AssetLoader.js        ← GLTF model loading with SkeletonUtils cloning
  utils.js              ← Shared utilities (distXZ for 2D collision)
```

17 JS files. One class per file. Default exports for classes, named exports for constants/utilities.

### Game State Machine

```
LOADING → INTRO_CINEMATIC → PLAYING (Level 1) → LEVEL_TRANSITION → PLAYING (Level 2) → VICTORY_CINEMATIC → STATS
                                    ↓                                        ↓
                                GAME_OVER                                GAME_OVER
```

## Weapons

| Weapon | Fire Rate | Damage | Special |
|--------|-----------|--------|---------|
| Pistol | 0.3s | 15 | Starting weapon |
| Shotgun | 0.8s | 12 x5 | 5 pellets with spread |
| AK | 0.15s | 20 | High damage, low spread |
| SMG | 0.08s | 8 | Fastest fire rate |
| Sniper | 1.2s | 80 | Piercing — goes through enemies |
| Rocket Launcher | 1.5s | 60 | Explosive — 5-unit AoE blast radius |

## Enemy Types

| Type | Health | Speed | Damage | Behavior |
|------|--------|-------|--------|----------|
| **Basic** | 30 | 3.5 | 10 | 50% Rusher, 35% Flanker, 15% Circler |
| **Hazmat** | 120 | 2.2 | 25 | Always Circler. Appears in Level 2 only. |

### AI Roles

- **Rusher** — Direct charge at the player. Simple, fast, overwhelming in numbers.
- **Flanker** — Approaches at a 90-degree offset, mixing perpendicular movement. Switches to direct charge within 4 units.
- **Circler** — Orbits at ~7 units using radial + tangential force. Closes in when damaged. All hazmat enemies use this role.

## Assets

All 3D models are included in multiple formats (glTF, FBX, OBJ, Blend), but the game only loads **glTF**.

```
assets/
  Characters/glTF/   → Soldier, Enemy, Hazmat (shared skeleton for weapon attachment)
  Environment/glTF/  → ~55 props (barriers, containers, debris, structures, trees, etc.)
  Guns/glTF/         → 16 weapon models (embedded in skeletons + standalone for pickups)
  Texture/           → Fence.png (shared texture)
  music/             → cinematic.mp3, combat.mp3 (royalty-free from Pixabay)
```

Music credits: [Stereo_Color](https://pixabay.com/users/stereo_color/) and [DELOSound](https://pixabay.com/users/delosound/) on Pixabay.

## Level Design

### Level 1 — Urban Warfare
Cross-shaped intersection with four themed quadrants:
- **NW**: Junkyard (debris, broken cars, tires)
- **NE**: Checkpoint (barriers, metal fences, sandbags)
- **SE**: Warehouse (containers, crates, pallets)
- **SW**: Ruined lot (brick walls, sofas, trash)

### Level 2 — Desert Storm
Open desert terrain with different cover layout, warmer lighting (orange directional, sandy fog), and tougher enemies including hazmat units.

Each level is fully configured in `LEVEL_CONFIGS` — name, ground type, arena objects, background color, fog, hemisphere light, directional light, and fill light.

## Browser Compatibility

Works in all modern browsers that support:
- ES Modules + Import Maps
- WebGL 2
- Web Audio API

Tested in Chrome, Firefox, Edge, and Safari.

## License

Asset pack models by [Kenney](https://kenney.nl/) — CC0 (public domain).

---

Built with Three.js. No build tools were harmed in the making of this game.
