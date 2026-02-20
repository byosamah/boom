import { CONFIG } from './config.js';

export default class UIManager {
  constructor() {
    this.els = {
      loadScreen: document.getElementById('loading-screen'),
      progressFill: document.getElementById('progress-fill'),
      loadingText: document.getElementById('loading-text'),
      startScreen: document.getElementById('start-screen'),
      hud: document.getElementById('hud'),
      score: document.getElementById('score'),
      multiplier: document.getElementById('multiplier'),
      waveDisplay: document.getElementById('wave-display'),
      healthFill: document.getElementById('health-fill'),
      weaponDisplay: document.getElementById('weapon-display'),
      waveBanner: document.getElementById('wave-banner'),
      waveBannerText: document.getElementById('wave-banner-text'),
      waveBannerSub: document.getElementById('wave-banner-sub'),
      pauseScreen: document.getElementById('pause-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      finalScore: document.getElementById('final-score'),
      finalWave: document.getElementById('final-wave'),
      restartBtn: document.getElementById('restart-btn'),
      floatingTexts: document.getElementById('floating-texts'),
      damageFlash: document.getElementById('damage-flash'),
      minimap: document.getElementById('minimap'),
      // Cinematic / transition elements
      dialogueOverlay: document.getElementById('dialogue-overlay'),
      dialogueSpeaker: document.getElementById('dialogue-speaker'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueContinue: document.getElementById('dialogue-continue'),
      dialogueChoices: document.getElementById('dialogue-choices'),
      fadeOverlay: document.getElementById('fade-overlay'),
      levelTitle: document.getElementById('level-title'),
      levelTitleNumber: document.getElementById('level-title-number'),
      levelTitleName: document.getElementById('level-title-name'),
      statsScreen: document.getElementById('stats-screen'),
      statScore: document.getElementById('stat-score'),
      statKills: document.getElementById('stat-kills'),
      statWaves: document.getElementById('stat-waves'),
      statTime: document.getElementById('stat-time'),
      statsRestartBtn: document.getElementById('stats-restart-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resumeBtn: document.getElementById('resume-btn'),
    };
    this.minimapCtx = this.els.minimap.getContext('2d');
    this._bannerTimeout = null;
  }

  setLoadProgress(pct) {
    this.els.progressFill.style.width = `${pct * 100}%`;
    this.els.loadingText.textContent = `Loading assets... ${Math.floor(pct * 100)}%`;
  }

  showScreen(name) {
    this.els.loadScreen.style.display = 'none';
    this.els.startScreen.style.display = 'none';
    this.els.hud.style.display = 'none';
    this.els.pauseScreen.style.display = 'none';
    this.els.gameoverScreen.style.display = 'none';
    this.els.statsScreen.style.display = 'none';
    this.els.dialogueOverlay.style.display = 'none';

    switch (name) {
      case 'loading': this.els.loadScreen.style.display = 'flex'; break;
      case 'start': this.els.startScreen.style.display = 'flex'; break;
      case 'playing': this.els.hud.style.display = 'block'; break;
      case 'paused':
        this.els.hud.style.display = 'block';
        this.els.pauseScreen.style.display = 'flex';
        break;
      case 'gameover':
        this.els.hud.style.display = 'block';
        this.els.gameoverScreen.style.display = 'flex';
        break;
      case 'cinematic':
        break;
      case 'stats':
        this.els.statsScreen.style.display = 'flex';
        break;
    }
  }

  updateHUD(score, mult, wave, health, maxHealth, weapon) {
    this.els.score.textContent = score.toLocaleString();
    if (mult > 1) {
      this.els.multiplier.textContent = `x${mult.toFixed(1)}`;
      this.els.multiplier.style.opacity = '1';
    } else {
      this.els.multiplier.style.opacity = '0';
    }
    this.els.waveDisplay.textContent = `Level ${wave}`;
    const pct = (health / maxHealth) * 100;
    this.els.healthFill.style.width = `${pct}%`;
    if (pct > 50) this.els.healthFill.style.background = 'linear-gradient(90deg, #44cc44, #66ee66)';
    else if (pct > 25) this.els.healthFill.style.background = 'linear-gradient(90deg, #ccaa00, #eecc22)';
    else this.els.healthFill.style.background = 'linear-gradient(90deg, #e94560, #ff6b6b)';
    this.els.weaponDisplay.textContent = weapon;
  }

  showWaveBanner(level, subtitle = 'Get ready!') {
    this.els.waveBannerText.textContent = `Level ${level}`;
    this.els.waveBannerSub.textContent = subtitle;
    this.els.waveBanner.style.display = 'block';
    if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => { this.els.waveBanner.style.display = 'none'; }, 2000);
  }

  showGameOver(score, level) {
    this.els.finalScore.textContent = score.toLocaleString();
    this.els.finalWave.textContent = `Level ${level}`;
    this.showScreen('gameover');
  }

  flashDamage() {
    this.els.damageFlash.style.opacity = '1';
    setTimeout(() => { this.els.damageFlash.style.opacity = '0'; }, 200);
  }

  floatingText(screenX, screenY, text, color = '#fff', size = 20) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.color = color;
    el.style.fontSize = `${size}px`;
    this.els.floatingTexts.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  drawMinimap(player, enemies, pickups, barrels) {
    const ctx = this.minimapCtx;
    const w = 150, h = 150;
    const s = w / (CONFIG.ARENA_HALF * 2);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    const toMap = (pos) => ({
      x: (pos.x + CONFIG.ARENA_HALF) * s,
      y: (pos.z + CONFIG.ARENA_HALF) * s,
    });

    ctx.fillStyle = '#ff8800';
    for (const b of barrels) {
      if (!b.alive) continue;
      const p = toMap(b.position);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    ctx.fillStyle = '#44ff44';
    for (const pk of pickups) {
      const p = toMap(pk.position);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of enemies) {
      if (e.dying) continue;
      ctx.fillStyle = e.type === 'hazmat' ? '#ffcc00' : '#ff4444';
      const p = toMap(e.position);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#44ff44';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    const pp = toMap(player.position);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // === Dialogue methods ===

  showDialogueOverlay() {
    this.els.dialogueOverlay.style.display = 'flex';
  }

  hideDialogueOverlay() {
    this.els.dialogueOverlay.style.display = 'none';
    this.els.dialogueChoices.style.display = 'none';
    this.els.dialogueContinue.style.display = 'none';
  }

  setDialogueSpeaker(name) {
    this.els.dialogueSpeaker.textContent = name;
  }

  setDialogueText(text) {
    this.els.dialogueText.textContent = text;
  }

  showDialogueContinue() {
    this.els.dialogueContinue.style.display = 'block';
  }

  hideDialogueContinue() {
    this.els.dialogueContinue.style.display = 'none';
  }

  showDialogueChoices(options, onSelect) {
    const container = this.els.dialogueChoices;
    container.innerHTML = '';
    container.style.display = 'flex';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(opt);
      });
      container.appendChild(btn);
    }
  }

  hideDialogueChoices() {
    this.els.dialogueChoices.style.display = 'none';
    this.els.dialogueChoices.innerHTML = '';
  }

  // === Fade / Transition methods ===

  fadeToBlack() {
    this.els.fadeOverlay.style.opacity = '1';
    this.els.fadeOverlay.classList.add('active');
  }

  fadeFromBlack() {
    this.els.fadeOverlay.style.opacity = '0';
    this.els.fadeOverlay.classList.remove('active');
  }

  showLevelTitle(levelText, nameText) {
    this.els.levelTitleNumber.textContent = levelText;
    this.els.levelTitleName.textContent = nameText;
    this.els.levelTitle.style.display = 'block';
  }

  hideLevelTitle() {
    this.els.levelTitle.style.display = 'none';
  }

  // === Stats screen ===

  showStatsScreen(stats) {
    this.els.statScore.textContent = stats.score.toLocaleString();
    this.els.statKills.textContent = stats.kills;
    this.els.statWaves.textContent = stats.waves;
    const mins = Math.floor(stats.time / 60);
    const secs = Math.floor(stats.time % 60);
    this.els.statTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.els.statsScreen.style.display = 'flex';
  }

  hideStatsScreen() {
    this.els.statsScreen.style.display = 'none';
  }
}
