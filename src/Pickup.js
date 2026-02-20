import * as THREE from 'three';
import { CONFIG } from './config.js';

export default class Pickup {
  constructor(scene, assets, type, weaponKey, position) {
    this.type = type;
    this.weaponKey = weaponKey;
    this.alive = true;
    this.time = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.set(position.x, 0, position.z);

    const ringGeo = new THREE.RingGeometry(0.6, 0.8, 24);
    const ringColor = type === 'health' ? 0x44ff44 : 0x44aaff;
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.group.add(ring);
    this.ring = ring;

    if (type === 'health') {
      const model = assets.cloneStatic('health');
      if (model) {
        model.position.y = 0.5;
        this.group.add(model);
        this.model = model;
      }
    } else {
      const model = assets.cloneStatic(weaponKey.toLowerCase());
      if (model) {
        model.position.y = 0.5;
        model.scale.setScalar(1.5);
        this.group.add(model);
        this.model = model;
      }
    }

    scene.add(this.group);
    this.position = this.group.position;
  }

  update(dt) {
    this.time += dt * CONFIG.PICKUP_BOB_SPEED;
    if (this.model) this.model.position.y = 0.5 + Math.sin(this.time) * CONFIG.PICKUP_BOB_HEIGHT;
    if (this.model) this.model.rotation.y += dt * 1.5;
    this.ring.material.opacity = 0.3 + Math.sin(this.time * 2) * 0.2;
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
