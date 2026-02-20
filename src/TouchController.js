import * as THREE from 'three';

const JOYSTICK_RADIUS = 60;
const DEAD_ZONE = 0.15;
const FIRE_THRESHOLD = 0.20;
const OUTER_ALPHA = 0.25;
const THUMB_ALPHA = 0.30;
const FIRE_ALPHA = 0.50;

export default class TouchController {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'touch-canvas';
    document.getElementById('game-container').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Joystick state
    this.leftTouch = null;   // { id, originX, originY, curX, curY }
    this.rightTouch = null;

    // Output
    this._moveDir = { x: 0, z: 0, moving: false };
    this._aimPoint = new THREE.Vector3();
    this._hasAim = false;
    this._firing = false;

    // Pause callback
    this.onPause = null;
    this._pauseRect = null;

    this.resize();
    this._bind();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Cache pause button hit rect (top-right, 48x48 + padding)
    this._pauseRect = { x: window.innerWidth - 64, y: 0, w: 64, h: 64 };
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    c.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
    c.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });
    c.addEventListener('touchcancel', e => this._onTouchEnd(e), { passive: false });
  }

  _hitsPause(x, y) {
    const r = this._pauseRect;
    return r && x >= r.x && y >= r.y && y <= r.h;
  }

  _onTouchStart(e) {
    e.preventDefault();
    const halfW = window.innerWidth / 2;

    for (const t of e.changedTouches) {
      // Check pause button first
      if (this._hitsPause(t.clientX, t.clientY)) {
        if (this.onPause) this.onPause();
        return;
      }

      if (t.clientX < halfW && !this.leftTouch) {
        this.leftTouch = { id: t.identifier, originX: t.clientX, originY: t.clientY, curX: t.clientX, curY: t.clientY };
      } else if (t.clientX >= halfW && !this.rightTouch) {
        this.rightTouch = { id: t.identifier, originX: t.clientX, originY: t.clientY, curX: t.clientX, curY: t.clientY };
      }
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.leftTouch && t.identifier === this.leftTouch.id) {
        this.leftTouch.curX = t.clientX;
        this.leftTouch.curY = t.clientY;
      }
      if (this.rightTouch && t.identifier === this.rightTouch.id) {
        this.rightTouch.curX = t.clientX;
        this.rightTouch.curY = t.clientY;
      }
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.leftTouch && t.identifier === this.leftTouch.id) {
        this.leftTouch = null;
      }
      if (this.rightTouch && t.identifier === this.rightTouch.id) {
        this.rightTouch = null;
      }
    }
  }

  // --- Output methods ---

  getMoveDir() {
    if (!this.leftTouch) {
      this._moveDir.x = 0;
      this._moveDir.z = 0;
      this._moveDir.moving = false;
      return this._moveDir;
    }

    let dx = this.leftTouch.curX - this.leftTouch.originX;
    let dy = this.leftTouch.curY - this.leftTouch.originY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < JOYSTICK_RADIUS * DEAD_ZONE) {
      this._moveDir.x = 0;
      this._moveDir.z = 0;
      this._moveDir.moving = false;
      return this._moveDir;
    }

    // Clamp to radius
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
      dist = JOYSTICK_RADIUS;
    }

    // Normalize: screen X → world X, screen Y → world Z
    const norm = dist / JOYSTICK_RADIUS;
    this._moveDir.x = (dx / dist) * norm;
    this._moveDir.z = (dy / dist) * norm;
    this._moveDir.moving = true;
    return this._moveDir;
  }

  getAimInfo(playerPos) {
    this._firing = false;
    this._hasAim = false;

    if (!this.rightTouch) return { aimPoint: null, firing: false };

    let dx = this.rightTouch.curX - this.rightTouch.originX;
    let dy = this.rightTouch.curY - this.rightTouch.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < JOYSTICK_RADIUS * DEAD_ZONE) {
      return { aimPoint: null, firing: false };
    }

    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;

    // Convert to world aim point: screen X → world X, screen Y → world Z
    this._aimPoint.set(
      playerPos.x + nx * 10,
      0,
      playerPos.z + ny * 10
    );
    this._hasAim = true;
    this._firing = (dist / JOYSTICK_RADIUS) > FIRE_THRESHOLD;

    return { aimPoint: this._aimPoint, firing: this._firing };
  }

  // --- Drawing ---

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.leftTouch) this._drawJoystick(this.leftTouch, false);
    if (this.rightTouch) this._drawJoystick(this.rightTouch, this._firing);
  }

  _drawJoystick(touch, firing) {
    const ctx = this.ctx;
    let dx = touch.curX - touch.originX;
    let dy = touch.curY - touch.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp thumb position
    let thumbX = touch.curX;
    let thumbY = touch.curY;
    if (dist > JOYSTICK_RADIUS) {
      thumbX = touch.originX + (dx / dist) * JOYSTICK_RADIUS;
      thumbY = touch.originY + (dy / dist) * JOYSTICK_RADIUS;
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(touch.originX, touch.originY, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${OUTER_ALPHA})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner thumb
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 24, 0, Math.PI * 2);
    if (firing) {
      ctx.fillStyle = `rgba(233,69,96,${FIRE_ALPHA})`;
    } else {
      ctx.fillStyle = `rgba(255,255,255,${THUMB_ALPHA})`;
    }
    ctx.fill();
  }

  dispose() {
    this.canvas.remove();
  }
}
