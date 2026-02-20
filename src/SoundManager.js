export default class SoundManager {
  constructor() {
    this.ctx = null;
    this._musicAudio = null;
    this._musicPlaying = false;
    this._musicVolume = 0;
    this._fadeInterval = null;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  _noise(duration, volume = 0.15) {
    const ctx = this.ctx; if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * volume;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  _tone(freq, duration, type = 'sine', volume = 0.1) {
    const ctx = this.ctx; if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  gunshot() { this._noise(0.08, 0.2); this._tone(200, 0.05, 'square', 0.08); }
  shotgunBlast() { this._noise(0.15, 0.3); this._tone(120, 0.08, 'square', 0.12); }
  sniperShot() { this._noise(0.12, 0.25); this._tone(400, 0.06, 'sawtooth', 0.1); }
  rocketFire() { this._tone(80, 0.3, 'sawtooth', 0.15); this._noise(0.2, 0.15); }
  explosion() { this._tone(60, 0.5, 'sine', 0.25); this._noise(0.4, 0.3); this._tone(40, 0.6, 'sine', 0.15); }
  pickup() { this._tone(523, 0.1, 'sine', 0.12); setTimeout(() => this._tone(659, 0.15, 'sine', 0.12), 100); }
  hit() { this._noise(0.04, 0.1); this._tone(300, 0.03, 'square', 0.06); }
  playerHit() { this._tone(100, 0.15, 'sine', 0.2); this._noise(0.08, 0.15); }
  enemyDeath() { this._tone(200, 0.1, 'square', 0.08); this._tone(100, 0.2, 'sine', 0.1); }

  whoosh() {
    const ctx = this.ctx; if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }

  victory() {
    const ctx = this.ctx; if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.4);
    });
  }

  voiceBlip() {
    const ctx = this.ctx; if (!ctx) return;
    this._tone(180 + Math.random() * 80, 0.06, 'square', 0.04);
  }

  // === Music System (file-based) ===

  _stopCurrentMusic() {
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }
    if (this._musicAudio) {
      this._musicAudio.pause();
      this._musicAudio.currentTime = 0;
    }
    this._musicPlaying = false;
  }

  _playTrack(path, volume, fadeInMs = 1500) {
    this._stopCurrentMusic();
    this._musicVolume = volume;
    this._musicPlaying = true;

    if (!this._musicAudio) {
      this._musicAudio = new Audio();
    }
    this._musicAudio.src = path;
    this._musicAudio.loop = true;
    this._musicAudio.volume = 0;
    this._musicAudio.play().catch(() => {});

    // Fade in
    const steps = 30;
    const stepMs = fadeInMs / steps;
    let step = 0;
    this._fadeInterval = setInterval(() => {
      step++;
      if (!this._musicAudio || step >= steps) {
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        if (this._musicAudio) this._musicAudio.volume = volume;
        return;
      }
      this._musicAudio.volume = volume * (step / steps);
    }, stepMs);
  }

  startDialogueMusic() {
    this._playTrack('assets/music/cinematic.mp3', 0.35, 1500);
  }

  startCombatMusic() {
    this._playTrack('assets/music/combat.mp3', 0.3, 1000);
  }

  stopMusic(fadeMs = 1500) {
    if (!this._musicPlaying || !this._musicAudio) return;
    this._musicPlaying = false;

    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }

    if (fadeMs <= 0) {
      this._musicAudio.pause();
      this._musicAudio.currentTime = 0;
      return;
    }

    const startVol = this._musicAudio.volume;
    const steps = 30;
    const stepMs = fadeMs / steps;
    let step = 0;
    const audio = this._musicAudio;
    this._fadeInterval = setInterval(() => {
      step++;
      if (step >= steps) {
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      audio.volume = Math.max(0, startVol * (1 - step / steps));
    }, stepMs);
  }

  pauseMusic() {
    if (!this._musicPlaying || !this._musicAudio) return;
    this._musicAudio.pause();
  }

  resumeMusic() {
    if (!this._musicPlaying || !this._musicAudio) return;
    this._musicAudio.play().catch(() => {});
  }
}
