import AnimController from './AnimController.js';
import { CONFIG, WEAPON_BONE_NAMES } from './config.js';

export default class Player {
  constructor(scene, assets) {
    const data = assets.cloneCharacter('soldier');
    this.mesh = data.scene;
    this.mesh.position.set(0, 0, 0);
    scene.add(this.mesh);

    this.anim = new AnimController(this.mesh, data.animations);
    this.anim.play('Idle');

    this.weaponMeshes = {};
    this.mesh.traverse(child => {
      if (WEAPON_BONE_NAMES.includes(child.name)) {
        this.weaponMeshes[child.name] = child;
        child.visible = false;
      }
    });

    this.currentWeapon = 'Pistol';
    if (this.weaponMeshes['Pistol']) this.weaponMeshes['Pistol'].visible = true;

    this.health = CONFIG.PLAYER_HEALTH;
    this.maxHealth = CONFIG.PLAYER_HEALTH;
    this.alive = true;
    this.fireCooldown = 0;
    this.wasMoving = false;
    this.contactCooldown = 0;
    this.targetRotY = 0;

    this.position = this.mesh.position;
  }

  setWeapon(name) {
    if (this.weaponMeshes[this.currentWeapon]) this.weaponMeshes[this.currentWeapon].visible = false;
    this.currentWeapon = name;
    if (this.weaponMeshes[name]) this.weaponMeshes[name].visible = true;
  }

  getWeaponStats() { return CONFIG.WEAPONS[this.currentWeapon]; }

  setAimTarget(worldPoint) {
    const dx = worldPoint.x - this.mesh.position.x;
    const dz = worldPoint.z - this.mesh.position.z;
    if (dx !== 0 || dz !== 0) {
      this.targetRotY = Math.atan2(dx, dz);
    }
  }

  update(dt, input, camera) {
    if (!this.alive) return;
    this.fireCooldown -= dt;
    this.contactCooldown -= dt;

    const dir = input.getMoveDir();
    if (dir.moving) {
      this.mesh.position.x += dir.x * CONFIG.PLAYER_SPEED * dt;
      this.mesh.position.z += dir.z * CONFIG.PLAYER_SPEED * dt;
    }

    const h = CONFIG.ARENA_HALF - CONFIG.PLAYER_RADIUS;
    this.mesh.position.x = Math.max(-h, Math.min(h, this.mesh.position.x));
    this.mesh.position.z = Math.max(-h, Math.min(h, this.mesh.position.z));

    let diff = this.targetRotY - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, 15 * dt);

    if (dir.moving && !this.wasMoving) this.anim.play('Run_Gun');
    else if (!dir.moving && this.wasMoving) this.anim.play('Idle');
    this.wasMoving = dir.moving;

    this.anim.update(dt);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.anim.playOnce('Death');
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  reset() {
    this.health = CONFIG.PLAYER_HEALTH;
    this.alive = true;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.y = 0;
    this.currentWeapon = 'Pistol';
    Object.values(this.weaponMeshes).forEach(m => m.visible = false);
    if (this.weaponMeshes['Pistol']) this.weaponMeshes['Pistol'].visible = true;
    this.fireCooldown = 0;
    this.contactCooldown = 0;
    this.anim.play('Idle', 0);
  }
}
