import * as THREE from 'three';
import { CONFIG } from './config.js';

const _projGeo = new THREE.SphereGeometry(CONFIG.PROJECTILE_RADIUS, 6, 6);

export default class Projectile {
  constructor(scene, pos, dir, stats) {
    this.stats = stats;
    this.alive = true;
    this.distTraveled = 0;

    const color = stats.explosive ? 0xff4400 : stats.piercing ? 0x00ffff : 0xffcc00;
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(_projGeo, mat);
    this.mesh.position.copy(pos);
    this.mesh.position.y = 0.8;
    scene.add(this.mesh);

    this.dir = dir.clone().normalize();
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.piercing = stats.piercing;
    this.explosive = stats.explosive;
    this.explosionRadius = stats.explosionRadius || 0;
    this.hitEnemies = new Set();
  }

  update(dt) {
    if (!this.alive) return;
    const step = this.speed * dt;
    this.mesh.position.x += this.dir.x * step;
    this.mesh.position.z += this.dir.z * step;
    this.distTraveled += step;

    const p = this.mesh.position;
    if (this.distTraveled > CONFIG.PROJECTILE_MAX_DIST ||
        Math.abs(p.x) > CONFIG.ARENA_HALF + 2 ||
        Math.abs(p.z) > CONFIG.ARENA_HALF + 2) {
      this.alive = false;
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.material.dispose();
  }
}
