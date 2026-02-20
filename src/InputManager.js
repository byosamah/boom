import * as THREE from 'three';

export default class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseJustDown = false;
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._raycaster = new THREE.Raycaster();
    this._mouse2 = new THREE.Vector2();

    // Touch bridge (set by Game.js when mobile)
    this.isMobile = false;
    this.touchMoveDir = null;
    this.touchAimPoint = null;
    this.touchFiring = false;

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('mousemove', e => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    window.addEventListener('mousedown', e => { if (e.button === 0) { this.mouseDown = true; this.mouseJustDown = true; } });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
  }

  consumeJustDown() { const v = this.mouseJustDown; this.mouseJustDown = false; return v; }

  getAimPoint(camera) {
    if (this.isMobile && this.touchAimPoint) return this.touchAimPoint;
    this._mouse2.x = (this.mouseX / window.innerWidth) * 2 - 1;
    this._mouse2.y = -(this.mouseY / window.innerHeight) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse2, camera);
    const target = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._groundPlane, target);
    return target;
  }

  getMoveDir() {
    if (this.isMobile && this.touchMoveDir) return this.touchMoveDir;
    let x = 0, z = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z, moving: len > 0 };
  }
}
