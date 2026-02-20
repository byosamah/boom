import * as THREE from 'three';

export default class AnimController {
  constructor(model, animations) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.current = null;
    for (const clip of animations) {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    }
  }

  play(name, crossfade = 0.2) {
    const action = this.actions[name];
    if (!action || action === this.current) return;
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.clampWhenFinished = false;
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.play();
    if (this.current) {
      this.current.crossFadeTo(action, crossfade, true);
    }
    this.current = action;
  }

  playOnce(name, crossfade = 0.15) {
    const action = this.actions[name];
    if (!action) return;
    action.reset();
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.play();
    if (this.current && this.current !== action) {
      this.current.crossFadeTo(action, crossfade, true);
    }
    this.current = action;
  }

  update(dt) { this.mixer.update(dt); }
}
