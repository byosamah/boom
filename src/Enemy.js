import * as THREE from 'three';
import AnimController from './AnimController.js';
import { CONFIG, WEAPON_BONE_NAMES } from './config.js';

export default class Enemy {
  constructor(scene, assets, type, position, speedMult = 1) {
    const cfg = CONFIG.ENEMY_TYPES[type];
    this.type = type;
    this.cfg = cfg;
    this.speed = cfg.speed * speedMult * (1 - CONFIG.ENEMY_SPEED_VARIANCE / 2 + Math.random() * CONFIG.ENEMY_SPEED_VARIANCE);
    this.health = cfg.health;
    this.maxHealth = cfg.health;
    this.radius = cfg.radius;
    this.damage = cfg.damage;
    this.alive = true;
    this.dying = false;
    this.deathTimer = 0;
    this.contactCooldown = 0;

    if (type === 'hazmat') {
      this.role = 'circler';
    } else {
      const roll = Math.random();
      if (roll < 0.50) this.role = 'rusher';
      else if (roll < 0.85) this.role = 'flanker';
      else this.role = 'circler';
    }
    this.flankerSide = Math.random() < 0.5 ? -1 : 1;
    this.orbitAngle = Math.random() * Math.PI * 2;

    const data = assets.cloneCharacter(type === 'basic' ? 'enemy' : 'hazmat');
    this.mesh = data.scene;
    this.mesh.position.copy(position);
    this.mesh.scale.setScalar(cfg.scale || 1);
    scene.add(this.mesh);

    this.mesh.traverse(child => {
      if (WEAPON_BONE_NAMES.includes(child.name)) child.visible = false;
    });

    this.anim = new AnimController(this.mesh, data.animations);
    this.anim.play('Run');

    this.position = this.mesh.position;
    this._dir = new THREE.Vector3();
  }

  update(dt, playerPos, allEnemies) {
    if (this.dying) {
      this.deathTimer -= dt;
      this.anim.update(dt);
      if (this.deathTimer <= 0) return true;
      return false;
    }

    this._dir.copy(playerPos).sub(this.position);
    this._dir.y = 0;
    const dist = this._dir.length();
    if (dist > 0.1) {
      this._dir.normalize();

      switch (this.role) {
        case 'flanker': {
          if (dist < 4) break;
          const perpX = this._dir.z * this.flankerSide;
          const perpZ = -this._dir.x * this.flankerSide;
          this._dir.x = this._dir.x * 0.6 + perpX * 0.4;
          this._dir.z = this._dir.z * 0.6 + perpZ * 0.4;
          this._dir.normalize();
          break;
        }
        case 'circler': {
          if (dist < 4 || this.health < this.maxHealth) break;
          this.orbitAngle += dt * 1.5;
          const targetDist = 7;
          const radialForce = Math.max(0.1, (dist - targetDist) / targetDist);
          const tangentX = -this._dir.z;
          const tangentZ = this._dir.x;
          this._dir.x = this._dir.x * radialForce + tangentX * 0.7;
          this._dir.z = this._dir.z * radialForce + tangentZ * 0.7;
          this._dir.normalize();
          break;
        }
      }

      this.position.x += this._dir.x * this.speed * dt;
      this.position.z += this._dir.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(this._dir.x, this._dir.z);
    }

    for (const other of allEnemies) {
      if (other === this || other.dying) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < CONFIG.ENEMY_SEPARATION && d > 0.01) {
        const push = (CONFIG.ENEMY_SEPARATION - d) * CONFIG.ENEMY_SEP_FORCE * dt / d;
        this.position.x += dx * push;
        this.position.z += dz * push;
      }
    }

    const h = CONFIG.ARENA_HALF - this.radius;
    this.position.x = Math.max(-h, Math.min(h, this.position.x));
    this.position.z = Math.max(-h, Math.min(h, this.position.z));

    this.contactCooldown -= dt;
    this.anim.update(dt);
    return false;
  }

  takeDamage(amount) {
    if (this.dying) return false;
    this.health -= amount;
    this.mesh.traverse(c => {
      if (c.isMesh && c.material) {
        if (!c.userData.origColor) c.userData.origColor = c.material.color.getHex();
        c.material.color.setHex(0xffffff);
      }
    });
    setTimeout(() => {
      this.mesh.traverse(c => {
        if (c.isMesh && c.material && c.userData.origColor !== undefined) {
          c.material.color.setHex(c.userData.origColor);
        }
      });
    }, 80);

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.alive = false;
    this.dying = true;
    this.deathTimer = 1.5;
    this.anim.playOnce('Death');
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse(c => {
      if (c.isMesh) { c.geometry?.dispose(); }
    });
  }
}
