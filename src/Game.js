import * as THREE from 'three';
import { CONFIG, ARENA_OBJECTS, LEVEL_CONFIGS } from './config.js';
import { distXZ } from './utils.js';
import SoundManager from './SoundManager.js';
import AssetLoader from './AssetLoader.js';
import InputManager from './InputManager.js';
import ParticlePool from './ParticlePool.js';
import WaveManager from './WaveManager.js';
import UIManager from './UIManager.js';
import Player from './Player.js';
import Enemy from './Enemy.js';
import Projectile from './Projectile.js';
import ExplodingBarrel from './ExplodingBarrel.js';
import Pickup from './Pickup.js';
import CinematicManager from './CinematicManager.js';

export default class Game {
  constructor() {
    this.state = 'LOADING';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock(false);

    this.assets = new AssetLoader();
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.ui = new UIManager();
    this.particles = null;
    this.waveManager = new WaveManager();
    this.cinematic = new CinematicManager();

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.barrels = [];
    this.coverColliders = [];

    // Arena mesh tracking for cleanup
    this.arenaMeshes = [];
    this.wallMeshes = [];
    this.groundMesh = null;
    this.stripesMeshes = [];

    // Level tracking
    this.currentLevel = 1;
    this.totalKills = 0;
    this.gameStartTime = 0;

    // Light refs
    this.hemiLight = null;
    this.dirLight = null;
    this.fillLight = null;

    this.score = 0;
    this.multiplier = 1;
    this.streakTimer = 0;
    this.timeScale = 1;
    this.slowMoTimer = 0;

    this.shakeIntensity = 0;
    this.shakeDecay = 0;
    this._cameraTarget = new THREE.Vector3();
    this._tempVec = new THREE.Vector3();
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.getElementById('game-container').prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 40, 65);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(CONFIG.CAMERA_OFFSET[0], CONFIG.CAMERA_OFFSET[1], CONFIG.CAMERA_OFFSET[2]);
    this.camera.lookAt(0, 0, 0);

    this.hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x886644, 1.2);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4e6, 1.8);
    this.dirLight.position.set(10, 20, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -35;
    this.dirLight.shadow.camera.right = 35;
    this.dirLight.shadow.camera.top = 35;
    this.dirLight.shadow.camera.bottom = -35;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    this.fillLight.position.set(-8, 10, -8);
    this.scene.add(this.fillLight);

    this._createGround('urban');
    this._createWalls();

    this.particles = new ParticlePool(this.scene);

    const manifest = {
      soldier: 'assets/Characters/glTF/Character_Soldier.gltf',
      enemy: 'assets/Characters/glTF/Character_Enemy.gltf',
      hazmat: 'assets/Characters/glTF/Character_Hazmat.gltf',
      barrel: 'assets/Environment/glTF/ExplodingBarrel.gltf',
      health: 'assets/Environment/glTF/Health.gltf',
      barrier_fixed: 'assets/Environment/glTF/Barrier_Fixed.gltf',
      barrier_large: 'assets/Environment/glTF/Barrier_Large.gltf',
      barrier_single: 'assets/Environment/glTF/Barrier_Single.gltf',
      barrier_trash: 'assets/Environment/glTF/Barrier_Trash.gltf',
      sacktrench: 'assets/Environment/glTF/SackTrench.gltf',
      sacktrench_small: 'assets/Environment/glTF/SackTrench_Small.gltf',
      container_small: 'assets/Environment/glTF/Container_Small.gltf',
      container_long: 'assets/Environment/glTF/Container_Long.gltf',
      crate: 'assets/Environment/glTF/Crate.gltf',
      debris_brokencar: 'assets/Environment/glTF/Debris_BrokenCar.gltf',
      debris_papers_1: 'assets/Environment/glTF/Debris_Papers_1.gltf',
      debris_papers_2: 'assets/Environment/glTF/Debris_Papers_2.gltf',
      debris_pile: 'assets/Environment/glTF/Debris_Pile.gltf',
      debris_tires: 'assets/Environment/glTF/Debris_Tires.gltf',
      cardboardboxes_1: 'assets/Environment/glTF/CardboardBoxes_1.gltf',
      cardboardboxes_3: 'assets/Environment/glTF/CardboardBoxes_3.gltf',
      fence: 'assets/Environment/glTF/Fence.gltf',
      fence_long: 'assets/Environment/glTF/Fence_Long.gltf',
      metalfence: 'assets/Environment/glTF/MetalFence.gltf',
      woodplanks: 'assets/Environment/glTF/WoodPlanks.gltf',
      sofa: 'assets/Environment/glTF/Sofa.gltf',
      pallet: 'assets/Environment/glTF/Pallet.gltf',
      pallet_broken: 'assets/Environment/glTF/Pallet_Broken.gltf',
      pipes: 'assets/Environment/glTF/Pipes.gltf',
      gascan: 'assets/Environment/glTF/GasCan.gltf',
      gastank: 'assets/Environment/glTF/GasTank.gltf',
      sign: 'assets/Environment/glTF/Sign.gltf',
      watertank_floor: 'assets/Environment/glTF/WaterTank_Floor.gltf',
      tree_1: 'assets/Environment/glTF/Tree_1.gltf',
      tree_2: 'assets/Environment/glTF/Tree_2.gltf',
      tree_3: 'assets/Environment/glTF/Tree_3.gltf',
      tree_4: 'assets/Environment/glTF/Tree_4.gltf',
      trafficcone: 'assets/Environment/glTF/TrafficCone.gltf',
      streetlight: 'assets/Environment/glTF/StreetLight.gltf',
      brickwall: 'assets/Environment/glTF/BrickWall_1.gltf',
      structure_1: 'assets/Environment/glTF/Structure_1.gltf',
      structure_2: 'assets/Environment/glTF/Structure_2.gltf',
      structure_3: 'assets/Environment/glTF/Structure_3.gltf',
      structure_4: 'assets/Environment/glTF/Structure_4.gltf',
      tank: 'assets/Environment/glTF/Tank.gltf',
      pistol: 'assets/Guns/glTF/Pistol.gltf',
      shotgun: 'assets/Guns/glTF/Shotgun.gltf',
      ak: 'assets/Guns/glTF/AK.gltf',
      smg: 'assets/Guns/glTF/SMG.gltf',
      sniper: 'assets/Guns/glTF/Sniper.gltf',
      rocketlauncher: 'assets/Guns/glTF/RocketLauncher.gltf',
    };

    await this.assets.loadAll(manifest, (pct) => this.ui.setLoadProgress(pct));

    this._buildArena(ARENA_OBJECTS);
    this.sound.init();

    // Start intro cinematic instead of menu
    this.state = 'INTRO_CINEMATIC';
    this.ui.showScreen('cinematic');
    this.sound.startDialogueMusic();
    this.cinematic.startDialogue('intro', this.scene, this.assets, this.camera, this.sound, this.ui, () => {
      this.sound.stopMusic(1500);
      setTimeout(() => this.sound.startCombatMusic(), 1600);
      this._startGame();
    });

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (this.state === 'INTRO_CINEMATIC' || this.state === 'VICTORY_CINEMATIC') {
          this.cinematic.skip();
        } else {
          this._togglePause();
        }
      }
    });
    window.addEventListener('click', (e) => {
      if (this.state === 'INTRO_CINEMATIC' || this.state === 'VICTORY_CINEMATIC') {
        this.cinematic.handleClick();
      } else if (this.state === 'MENU') {
        this._startGame();
      }
    });
    this.ui.els.restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._restartGame();
    });
    this.ui.els.statsRestartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._restartGame();
    });

    this.clock.start();
    this._loop();
  }

  // === Ground creation ===

  _createGround(type) {
    if (type === 'desert') this._createDesertGround();
    else this._createUrbanGround();
  }

  _createUrbanGround() {
    const S = 2048;
    const PPU = 32;
    const CX = S / 2, CY = S / 2;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');

    let seed = 42;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, S, S);
    const imgData = ctx.getImageData(0, 0, S, S);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * 20;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#5a4030'; ctx.fillRect(0, 0, CX, CY);
    ctx.fillStyle = '#3a4a3a'; ctx.fillRect(CX, 0, CX, CY);
    ctx.fillStyle = '#3a3a4a'; ctx.fillRect(CX, CY, CX, CY);
    ctx.fillStyle = '#4a4535'; ctx.fillRect(0, CY, CX, CY);
    ctx.globalAlpha = 1;

    const roadHW = 8 * PPU;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(CX - roadHW, 0, roadHW * 2, S);
    ctx.fillRect(0, CY - roadHW, S, roadHW * 2);

    const curb = 1 * PPU;
    ctx.fillStyle = '#555555';
    ctx.fillRect(CX - roadHW - curb, 0, curb, CY - roadHW);
    ctx.fillRect(CX - roadHW - curb, CY + roadHW, curb, CY - roadHW);
    ctx.fillRect(CX + roadHW, 0, curb, CY - roadHW);
    ctx.fillRect(CX + roadHW, CY + roadHW, curb, CY - roadHW);
    ctx.fillRect(0, CY - roadHW - curb, CX - roadHW, curb);
    ctx.fillRect(CX + roadHW, CY - roadHW - curb, CX - roadHW, curb);
    ctx.fillRect(0, CY + roadHW, CX - roadHW, curb);
    ctx.fillRect(CX + roadHW, CY + roadHW, CX - roadHW, curb);

    ctx.strokeStyle = '#bba830';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, CY - roadHW); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, CY + roadHW); ctx.lineTo(CX, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(CX - roadHW, CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + roadHW, CY); ctx.lineTo(S, CY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    [CX - roadHW, CX + roadHW].forEach(x => {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CY - roadHW); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, CY + roadHW); ctx.lineTo(x, S); ctx.stroke();
    });
    [CY - roadHW, CY + roadHW].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CX - roadHW, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX + roadHW, y); ctx.lineTo(S, y); ctx.stroke();
    });

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const cwDepth = 2 * PPU;
    const barT = 10, barGap = 8, margin = 20;
    for (let y = CY - roadHW - cwDepth; y < CY - roadHW; y += barT + barGap)
      ctx.fillRect(CX - roadHW + margin, y, roadHW * 2 - margin * 2, barT);
    for (let y = CY + roadHW; y < CY + roadHW + cwDepth; y += barT + barGap)
      ctx.fillRect(CX - roadHW + margin, y, roadHW * 2 - margin * 2, barT);
    for (let x = CX - roadHW - cwDepth; x < CX - roadHW; x += barT + barGap)
      ctx.fillRect(x, CY - roadHW + margin, barT, roadHW * 2 - margin * 2);
    for (let x = CX + roadHW; x < CX + roadHW + cwDepth; x += barT + barGap)
      ctx.fillRect(x, CY - roadHW + margin, barT, roadHW * 2 - margin * 2);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let r = 8; r <= 28; r += 5) {
      ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(CX - 28, CY); ctx.lineTo(CX + 28, CY);
    ctx.moveTo(CX, CY - 28); ctx.lineTo(CX, CY + 28);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      let cx = rand() * S, cy = rand() * S;
      ctx.moveTo(cx, cy);
      const segs = 3 + Math.floor(rand() * 5);
      for (let j = 0; j < segs; j++) {
        cx += (rand() - 0.5) * 60; cy += (rand() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
      const onNS = rand() > 0.5;
      let px, py;
      if (onNS) {
        px = CX - roadHW + rand() * roadHW * 2;
        py = rand() * S;
      } else {
        px = rand() * S;
        py = CY - roadHW + rand() * roadHW * 2;
      }
      ctx.fillStyle = `rgba(20,20,20,${0.3 + rand() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(px, py, 6 + rand() * 14, 4 + rand() * 10, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const stainColors = [
      ['rgba(120,60,30,0.15)', 'rgba(80,40,20,0.12)'],
      ['rgba(40,50,40,0.15)', 'rgba(30,60,30,0.12)'],
      ['rgba(30,30,50,0.15)', 'rgba(20,20,40,0.12)'],
      ['rgba(80,75,50,0.15)', 'rgba(60,55,35,0.12)'],
    ];
    for (let i = 0; i < 25; i++) {
      const sx = rand() * S, sy = rand() * S;
      const quadrant = (sy < CY ? 0 : 2) + (sx < CX ? 0 : 1);
      const colors = stainColors[quadrant];
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.beginPath();
      ctx.ellipse(sx, sy, 10 + rand() * 30, 8 + rand() * 25, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    const groundGeo = new THREE.PlaneGeometry(CONFIG.ARENA_HALF * 2 + 8, CONFIG.ARENA_HALF * 2 + 8);
    const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.05 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.groundMesh = ground;

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x993322, transparent: true, opacity: 0.4 });
    const h = CONFIG.ARENA_HALF;
    const stripeGeos = [
      { w: h * 2, d: 0.6, x: 0, z: -h },
      { w: h * 2, d: 0.6, x: 0, z: h },
      { w: 0.6, d: h * 2, x: -h, z: 0 },
      { w: 0.6, d: h * 2, x: h, z: 0 },
    ];
    for (const s of stripeGeos) {
      const geo = new THREE.PlaneGeometry(s.w, s.d);
      const stripe = new THREE.Mesh(geo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(s.x, 0.01, s.z);
      this.scene.add(stripe);
      this.stripesMeshes.push(stripe);
    }
  }

  _createDesertGround() {
    const S = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');

    let seed = 42;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };

    // Sand base
    ctx.fillStyle = '#c4a46c';
    ctx.fillRect(0, 0, S, S);

    // Noise grain
    const imgData = ctx.getImageData(0, 0, S, S);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * 30;
      d[i] += n; d[i + 1] += n * 0.8; d[i + 2] += n * 0.5;
    }
    ctx.putImageData(imgData, 0, 0);

    // Dark patches
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(120,90,50,${0.1 + rand() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(rand() * S, rand() * S, 20 + rand() * 60, 15 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wind-swept streaks
    ctx.strokeStyle = 'rgba(180,160,120,0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      const y = rand() * S;
      ctx.moveTo(rand() * S * 0.3, y);
      ctx.lineTo(rand() * S * 0.7 + S * 0.3, y + (rand() - 0.5) * 20);
      ctx.stroke();
    }

    // Faint tire tracks
    ctx.strokeStyle = 'rgba(100,80,50,0.15)';
    ctx.lineWidth = 8;
    ctx.setLineDash([30, 20]);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      let x = rand() * S, y = 0;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (rand() - 0.5) * 100;
        y += S / 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Rocky patches
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(90,75,55,${0.15 + rand() * 0.1})`;
      const cx = rand() * S, cy = rand() * S;
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.ellipse(cx + (rand() - 0.5) * 30, cy + (rand() - 0.5) * 30, 5 + rand() * 15, 4 + rand() * 10, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    const groundGeo = new THREE.PlaneGeometry(CONFIG.ARENA_HALF * 2 + 8, CONFIG.ARENA_HALF * 2 + 8);
    const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.02 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.groundMesh = ground;
  }

  // === Walls ===

  _createWalls() {
    const h = CONFIG.ARENA_HALF;
    const wh = CONFIG.WALL_HEIGHT;
    const wt = CONFIG.WALL_THICKNESS;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a6652, roughness: 0.9 });

    const makeWall = (w, d, x, z) => {
      const geo = new THREE.BoxGeometry(w, wh, d);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(x, wh / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.wallMeshes.push(wall);
    };
    makeWall(h * 2 + wt * 2, wt, 0, -h - wt / 2);
    makeWall(h * 2 + wt * 2, wt, 0, h + wt / 2);
    makeWall(wt, h * 2, -h - wt / 2, 0);
    makeWall(wt, h * 2, h + wt / 2, 0);

    const interval = 8;
    for (let x = -h; x <= h; x += interval) {
      this._placeBrickDecor(x, -h - wt / 2);
      this._placeBrickDecor(x, h + wt / 2);
    }
    for (let z = -h; z <= h; z += interval) {
      this._placeBrickDecor(-h - wt / 2, z, Math.PI / 2);
      this._placeBrickDecor(h + wt / 2, z, Math.PI / 2);
    }
  }

  _placeBrickDecor(x, z, rotY = 0) {
    const model = this.assets.cloneStatic('brickwall');
    if (!model) return;
    model.position.set(x, CONFIG.WALL_HEIGHT, z);
    model.rotation.y = rotY;
    model.scale.setScalar(1.2);
    this.scene.add(model);
    this.wallMeshes.push(model);
  }

  // === Arena ===

  _buildArena(arenaObjects) {
    const modelMap = {
      'Barrier_Fixed': 'barrier_fixed', 'Barrier_Large': 'barrier_large',
      'Barrier_Single': 'barrier_single', 'Barrier_Trash': 'barrier_trash',
      'SackTrench': 'sacktrench', 'SackTrench_Small': 'sacktrench_small',
      'Container_Small': 'container_small',
      'Container_Long': 'container_long', 'Crate': 'crate',
      'Debris_BrokenCar': 'debris_brokencar',
      'CardboardBoxes_1': 'cardboardboxes_1', 'CardboardBoxes_3': 'cardboardboxes_3',
      'Fence': 'fence', 'Fence_Long': 'fence_long', 'MetalFence': 'metalfence',
      'WoodPlanks': 'woodplanks', 'Sofa': 'sofa',
      'Pallet': 'pallet', 'Pallet_Broken': 'pallet_broken',
      'Pipes': 'pipes', 'GasCan': 'gascan', 'GasTank': 'gastank',
      'Sign': 'sign', 'WaterTank_Floor': 'watertank_floor',
      'Debris_Papers_1': 'debris_papers_1', 'Debris_Papers_2': 'debris_papers_2',
      'Debris_Pile': 'debris_pile', 'Debris_Tires': 'debris_tires',
      'Tree_1': 'tree_1', 'Tree_2': 'tree_2', 'Tree_3': 'tree_3', 'Tree_4': 'tree_4',
      'TrafficCone': 'trafficcone', 'StreetLight': 'streetlight',
      'Structure_1': 'structure_1', 'Structure_2': 'structure_2',
      'Structure_3': 'structure_3', 'Structure_4': 'structure_4',
      'Tank': 'tank',
    };

    const placeWithCollider = (obj) => {
      const key = modelMap[obj.m];
      if (!key) return;
      const model = this.assets.cloneStatic(key);
      if (!model) return;
      model.position.set(obj.p[0], obj.p[1], obj.p[2]);
      model.rotation.y = obj.r || 0;
      this.scene.add(model);
      this.arenaMeshes.push(model);
      this.coverColliders.push({
        position: new THREE.Vector3(obj.p[0], 0, obj.p[2]),
        radius: obj.collider || 1.5,
      });
    };

    for (const obj of arenaObjects.structure) placeWithCollider(obj);
    for (const obj of arenaObjects.cover) placeWithCollider(obj);

    for (const pos of arenaObjects.barrels) {
      this.barrels.push(new ExplodingBarrel(this.scene, this.assets, pos));
      this.coverColliders.push({ position: new THREE.Vector3(pos[0], 0, pos[2]), radius: CONFIG.BARREL_RADIUS });
    }

    for (const obj of arenaObjects.decor) {
      const key = modelMap[obj.m];
      if (!key) continue;
      const model = this.assets.cloneStatic(key);
      if (!model) continue;
      model.position.set(obj.p[0], obj.p[1] || 0, obj.p[2]);
      this.scene.add(model);
      this.arenaMeshes.push(model);
    }
  }

  _clearArena() {
    for (const mesh of this.arenaMeshes) this.scene.remove(mesh);
    this.arenaMeshes = [];

    for (const mesh of this.wallMeshes) this.scene.remove(mesh);
    this.wallMeshes = [];

    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh = null;
    }

    for (const mesh of this.stripesMeshes) this.scene.remove(mesh);
    this.stripesMeshes = [];

    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies = [];
    for (const p of this.projectiles) p.dispose(this.scene);
    this.projectiles = [];
    for (const pk of this.pickups) pk.dispose(this.scene);
    this.pickups = [];
    for (const b of this.barrels) {
      if (b.mesh) this.scene.remove(b.mesh);
    }
    this.barrels = [];
    this.coverColliders = [];
  }

  _applyLevelConfig(levelConfig) {
    this.scene.background.set(levelConfig.background);
    this.scene.fog.color.set(levelConfig.fog.color);
    this.scene.fog.near = levelConfig.fog.near;
    this.scene.fog.far = levelConfig.fog.far;

    this.hemiLight.color.set(levelConfig.hemi.sky);
    this.hemiLight.groundColor.set(levelConfig.hemi.ground);
    this.hemiLight.intensity = levelConfig.hemi.intensity;

    this.dirLight.color.set(levelConfig.dir.color);
    this.dirLight.intensity = levelConfig.dir.intensity;

    this.fillLight.color.set(levelConfig.fill.color);
    this.fillLight.intensity = levelConfig.fill.intensity;
  }

  // === Game flow ===

  _startGame() {
    this.sound.resume();
    this.player = new Player(this.scene, this.assets);
    this.score = 0;
    this.multiplier = 1;
    this.streakTimer = 0;
    this.totalKills = 0;
    this.gameStartTime = performance.now() / 1000;
    this.currentLevel = 1;
    this.waveManager = new WaveManager();
    this.waveManager.wave = 0;
    this.waveManager.startBreak();
    this.waveManager.breakTimer = 2;
    this.state = 'PLAYING';
    this.ui.showScreen('playing');
    this.ui.showWaveBanner(1, 'Urban Warfare');
    this._spawnPickups();

    for (const b of this.barrels) {
      if (!b.alive && b.mesh) {
        b.alive = true;
        this.scene.add(b.mesh);
      }
    }
  }

  _restartGame() {
    this.sound.stopMusic(0);

    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies = [];
    for (const p of this.projectiles) p.dispose(this.scene);
    this.projectiles = [];
    for (const pk of this.pickups) pk.dispose(this.scene);
    this.pickups = [];
    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player = null;
    }

    this.cinematic.cleanup();
    this.ui.hideStatsScreen();
    this.ui.hideDialogueOverlay();
    this.ui.fadeFromBlack();
    this.ui.hideLevelTitle();

    // Rebuild urban arena if currently on desert
    if (this.currentLevel === 2) {
      this._clearArena();
      this.currentLevel = 1;
      this._applyLevelConfig(LEVEL_CONFIGS[1]);
      this._createGround('urban');
      this._createWalls();
      this._buildArena(ARENA_OBJECTS);
    } else {
      for (const b of this.barrels) {
        if (!b.alive) {
          b.alive = true;
          if (b.mesh) this.scene.add(b.mesh);
        }
      }
    }

    this.timeScale = 1;
    this.slowMoTimer = 0;
    this.shakeIntensity = 0;
    this.totalKills = 0;
    this.score = 0;

    // Restart with intro cinematic
    this.state = 'INTRO_CINEMATIC';
    this.ui.showScreen('cinematic');
    this.sound.startDialogueMusic();
    this.cinematic.startDialogue('intro', this.scene, this.assets, this.camera, this.sound, this.ui, () => {
      this.sound.stopMusic(1500);
      setTimeout(() => this.sound.startCombatMusic(), 1600);
      this._startGame();
    });
  }

  _startLevelTransition() {
    this.state = 'LEVEL_TRANSITION';
    this.sound.stopMusic(1000);

    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player = null;
    }

    this.cinematic.startLevelTransition(this.ui, this.sound,
      // midCallback — screen is black, swap arena
      () => {
        this._clearArena();
        this.currentLevel = 2;
        const config = LEVEL_CONFIGS[2];
        this._applyLevelConfig(config);
        this._createGround('desert');
        this._createWalls();
        this._buildArena(config.arenaObjects);
      },
      // doneCallback — fade-in complete, resume play
      () => {
        this.player = new Player(this.scene, this.assets);
        this.waveManager.wave = 1;
        this.waveManager.startBreak();
        this.waveManager.breakTimer = 3;
        this.sound.startCombatMusic();
        this.state = 'PLAYING';
        this.ui.showScreen('playing');
        this.ui.showWaveBanner(2, 'Desert Storm');
        this._spawnPickups();
      }
    );
  }

  _startVictoryCinematic() {
    this.state = 'VICTORY_CINEMATIC';
    this.sound.stopMusic(1000);
    this.sound.victory();
    setTimeout(() => this.sound.startDialogueMusic(), 1200);

    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies = [];
    for (const p of this.projectiles) p.dispose(this.scene);
    this.projectiles = [];
    for (const pk of this.pickups) pk.dispose(this.scene);
    this.pickups = [];
    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player = null;
    }

    this.ui.showScreen('cinematic');
    this.cinematic.startDialogue('victory', this.scene, this.assets, this.camera, this.sound, this.ui, () => {
      this._showStatsScreen();
    });
  }

  _showStatsScreen() {
    this.state = 'STATS';
    this.ui.showScreen('stats');
    const elapsed = performance.now() / 1000 - this.gameStartTime;
    this.ui.showStatsScreen({
      score: this.score,
      kills: this.totalKills,
      waves: 2,
      time: elapsed,
    });
  }

  _togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.ui.showScreen('paused');
      this.sound.pauseMusic();
      this.clock.stop();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.ui.showScreen('playing');
      this.sound.resumeMusic();
      this.clock.start();
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _worldToScreen(pos) {
    this._tempVec.copy(pos);
    this._tempVec.project(this.camera);
    return {
      x: (this._tempVec.x + 1) / 2 * window.innerWidth,
      y: (-this._tempVec.y + 1) / 2 * window.innerHeight,
    };
  }

  _shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  _fireWeapon() {
    if (!this.player.alive || this.player.fireCooldown > 0) return;
    const stats = this.player.getWeaponStats();
    this.player.fireCooldown = stats.fireRate;

    const dir = new THREE.Vector3(
      Math.sin(this.player.mesh.rotation.y),
      0,
      Math.cos(this.player.mesh.rotation.y)
    );

    const wep = this.player.currentWeapon;
    if (wep === 'Shotgun') this.sound.shotgunBlast();
    else if (wep === 'Sniper') this.sound.sniperShot();
    else if (wep === 'RocketLauncher') this.sound.rocketFire();
    else this.sound.gunshot();

    const muzzlePos = this.player.position.clone().add(dir.clone().multiplyScalar(0.8));
    this.particles.burst(muzzlePos.x, 0.9, muzzlePos.z, 0xffcc00, 3, 2, 0.15, 0.8);

    for (let i = 0; i < stats.count; i++) {
      const spread = (Math.random() - 0.5) * 2 * stats.spread;
      const projDir = dir.clone();
      projDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      const proj = new Projectile(this.scene, this.player.position, projDir, stats);
      this.projectiles.push(proj);
    }

    if (wep === 'Shotgun') this._shake(0.15);
    else if (wep === 'RocketLauncher') this._shake(0.2);
    else if (wep === 'Sniper') this._shake(0.12);
  }

  _spawnPickups() {
    const angle1 = Math.random() * Math.PI * 2;
    const r1 = 5 + Math.random() * 15;
    this.pickups.push(new Pickup(this.scene, this.assets, 'health', null,
      new THREE.Vector3(Math.cos(angle1) * r1, 0, Math.sin(angle1) * r1)));

    const weaponKeys = Object.keys(CONFIG.WEAPONS).filter(k => k !== 'Pistol');
    const randomWeapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    const angle2 = Math.random() * Math.PI * 2;
    const r2 = 5 + Math.random() * 15;
    this.pickups.push(new Pickup(this.scene, this.assets, 'weapon', randomWeapon,
      new THREE.Vector3(Math.cos(angle2) * r2, 0, Math.sin(angle2) * r2)));
  }

  _updateCollisions(dt) {
    const player = this.player;
    if (!player.alive) return;

    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (!proj.alive) continue;

      for (const enemy of this.enemies) {
        if (enemy.dying || proj.hitEnemies.has(enemy)) continue;
        const d = distXZ(proj.mesh.position, enemy.position);
        if (d < CONFIG.PROJECTILE_RADIUS + enemy.radius) {
          this.sound.hit();
          const killed = enemy.takeDamage(proj.damage);
          this.particles.burst(proj.mesh.position.x, 0.8, proj.mesh.position.z, 0xffffff, 4, 3, 0.3);

          if (killed) {
            this._onEnemyKilled(enemy);
          }

          if (proj.piercing) {
            proj.hitEnemies.add(enemy);
          } else if (proj.explosive) {
            this._explodeAt(proj.mesh.position);
            proj.alive = false;
          } else {
            proj.alive = false;
          }
          break;
        }
      }

      if (proj.alive) {
        for (const barrel of this.barrels) {
          if (!barrel.alive) continue;
          const d = distXZ(proj.mesh.position, barrel.position);
          if (d < CONFIG.PROJECTILE_RADIUS + barrel.radius) {
            barrel.explode(this.scene, this.particles, this.sound, this.enemies, player);
            this._shake(0.4);
            proj.alive = false;
            break;
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      const d = distXZ(player.position, enemy.position);
      if (d < CONFIG.PLAYER_RADIUS + enemy.radius) {
        if (enemy.contactCooldown <= 0 && player.contactCooldown <= 0) {
          player.takeDamage(enemy.damage);
          player.contactCooldown = CONFIG.ENEMY_CONTACT_COOLDOWN;
          enemy.contactCooldown = CONFIG.ENEMY_CONTACT_COOLDOWN;
          this.sound.playerHit();
          this.ui.flashDamage();
          this._shake(0.2);

          const kb = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
          player.position.x += kb.x * 1.5;
          player.position.z += kb.z * 1.5;

          if (!player.alive) {
            this._onPlayerDeath();
          }
        }

        const push = new THREE.Vector3().subVectors(enemy.position, player.position).normalize();
        enemy.position.x += push.x * 0.5;
        enemy.position.z += push.z * 0.5;
      }
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      const d = distXZ(player.position, pk.position);
      if (d < CONFIG.PICKUP_COLLECT_RADIUS) {
        this.sound.pickup();
        if (pk.type === 'health') {
          player.heal(CONFIG.HEALTH_RESTORE);
          const sp = this._worldToScreen(pk.position);
          this.ui.floatingText(sp.x, sp.y, `+${CONFIG.HEALTH_RESTORE} HP`, '#44ff44', 22);
        } else {
          player.setWeapon(pk.weaponKey);
          const sp = this._worldToScreen(pk.position);
          this.ui.floatingText(sp.x, sp.y, pk.weaponKey, '#44aaff', 24);
        }
        pk.dispose(this.scene);
        this.pickups.splice(i, 1);
      }
    }

    for (const c of this.coverColliders) {
      const barrel = this.barrels.find(b => b.position.equals(c.position));
      if (barrel && !barrel.alive) continue;

      const pd = distXZ(player.position, c.position);
      if (pd < CONFIG.PLAYER_RADIUS + c.radius) {
        const pushDir = new THREE.Vector3().subVectors(player.position, c.position).normalize();
        const overlap = CONFIG.PLAYER_RADIUS + c.radius - pd;
        player.position.x += pushDir.x * overlap;
        player.position.z += pushDir.z * overlap;
      }

      for (const enemy of this.enemies) {
        if (enemy.dying) continue;
        const ed = distXZ(enemy.position, c.position);
        if (ed < enemy.radius + c.radius) {
          const pushDir = new THREE.Vector3().subVectors(enemy.position, c.position).normalize();
          const overlap = enemy.radius + c.radius - ed;
          enemy.position.x += pushDir.x * overlap;
          enemy.position.z += pushDir.z * overlap;
        }
      }
    }
  }

  _explodeAt(pos) {
    this.particles.burst(pos.x, 0.5, pos.z, 0xff4400, 16, 7, 0.7, 2);
    this.particles.burst(pos.x, 0.5, pos.z, 0xffcc00, 10, 4, 0.5, 1.5);
    this.sound.explosion();
    this._shake(0.35);

    const r = CONFIG.WEAPONS.RocketLauncher.explosionRadius;
    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      const d = distXZ(pos, enemy.position);
      if (d < r) {
        const dmg = CONFIG.WEAPONS.RocketLauncher.damage * (1 - d / r * 0.5);
        const killed = enemy.takeDamage(dmg);
        if (killed) this._onEnemyKilled(enemy);
      }
    }
    const pd = distXZ(pos, this.player.position);
    if (pd < r) {
      this.player.takeDamage(20 * (1 - pd / r));
      this.ui.flashDamage();
    }
  }

  _onEnemyKilled(enemy) {
    this.sound.enemyDeath();
    this.particles.burst(enemy.position.x, 0.5, enemy.position.z, 0xff2222, 10, 5, 0.6, 1.2);
    this.totalKills++;

    this.streakTimer = CONFIG.STREAK_TIME;
    const points = Math.floor(CONFIG.SCORE_PER_KILL * this.multiplier);
    this.score += points;
    this.multiplier += 0.5;

    const sp = this._worldToScreen(enemy.position);
    this.ui.floatingText(sp.x, sp.y, `+${points}`, '#ffcc00', 22);
    if (this.multiplier > 1.5) {
      this.ui.floatingText(sp.x, sp.y - 25, `x${this.multiplier.toFixed(1)}`, '#ff6b6b', 16);
    }

    const aliveCount = this.enemies.filter(e => !e.dying && e !== enemy).length;
    const pendingSpawn = this.waveManager.enemiesToSpawn;
    if (aliveCount === 0 && pendingSpawn === 0 && this.waveManager.state === 'ACTIVE') {
      this.timeScale = 0.3;
      this.slowMoTimer = 0.5;
    }
  }

  _onPlayerDeath() {
    this.state = 'GAME_OVER';
    this.sound.stopMusic(500);
    this._shake(0.5);
    this.particles.burst(this.player.position.x, 0.5, this.player.position.z, 0xff0000, 15, 6, 0.8, 2);
    this.ui.flashDamage();
    setTimeout(() => {
      this.ui.showGameOver(this.score, this.currentLevel);
    }, 300);
  }

  // === Main loop ===

  _loop() {
    if (document.hidden) {
      setTimeout(() => this._loop(), 16);
    } else {
      requestAnimationFrame(() => this._loop());
    }

    if (this.state === 'LOADING') return;

    let dt = Math.min(this.clock.getDelta(), document.hidden ? 0.5 : 0.05);

    // Cinematic states — update cinematic + render
    if (this.state === 'INTRO_CINEMATIC' || this.state === 'VICTORY_CINEMATIC' || this.state === 'LEVEL_TRANSITION') {
      this.cinematic.update(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Non-gameplay states (MENU, PAUSED, STATS)
    if (this.state !== 'PLAYING' && this.state !== 'GAME_OVER') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // === GAMEPLAY ===
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) this.timeScale = 1;
    }
    const scaledDt = dt * this.timeScale;

    if (this.state === 'PLAYING') {
      const aimPoint = this.input.getAimPoint(this.camera);
      if (aimPoint) this.player.setAimTarget(aimPoint);
      this.player.update(scaledDt, this.input, this.camera);

      if (this.input.mouseDown) {
        this._fireWeapon();
      }

      if (this.streakTimer > 0) {
        this.streakTimer -= scaledDt;
        if (this.streakTimer <= 0) this.multiplier = 1;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (this.state === 'GAME_OVER') {
        enemy.anim.update(scaledDt);
        continue;
      }
      const remove = enemy.update(scaledDt, this.player.position, this.enemies);
      if (remove) {
        enemy.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(scaledDt);
      if (!proj.alive) {
        proj.dispose(this.scene);
        this.projectiles.splice(i, 1);
      }
    }

    for (const pk of this.pickups) pk.update(scaledDt);

    this.particles.update(scaledDt);

    if (this.state === 'PLAYING') {
      this._updateCollisions(scaledDt);
    }

    if (this.state === 'PLAYING') {
      const aliveEnemies = this.enemies.filter(e => !e.dying).length;
      const result = this.waveManager.update(scaledDt, aliveEnemies);

      switch (result.event) {
        case 'SPAWN': {
          const enemy = new Enemy(
            this.scene, this.assets, result.type,
            result.position, this.waveManager.getSpeedMultiplier()
          );
          this.enemies.push(enemy);
          break;
        }
        case 'WAVE_START': {
          break;
        }
        case 'WAVE_CLEAR': {
          if (this.currentLevel < 2) {
            this.ui.showWaveBanner(1, 'Level Complete!');
            this._startLevelTransition();
          } else {
            this.ui.showWaveBanner(2, 'Victory!');
            this._startVictoryCinematic();
          }
          break;
        }
      }
    }

    if (this.player) {
      this._cameraTarget.set(
        this.player.position.x + CONFIG.CAMERA_OFFSET[0],
        CONFIG.CAMERA_OFFSET[1],
        this.player.position.z + CONFIG.CAMERA_OFFSET[2]
      );
      this.camera.position.lerp(this._cameraTarget, CONFIG.CAMERA_LERP);
      this.camera.lookAt(this.player.position.x, 0, this.player.position.z);

      if (this.shakeIntensity > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
        this.shakeIntensity *= 0.88;
        if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
      }
    }

    if (this.player) {
      this.ui.updateHUD(
        this.score, this.multiplier,
        this.currentLevel,
        this.player.health, this.player.maxHealth,
        this.player.currentWeapon
      );
      this.ui.drawMinimap(this.player, this.enemies, this.pickups, this.barrels);
    }

    if (this.state === 'GAME_OVER' && this.player) {
      this.player.anim.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
