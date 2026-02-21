// EventTracker.js — Universal event bus for game analytics
// Buffers events in memory, flushes to localStorage periodically
// Uses configurable categories to toggle tracking per event type

export default class EventTracker {
  // config = TRACKING object from config.js
  // player = player object from PlayerManager
  constructor(player, config) {
    this.player = player;
    this.config = config;
    this.buffer = [];
    this.seq = 0;
    this.session = this._newSession();
    this._sessionStart = Date.now();

    // Flush buffer to localStorage periodically
    this._flushInterval = setInterval(
      () => this.flush(),
      (config.buffer_flush_interval || 5) * 1000
    );

    // Track tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('tab_hidden', 'ENGAGEMENT', {});
        this.flush(); // Save immediately when tab hides
      } else {
        this.track('tab_visible', 'ENGAGEMENT', {
          hidden_duration_ms: Date.now() - this._lastHiddenAt
        });
      }
      this._lastHiddenAt = document.hidden ? Date.now() : this._lastHiddenAt;
    });
    this._lastHiddenAt = 0;

    // Save events when page closes
    window.addEventListener('beforeunload', () => {
      this.track('session_end', 'SESSION', {
        duration_ms: Date.now() - this._sessionStart,
        events_count: this.seq
      });
      this.flush();
    });

    // Track session start
    this.track('session_start', 'SESSION', {
      device: player.meta
    });

    console.log(`[EventTracker] Session ${this.session} started for ${player.name}`);
  }

  // Track an event — the main API
  // type: string like 'enemy_kill', 'level_complete'
  // category: string like 'GAMEPLAY', 'SESSION', 'CINEMATIC'
  // data: object with event-specific payload
  track(type, category, data) {
    // Check master switch
    if (!this.config.enabled) return;

    // Check if this category is enabled
    if (this.config.categories[category] === false) return;

    const event = {
      id: `${this.config.game}_${this.session}_${String(this.seq).padStart(6, '0')}`,
      player: this.player.id,
      session: this.session,
      game: this.config.game,
      ver: this.config.version,
      t: type,
      cat: category,
      ts: new Date().toISOString(),
      seq: this.seq++,
      data
    };

    this.buffer.push(event);
  }

  // Write buffered events to localStorage
  flush() {
    if (this.buffer.length === 0) return;

    const key = `events_${this.config.game}`;
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      existing = [];
    }

    const merged = existing.concat(this.buffer);

    // Keep max N events to stay within localStorage budget (~2MB)
    const max = this.config.max_local_events || 5000;
    const trimmed = merged.length > max ? merged.slice(-max) : merged;

    try {
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      // localStorage full — drop oldest half
      console.warn('[EventTracker] localStorage full, trimming old events');
      const half = trimmed.slice(Math.floor(trimmed.length / 2));
      localStorage.setItem(key, JSON.stringify(half));
    }

    this.buffer = [];
  }

  // Save game progress to localStorage (for fast resume, not a server table)
  saveProgress(progressData) {
    const key = `${this.config.game}_progress`;
    localStorage.setItem(key, JSON.stringify({
      ...progressData,
      updated_at: new Date().toISOString()
    }));
  }

  // Load game progress from localStorage
  loadProgress() {
    const key = `${this.config.game}_progress`;
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  // Generate a unique session ID
  _newSession() {
    return 'S' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  // Get count of events in localStorage (for debugging)
  getEventCount() {
    const key = `events_${this.config.game}`;
    try {
      const events = JSON.parse(localStorage.getItem(key) || '[]');
      return events.length;
    } catch (e) {
      return 0;
    }
  }

  // Clean up intervals
  destroy() {
    clearInterval(this._flushInterval);
    this.flush();
    console.log(`[EventTracker] Session ${this.session} ended. ${this.seq} events tracked.`);
  }
}
