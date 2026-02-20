import * as THREE from 'three';
import { CONFIG } from './config.js';
import { distXZ } from './utils.js';

export default class ExplodingBarrel {
  constructor(scene, assets, position) {
    this.mesh = assets.cloneStatic('barrel');
    this.alive = true;
    if (this.mesh) {
      this.mesh.position.set(position[0], position[1], position[2]);
      scene.add(this.mesh);
    }
    this.position = new THREE.Vector3(position[0], position[1], position[2]);
    this.radius = CONFIG.BARREL_RADIUS;
  }

  explode(scene, particles, sound, enemies, player) {
    if (!this.alive) return;
    this.alive = false;
    if (this.mesh) scene.remove(this.mesh);

    particles.burst(this.position.x, 0.5, this.position.z, 0xff4400, 20, 8, 0.8, 2);
    particles.burst(this.position.x, 0.5, this.position.z, 0xffcc00, 12, 5, 0.6, 1.5);
    particles.burst(this.position.x, 0.2, this.position.z, 0x444444, 8, 3, 1.0, 3);
    sound.explosion();

    const r = CONFIG.BARREL_EXPLOSION_RADIUS;
    for (const enemy of enemies) {
      if (enemy.dying) continue;
      const d = distXZ(this.position, enemy.position);
      if (d < r) {
        const dmg = CONFIG.BARREL_EXPLOSION_DAMAGE * (1 - d / r);
        enemy.takeDamage(dmg);
      }
    }
    const pd = distXZ(this.position, player.position);
    if (pd < r) {
      player.takeDamage(CONFIG.BARREL_EXPLOSION_DAMAGE * 0.5 * (1 - pd / r));
    }
  }
}
