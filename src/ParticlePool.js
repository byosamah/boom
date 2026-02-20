import * as THREE from 'three';
import { CONFIG } from './config.js';

export default class ParticlePool {
  constructor(scene, count = CONFIG.PARTICLE_POOL_SIZE) {
    this.pool = [];
    this.active = [];
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  spawn(x, y, z, vx, vy, vz, color, lifetime, scale = 1) {
    const mesh = this.pool.pop();
    if (!mesh) return;
    mesh.position.set(x, y, z);
    mesh.material.color.setHex(color);
    mesh.scale.setScalar(scale);
    mesh.visible = true;
    this.active.push({ mesh, vx, vy, vz, life: lifetime, maxLife: lifetime });
  }

  burst(x, y, z, color, count = 8, speed = 5, lifetime = 0.5, scale = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const s = speed * (0.5 + Math.random() * 0.5);
      const vy = 2 + Math.random() * 3;
      this.spawn(x, y + 0.3, z, Math.cos(angle) * s, vy, Math.sin(angle) * s, color, lifetime, scale);
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.pool.push(p.mesh);
        this.active.splice(i, 1);
        continue;
      }
      p.vy -= 9.8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0) { p.mesh.position.y = 0; p.vy *= -0.3; }
      const alpha = p.life / p.maxLife;
      p.mesh.material.opacity = alpha;
      p.mesh.material.transparent = alpha < 1;
      p.mesh.scale.setScalar(alpha * (p.mesh.scale.x / Math.max(alpha, 0.01)));
    }
  }
}
