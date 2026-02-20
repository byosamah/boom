import * as THREE from 'three';
import { CONFIG } from './config.js';

const SPAWN_FORMATIONS = ['SURROUND', 'PINCER', 'SWARM', 'LANE'];

export default class WaveManager {
  constructor() {
    this.wave = 0;
    this.state = 'BREAK';
    this.breakTimer = 0;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.4;
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.state = 'ACTIVE';
    const count = CONFIG.WAVE_BASE_ENEMIES + (waveNum - 1) * CONFIG.WAVE_ENEMY_INCREMENT;
    this.enemiesToSpawn = count;
    this.spawnTimer = 0;
    if (waveNum % CONFIG.BOSS_WAVE_INTERVAL === 0) {
      this.enemiesToSpawn += 3;
    }
  }

  startBreak() {
    this.state = 'BREAK';
    this.breakTimer = CONFIG.WAVE_BREAK_DURATION;
  }

  getSpeedMultiplier() {
    return 1 + (this.wave - 1) * CONFIG.WAVE_SPEED_SCALE;
  }

  shouldSpawnHazmat() {
    if (this.wave < CONFIG.HAZMAT_START_WAVE) return false;
    if (this.wave % CONFIG.BOSS_WAVE_INTERVAL === 0) return Math.random() < 0.5;
    return Math.random() < 0.15 + (this.wave - CONFIG.HAZMAT_START_WAVE) * 0.05;
  }

  getFormation() {
    return SPAWN_FORMATIONS[(this.wave - 1) % SPAWN_FORMATIONS.length];
  }

  getSpawnPosition() {
    const formation = this.getFormation();
    const h = CONFIG.ARENA_HALF - 2;
    const r = (Math.random() * 2 - 1) * h;

    switch (formation) {
      case 'PINCER': {
        const side = Math.random() < 0.5 ? -1 : 1;
        return new THREE.Vector3(side * h, 0, r);
      }
      case 'SWARM': {
        const edge = this.wave % 4;
        if (edge === 0) return new THREE.Vector3(r, 0, -h);
        if (edge === 1) return new THREE.Vector3(r, 0, h);
        if (edge === 2) return new THREE.Vector3(-h, 0, r);
        return new THREE.Vector3(h, 0, r);
      }
      case 'LANE': {
        const lane = this.wave % 2;
        if (lane === 0) {
          const z = Math.random() < 0.5 ? -h : h;
          const x = (Math.random() * 2 - 1) * 6;
          return new THREE.Vector3(x, 0, z);
        } else {
          const x = Math.random() < 0.5 ? -h : h;
          const z = (Math.random() * 2 - 1) * 6;
          return new THREE.Vector3(x, 0, z);
        }
      }
      default: {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) return new THREE.Vector3(r, 0, -h);
        if (edge === 1) return new THREE.Vector3(r, 0, h);
        if (edge === 2) return new THREE.Vector3(-h, 0, r);
        return new THREE.Vector3(h, 0, r);
      }
    }
  }

  update(dt, enemyCount) {
    if (this.state === 'BREAK') {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.startWave(this.wave + 1);
        return { event: 'WAVE_START', wave: this.wave };
      }
      return { event: 'BREAK', timeLeft: this.breakTimer };
    }

    if (this.enemiesToSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval;
        this.enemiesToSpawn--;
        const isHazmat = this.shouldSpawnHazmat();
        return { event: 'SPAWN', type: isHazmat ? 'hazmat' : 'basic', position: this.getSpawnPosition() };
      }
    }

    if (this.enemiesToSpawn <= 0 && enemyCount <= 0) {
      this.startBreak();
      return { event: 'WAVE_CLEAR', wave: this.wave };
    }

    return { event: 'NONE' };
  }
}
