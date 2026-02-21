// SyncManager.js — Offline-first sync to server API
// Phase 1: STUB — just logs to console, no actual server calls
// Phase 2: Will POST to FastAPI endpoints on Railway

export default class SyncManager {
  constructor(tracker, config) {
    this.tracker = tracker;
    this.config = config;
    this.syncing = false;

    // Periodic sync check (Phase 2 will actually send data)
    this._syncInterval = setInterval(
      () => this.sync(),
      (config.sync_interval || 30) * 1000
    );

    console.log(`[SyncManager] Initialized (stub mode — no server yet)`);
  }

  // Phase 2: This will POST events to the FastAPI server
  async sync() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const eventCount = this.tracker.getEventCount();
      if (eventCount > 0) {
        console.log(`[SyncManager] ${eventCount} events queued (sync disabled — Phase 2)`);
      }
    } finally {
      this.syncing = false;
    }
  }

  destroy() {
    clearInterval(this._syncInterval);
  }
}
