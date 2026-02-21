// PlayerManager.js — Player identity via browser fingerprint + name prompt
// Stores player in localStorage for returning player detection

const STORAGE_KEY = 'game_player';

export default class PlayerManager {
  constructor() {
    this.player = null;
  }

  // Initialize player identity — returns player object
  // Shows name prompt for new players, auto-resumes for returning players
  async init() {
    // Check localStorage for existing player
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.player = JSON.parse(saved);
        this.player.last_seen = new Date().toISOString();
        this._save();
        console.log(`[PlayerManager] Welcome back, ${this.player.name}!`);
        return this.player;
      } catch (e) {
        // Corrupted data — start fresh
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // New player — generate fingerprint + show name prompt
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
    console.log(`[PlayerManager] New player: ${this.player.name} (${this.player.id})`);
    return this.player;
  }

  // Generate a SHA-256 fingerprint from browser signals
  async _generateFingerprint() {
    const signals = [
      navigator.userAgent,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      await this._canvasFingerprint()
    ].join('|');

    const buffer = new TextEncoder().encode(signals);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Draw hidden text on canvas and hash the result
  // Different GPUs/fonts render slightly differently = unique per device
  _canvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('fingerprint', 2, 15);
      return canvas.toDataURL().substring(0, 100);
    } catch (e) {
      return 'no-canvas';
    }
  }

  // Show a styled name prompt overlay (not window.prompt)
  _promptName() {
    return new Promise(resolve => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'player-name-overlay';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 200;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0, 0, 0, 0.9);
      `;

      // Create card
      overlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 16px; padding: 40px; text-align: center;
          max-width: 400px; width: 90%;
          box-shadow: 0 0 40px rgba(233, 69, 96, 0.15);
        ">
          <h2 style="
            color: #e94560; font-size: 28px; font-weight: 900;
            letter-spacing: 4px; margin-bottom: 8px;
          ">BOOM</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 24px;">
            What's your name, soldier?
          </p>
          <input id="player-name-input" type="text" placeholder="Enter your name"
            maxlength="30" autocomplete="off" style="
            width: 100%; padding: 12px 16px; font-size: 18px;
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px; color: #fff; outline: none;
            text-align: center; font-family: inherit;
          " />
          <button id="player-name-btn" style="
            display: block; width: 100%; margin-top: 16px;
            padding: 14px; font-size: 18px; font-weight: 700;
            background: linear-gradient(135deg, #e94560, #ff6b6b);
            color: #fff; border: none; border-radius: 8px;
            cursor: pointer; letter-spacing: 2px;
          ">DEPLOY</button>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = document.getElementById('player-name-input');
      const btn = document.getElementById('player-name-btn');

      // Focus the input
      setTimeout(() => input.focus(), 100);

      const submit = () => {
        const name = input.value.trim() || 'Soldier';
        overlay.remove();
        resolve(name);
      };

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    });
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.player));
  }
}
