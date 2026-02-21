import * as THREE from 'three';

const JOYSTICK_RADIUS = 60;
const DEAD_ZONE = 0.15;
const OUTER_ALPHA = 0.25;
const THUMB_ALPHA = 0.30;
const FIRE_BTN_SIZE = 40;

export default class TouchController {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'touch-canvas';
    document.getElementById('game-container').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Joystick state (left only)
    this.leftTouch = null;   // { id, originX, originY, curX, curY }

    // Fire button state
    this._fireTouch = null;  // { id }
    this._firing = false;
    this._firePending = false;

    // Output
    this._moveDir = { x: 0, z: 0, moving: false };
    this._aimPoint = new THREE.Vector3();

    // Pause callback
    this.onPause = null;
    this._pauseRect = null;
    this._fireBtnCenter = { x: 0, y: 0 };

    this.resize();
    this._bind();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._pauseRect = { x: window.innerWidth - 64, y: 0, w: 64, h: 64 };
    // Fire button: bottom-right area
    this._fireBtnCenter = {
      x: window.innerWidth - 80,
      y: window.innerHeight - 120
    };
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

  _hitsFireBtn(x, y) {
    const cx = this._fireBtnCenter.x;
    const cy = this._fireBtnCenter.y;
    const dx = x - cx;
    const dy = y - cy;
    return (dx * dx + dy * dy) <= (FIRE_BTN_SIZE + 16) * (FIRE_BTN_SIZE + 16);
  }

  _onTouchStart(e) {
    e.preventDefault();
    const halfW = window.innerWidth / 2;

    for (const t of e.changedTouches) {
      if (this._hitsPause(t.clientX, t.clientY)) {
        if (this.onPause) this.onPause();
        return;
      }

      // Fire button check (right side, near button)
      if (t.clientX >= halfW && this._hitsFireBtn(t.clientX, t.clientY) && !this._fireTouch) {
        this._fireTouch = { id: t.identifier };
        this._firing = true;
        this._firePending = true;
        continue;
      }

      // Left joystick (left half)
      if (t.clientX < halfW && !this.leftTouch) {
        this.leftTouch = { id: t.identifier, originX: t.clientX, originY: t.clientY, curX: t.clientX, curY: t.clientY };
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
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.leftTouch && t.identifier === this.leftTouch.id) {
        this.leftTouch = null;
      }
      if (this._fireTouch && t.identifier === this._fireTouch.id) {
        this._fireTouch = null;
        this._firing = false;
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

    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
      dist = JOYSTICK_RADIUS;
    }

    const norm = dist / JOYSTICK_RADIUS;
    this._moveDir.x = (dx / dist) * norm;
    this._moveDir.z = (dy / dist) * norm;
    this._moveDir.moving = true;
    return this._moveDir;
  }

  isFiring() {
    return this._firing || this._firePending;
  }

  consumeFire() {
    this._firePending = false;
  }

  // Auto-aim: find nearest enemy and return aim point
  getAutoAimPoint(playerPos, enemies) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const e of enemies) {
      if (e.dying) continue;
      const dx = e.position.x - playerPos.x;
      const dz = e.position.z - playerPos.z;
      const d = dx * dx + dz * dz;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }

    if (nearest) {
      this._aimPoint.set(nearest.position.x, 0, nearest.position.z);
      return this._aimPoint;
    }

    // No enemies: aim in movement direction, or forward
    const move = this.getMoveDir();
    if (move.moving) {
      this._aimPoint.set(playerPos.x + move.x * 10, 0, playerPos.z + move.z * 10);
      return this._aimPoint;
    }

    return null;
  }

  // --- Drawing ---

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.leftTouch) this._drawJoystick(this.leftTouch);
    this._drawFireButton();
  }

  _drawJoystick(touch) {
    const ctx = this.ctx;
    let dx = touch.curX - touch.originX;
    let dy = touch.curY - touch.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

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
    ctx.fillStyle = `rgba(255,255,255,${THUMB_ALPHA})`;
    ctx.fill();
  }

  _drawFireButton() {
    const ctx = this.ctx;
    const cx = this._fireBtnCenter.x;
    const cy = this._fireBtnCenter.y;
    const r = FIRE_BTN_SIZE;

    // Button background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (this._firing) {
      ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
    } else {
      ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    }
    ctx.fill();

    // Button border
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = this._firing ? 'rgba(255,255,255,0.5)' : 'rgba(233,69,96,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Crosshair icon
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    const s = 12;
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.stroke();
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
    ctx.stroke();
    // Outer ring of crosshair
    ctx.beginPath();
    ctx.arc(cx, cy, s - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  dispose() {
    this.canvas.remove();
  }
}
