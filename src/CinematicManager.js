import * as THREE from 'three';
import AnimController from './AnimController.js';
import { DIALOGUE, WEAPON_BONE_NAMES } from './config.js';

const CAMERA_PRESETS = {
  wide:    { pos: [0, 3.5, 7],    look: [0, 1.2, 0] },
  closeS1: { pos: [-2, 2.2, 3.5], look: [-1.5, 1.4, 0] },
  closeS2: { pos: [2, 2.2, 3.5],  look: [1.5, 1.4, 0] },
  overS1:  { pos: [-2.2, 2.8, 1.5], look: [1.5, 1.2, 0] },
};

export default class CinematicManager {
  constructor() {
    this.active = false;
    this.state = 'IDLE';
    this.dialogueData = null;
    this.nodeIndex = 0;

    // Typewriter
    this.fullText = '';
    this.charIndex = 0;
    this.typeSpeed = 40;
    this.typeTimer = 0;

    // Camera lerp
    this.targetPos = new THREE.Vector3();
    this.targetLook = new THREE.Vector3();
    this.lerpPos = new THREE.Vector3();
    this.lerpLook = new THREE.Vector3();

    // Soldiers
    this.soldiers = [];
    this.soldierAnims = [];

    // Refs
    this.camera = null;
    this.scene = null;
    this.sound = null;
    this.ui = null;
    this.onComplete = null;

    // Level transition
    this.transitioning = false;
    this.transPhase = null;
    this.transTimer = 0;
    this.transMidCallback = null;
    this.transDoneCallback = null;
  }

  startDialogue(key, scene, assets, camera, sound, ui, onComplete) {
    this.active = true;
    this.state = 'IDLE';
    this.dialogueData = DIALOGUE[key];
    this.nodeIndex = 0;
    this.camera = camera;
    this.scene = scene;
    this.sound = sound;
    this.ui = ui;
    this.onComplete = onComplete;

    this._setupSoldiers(assets);
    this._applyPreset('wide');
    this.lerpPos.copy(this.targetPos);
    this.lerpLook.copy(this.targetLook);
    camera.position.copy(this.lerpPos);
    camera.lookAt(this.lerpLook);

    ui.showDialogueOverlay();
    this._advance();
  }

  _setupSoldiers(assets) {
    this.cleanup();

    // Soldier 1 (Sgt Reyes) — left
    const s1Data = assets.cloneCharacter('soldier');
    const s1 = s1Data.scene;
    s1.position.set(-1.5, 0, 0);
    s1.rotation.y = Math.PI / 3;
    this.scene.add(s1);
    const s1Anim = new AnimController(s1, s1Data.animations);
    s1Anim.play('Idle');

    // Soldier 2 (player stand-in) — right
    const s2Data = assets.cloneCharacter('soldier');
    const s2 = s2Data.scene;
    s2.position.set(1.5, 0, 0);
    s2.rotation.y = -Math.PI / 3;
    this.scene.add(s2);
    const s2Anim = new AnimController(s2, s2Data.animations);
    s2Anim.play('Idle');

    // Hide all weapons, then show AK on S1, Pistol on S2
    [s1, s2].forEach(soldier => {
      soldier.traverse(child => {
        if (WEAPON_BONE_NAMES.includes(child.name)) child.visible = false;
      });
    });
    s1.traverse(child => { if (child.name === 'AK') child.visible = true; });
    s2.traverse(child => { if (child.name === 'Pistol') child.visible = true; });

    this.soldiers = [s1, s2];
    this.soldierAnims = [s1Anim, s2Anim];
  }

  _applyPreset(name) {
    const p = CAMERA_PRESETS[name] || CAMERA_PRESETS.wide;
    this.targetPos.set(p.pos[0], p.pos[1], p.pos[2]);
    this.targetLook.set(p.look[0], p.look[1], p.look[2]);
  }

  _advance() {
    if (!this.dialogueData || this.nodeIndex >= this.dialogueData.length) {
      this._finish();
      return;
    }

    const node = this.dialogueData[this.nodeIndex];

    switch (node.type) {
      case 'line':
        if (node.camera) this._applyPreset(node.camera);
        this.fullText = node.text;
        this.charIndex = 0;
        this.typeTimer = 0;
        this.state = 'TYPING';
        this.ui.setDialogueSpeaker(node.speaker);
        this.ui.setDialogueText('');
        this.ui.hideDialogueContinue();
        this.ui.hideDialogueChoices();
        break;

      case 'choice':
        this.state = 'CHOOSING';
        this.ui.setDialogueSpeaker(node.speaker || 'YOU');
        this.ui.setDialogueText('');
        this.ui.hideDialogueContinue();
        this.ui.showDialogueChoices(node.options, (chosen) => {
          const idx = this.dialogueData.findIndex(n => n.id === chosen.next);
          this.nodeIndex = idx !== -1 ? idx : this.nodeIndex + 1;
          this._advance();
        });
        break;

      case 'goto': {
        const idx = this.dialogueData.findIndex(n => n.id === node.target);
        this.nodeIndex = idx !== -1 ? idx : this.nodeIndex + 1;
        this._advance();
        break;
      }

      case 'end':
        this._finish();
        break;

      default:
        this.nodeIndex++;
        this._advance();
    }
  }

  _finish() {
    this.state = 'DONE';
    this.active = false;
    this.ui.hideDialogueOverlay();
    this.cleanup();
    if (this.onComplete) this.onComplete();
  }

  cleanup() {
    for (const s of this.soldiers) {
      if (s.parent) s.parent.remove(s);
    }
    this.soldiers = [];
    this.soldierAnims = [];
  }

  handleClick() {
    if (!this.active) return false;

    if (this.state === 'TYPING') {
      this.charIndex = this.fullText.length;
      this.ui.setDialogueText(this.fullText);
      this.state = 'WAITING';
      this.ui.showDialogueContinue();
      return true;
    }

    if (this.state === 'WAITING') {
      this.nodeIndex++;
      this._advance();
      return true;
    }

    return false;
  }

  skip() {
    if (!this.active && !this.transitioning) return;
    if (this.transitioning) return; // can't skip level transition
    this._finish();
  }

  startLevelTransition(ui, sound, midCallback, doneCallback) {
    this.transitioning = true;
    this.transPhase = 'fadeOut';
    this.transTimer = 0;
    this.ui = ui;
    this.sound = sound;
    this.transMidCallback = midCallback;
    this.transDoneCallback = doneCallback;

    sound.whoosh();
    ui.fadeToBlack();
  }

  update(dt) {
    // Soldier animations
    for (const anim of this.soldierAnims) anim.update(dt);

    // Camera lerp during dialogue
    if (this.active && this.camera) {
      this.lerpPos.lerp(this.targetPos, 3 * dt);
      this.lerpLook.lerp(this.targetLook, 3 * dt);
      this.camera.position.copy(this.lerpPos);
      this.camera.lookAt(this.lerpLook);
    }

    // Typewriter
    if (this.state === 'TYPING') {
      this.typeTimer += dt;
      const newIndex = Math.min(Math.floor(this.typeTimer * this.typeSpeed), this.fullText.length);
      if (newIndex > this.charIndex) {
        if (this.sound && newIndex % 3 === 0) this.sound.voiceBlip();
        this.charIndex = newIndex;
        this.ui.setDialogueText(this.fullText.substring(0, this.charIndex));
      }
      if (this.charIndex >= this.fullText.length) {
        this.state = 'WAITING';
        this.ui.showDialogueContinue();
      }
    }

    // Level transition phases
    if (this.transitioning) {
      this.transTimer += dt;
      switch (this.transPhase) {
        case 'fadeOut':
          if (this.transTimer >= 1.0) {
            this.transPhase = 'mid';
            this.transTimer = 0;
            if (this.transMidCallback) this.transMidCallback();
            this.ui.showLevelTitle('LEVEL 2', 'DESERT STORM');
          }
          break;
        case 'mid':
          if (this.transTimer >= 2.5) {
            this.transPhase = 'fadeIn';
            this.transTimer = 0;
            this.ui.hideLevelTitle();
            this.ui.fadeFromBlack();
          }
          break;
        case 'fadeIn':
          if (this.transTimer >= 1.0) {
            this.transitioning = false;
            this.transPhase = null;
            if (this.transDoneCallback) this.transDoneCallback();
          }
          break;
      }
    }
  }
}
