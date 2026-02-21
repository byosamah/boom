import Game from './Game.js';
import PlayerManager from './PlayerManager.js';
import EventTracker from './EventTracker.js';
import SyncManager from './SyncManager.js';
import { TRACKING } from './config.js';

// Initialize analytics BEFORE the game
// PlayerManager shows name prompt → EventTracker starts buffering → Game loads
async function boot() {
  try {
    // Step 1: Identify the player (shows name prompt for new players)
    const playerMgr = new PlayerManager();
    const player = await playerMgr.init();

    // Step 2: Start event tracking
    const tracker = new EventTracker(player, TRACKING);

    // Step 3: Start sync manager (stub for now — Phase 2 adds server)
    const sync = new SyncManager(tracker, TRACKING);

    // Step 4: Create and initialize the game
    const game = new Game();
    game.tracker = tracker;  // Game.js reads this for event tracking
    window._game = game;
    window._tracker = tracker; // Debug access from console

    await game.init();
  } catch (err) {
    console.error('Failed to initialize game:', err);
    const el = document.getElementById('loading-text');
    if (el) el.textContent = 'Error loading game. Check console.';
  }
}

boot();
