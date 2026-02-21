export const CONFIG = {
  PLAYER_SPEED: 8,
  PLAYER_HEALTH: 100,
  PLAYER_RADIUS: 0.6,

  WEAPONS: {
    Pistol:         { fireRate: 0.3,  damage: 15, spread: 0,    speed: 30, count: 1, piercing: false, explosive: false, name: 'Pistol' },
    Shotgun:        { fireRate: 0.8,  damage: 12, spread: 0.15, speed: 25, count: 5, piercing: false, explosive: false, name: 'Shotgun' },
    AK:             { fireRate: 0.15, damage: 20, spread: 0.03, speed: 35, count: 1, piercing: false, explosive: false, name: 'AK' },
    SMG:            { fireRate: 0.08, damage: 8,  spread: 0.05, speed: 30, count: 1, piercing: false, explosive: false, name: 'SMG' },
    Sniper:         { fireRate: 1.2,  damage: 80, spread: 0,    speed: 50, count: 1, piercing: true,  explosive: false, name: 'Sniper' },
    RocketLauncher: { fireRate: 1.5,  damage: 60, spread: 0,    speed: 20, count: 1, piercing: false, explosive: true, explosionRadius: 5, name: 'RocketLauncher' },
  },

  ENEMY_TYPES: {
    basic:  { speed: 3.5, health: 30,  damage: 10, radius: 0.5, model: 'Character_Enemy', scale: 1 },
    hazmat: { speed: 2.2, health: 120, damage: 25, radius: 0.7, model: 'Character_Hazmat', scale: 1.15 },
  },

  WAVE_BASE_ENEMIES: 15,
  WAVE_ENEMY_INCREMENT: 5,
  WAVE_SPEED_SCALE: 0.15,
  WAVE_BREAK_DURATION: 3,
  HAZMAT_START_WAVE: 2,
  BOSS_WAVE_INTERVAL: 5,

  ARENA_HALF: 28,
  WALL_HEIGHT: 3.5,
  WALL_THICKNESS: 2,

  PICKUP_BOB_SPEED: 2,
  PICKUP_BOB_HEIGHT: 0.3,
  PICKUP_COLLECT_RADIUS: 1.8,
  HEALTH_RESTORE: 30,

  PROJECTILE_RADIUS: 0.12,
  PROJECTILE_MAX_DIST: 50,

  BARREL_RADIUS: 0.7,
  BARREL_EXPLOSION_RADIUS: 5,
  BARREL_EXPLOSION_DAMAGE: 50,

  CAMERA_OFFSET: [0, 18, 14],
  CAMERA_LERP: 0.07,

  SCORE_PER_KILL: 100,
  STREAK_TIME: 2.5,

  ENEMY_SEPARATION: 2.0,
  ENEMY_SEP_FORCE: 8,
  ENEMY_CONTACT_COOLDOWN: 0.8,
  ENEMY_SPEED_VARIANCE: 0.4,

  PARTICLE_POOL_SIZE: 120,
};

// Analytics tracking configuration
// Toggle categories on/off to control what gets collected
export const TRACKING = {
  enabled: true,                // Master switch — set false to disable all tracking
  buffer_flush_interval: 5,     // Seconds between localStorage writes
  sync_interval: 30,            // Seconds between server syncs (Phase 2)
  max_local_events: 5000,       // Cap to stay within ~2MB localStorage budget
  game: 'boom',
  version: '1.0.0',
  categories: {
    SESSION: true,              // Game start/end, pause/resume (always recommended)
    GAMEPLAY: true,             // Kills, damage, pickups, level events
    CINEMATIC: true,            // Dialogue choices, cinematic skips
    ENGAGEMENT: true,           // Tab visibility, idle detection
    POSITION: false,            // Player position every 2s (high volume — off by default)
  }
};

export const WEAPON_BONE_NAMES = ['AK','GrenadeLauncher','Knife_1','Knife_2','Pistol','Revolver','Revolver_Small','RocketLauncher','ShortCannon','Shotgun','Shovel','SMG','Sniper','Sniper_2'];

export const ARENA_OBJECTS = {
  structure: [
    { m: 'Container_Long', p: [-11,0,-18], r: 0, collider: 3.0 },
    { m: 'Container_Long', p: [-11,0,18], r: Math.PI, collider: 3.0 },
    { m: 'Container_Long', p: [11,0,-16], r: 0.1, collider: 3.0 },
    { m: 'Container_Long', p: [11,0,16], r: -0.1, collider: 3.0 },
    { m: 'Debris_BrokenCar', p: [-18,0,-11], r: 0.3, collider: 2.5 },
    { m: 'Debris_BrokenCar', p: [18,0,-11], r: -0.4, collider: 2.5 },
    { m: 'Debris_BrokenCar', p: [-18,0,11], r: 2.8, collider: 2.5 },
    { m: 'Container_Small', p: [18,0,14], r: 0.5, collider: 2.0 },
    { m: 'Container_Small', p: [-16,0,-20], r: 0.8, collider: 2.0 },
    { m: 'Container_Small', p: [20,0,-16], r: -0.3, collider: 2.0 },
  ],
  cover: [
    { m: 'Barrier_Large', p: [-4,0,-14], r: 0, collider: 1.5 },
    { m: 'Barrier_Large', p: [4,0,14], r: Math.PI, collider: 1.5 },
    { m: 'Barrier_Single', p: [3,0,-6], r: 0.3, collider: 0.8 },
    { m: 'Barrier_Single', p: [-3,0,6], r: -0.3, collider: 0.8 },
    { m: 'SackTrench', p: [0,0,-20], r: 0, collider: 1.5 },
    { m: 'SackTrench', p: [0,0,20], r: Math.PI, collider: 1.5 },
    { m: 'Barrier_Fixed', p: [-14,0,-3], r: Math.PI/2, collider: 1.2 },
    { m: 'Barrier_Fixed', p: [14,0,3], r: -Math.PI/2, collider: 1.2 },
    { m: 'Barrier_Trash', p: [-22,0,4], r: 0.2, collider: 1.0 },
    { m: 'Barrier_Trash', p: [22,0,-4], r: -0.2, collider: 1.0 },
    { m: 'MetalFence', p: [-14,0,-14], r: 0.4, collider: 1.2 },
    { m: 'MetalFence', p: [-20,0,-14], r: -0.2, collider: 1.2 },
    { m: 'Pallet_Broken', p: [-22,0,-18], r: 0.6, collider: 0.6 },
    { m: 'Crate', p: [-14,0,-22], r: 0.3, collider: 0.8 },
    { m: 'Crate', p: [-12,0,-24], r: 0.8, collider: 0.8 },
    { m: 'Barrier_Fixed', p: [14,0,-14], r: 0, collider: 1.2 },
    { m: 'Barrier_Fixed', p: [22,0,-18], r: Math.PI, collider: 1.2 },
    { m: 'SackTrench', p: [16,0,-22], r: 0.5, collider: 1.5 },
    { m: 'Fence', p: [24,0,-14], r: 0, collider: 1.0 },
    { m: 'CardboardBoxes_1', p: [18,0,-24], r: 0, collider: 0.7 },
    { m: 'Crate', p: [14,0,18], r: 0.2, collider: 0.8 },
    { m: 'Crate', p: [16,0,20], r: 0.7, collider: 0.8 },
    { m: 'CardboardBoxes_3', p: [22,0,18], r: 0, collider: 0.7 },
    { m: 'CardboardBoxes_1', p: [24,0,22], r: 0.3, collider: 0.7 },
    { m: 'Pallet', p: [14,0,24], r: 0, collider: 0.6 },
    { m: 'Fence_Long', p: [20,0,24], r: Math.PI/2, collider: 1.5 },
    { m: 'Sofa', p: [-14,0,16], r: 1.2, collider: 1.0 },
    { m: 'Barrier_Trash', p: [-20,0,14], r: 0.8, collider: 1.0 },
    { m: 'Fence', p: [-16,0,22], r: 0.3, collider: 1.0 },
    { m: 'Fence', p: [-22,0,20], r: -0.5, collider: 1.0 },
    { m: 'WoodPlanks', p: [-24,0,16], r: 0.4, collider: 0.5 },
    { m: 'CardboardBoxes_3', p: [-14,0,24], r: 0, collider: 0.7 },
  ],
  barrels: [
    [5,0,5], [-5,0,-5], [-5,0,5], [5,0,-5],
    [3,0,-16], [-3,0,16],
    [-16,0,3], [16,0,-3],
    [-16,0,-16], [20,0,-20], [20,0,20], [-20,0,20],
  ],
  decor: [
    { m: 'Tree_1', p: [25,0,25] },
    { m: 'Tree_2', p: [-25,0,25] },
    { m: 'Tree_3', p: [25,0,-25] },
    { m: 'Tree_4', p: [-25,0,-25] },
    { m: 'Tree_1', p: [26,0,-18] },
    { m: 'Tree_2', p: [-26,0,18] },
    { m: 'StreetLight', p: [-9,0,-12] },
    { m: 'StreetLight', p: [9,0,12] },
    { m: 'StreetLight', p: [-12,0,9] },
    { m: 'StreetLight', p: [12,0,-9] },
    { m: 'StreetLight', p: [0,0,-26] },
    { m: 'StreetLight', p: [0,0,26] },
    { m: 'StreetLight', p: [-26,0,0] },
    { m: 'StreetLight', p: [26,0,0] },
    { m: 'TrafficCone', p: [-7,0,-4] },
    { m: 'TrafficCone', p: [7,0,4] },
    { m: 'TrafficCone', p: [-4,0,7] },
    { m: 'TrafficCone', p: [4,0,-7] },
    { m: 'TrafficCone', p: [6,0,-12] },
    { m: 'TrafficCone', p: [-6,0,12] },
    { m: 'Debris_Tires', p: [-24,0,-22] },
    { m: 'Debris_Pile', p: [-18,0,-24] },
    { m: 'Pipes', p: [-22,0,-16] },
    { m: 'GasCan', p: [-16,0,-18] },
    { m: 'Sign', p: [14,0,-12] },
    { m: 'Debris_Papers_1', p: [20,0,-22] },
    { m: 'GasCan', p: [16,0,-16] },
    { m: 'Pipes', p: [24,0,16] },
    { m: 'GasTank', p: [22,0,24] },
    { m: 'Debris_Papers_2', p: [16,0,22] },
    { m: 'WaterTank_Floor', p: [26,0,20] },
    { m: 'Debris_Papers_1', p: [-18,0,22] },
    { m: 'Debris_Pile', p: [-24,0,18] },
    { m: 'WoodPlanks', p: [-20,0,24] },
  ],
};

export const DESERT_ARENA_OBJECTS = {
  structure: [
    { m: 'Container_Small', p: [-14,0,-16], r: 0.2, collider: 2.0 },
    { m: 'Container_Small', p: [14,0,16], r: -0.3, collider: 2.0 },
    { m: 'Container_Long', p: [0,0,-22], r: Math.PI/2, collider: 3.0 },
    { m: 'Debris_BrokenCar', p: [-20,0,10], r: 0.5, collider: 2.5 },
    { m: 'Debris_BrokenCar', p: [18,0,-12], r: -0.3, collider: 2.5 },
    { m: 'Structure_1', p: [-18,0,-18], r: 0, collider: 2.5 },
    { m: 'Structure_2', p: [18,0,18], r: Math.PI, collider: 2.5 },
    { m: 'Tank', p: [22,0,-6], r: -0.8, collider: 3.0 },
  ],
  cover: [
    { m: 'SackTrench', p: [-6,0,-10], r: 0, collider: 1.5 },
    { m: 'SackTrench', p: [6,0,10], r: Math.PI, collider: 1.5 },
    { m: 'SackTrench', p: [-10,0,6], r: Math.PI/2, collider: 1.5 },
    { m: 'SackTrench', p: [10,0,-6], r: -Math.PI/2, collider: 1.5 },
    { m: 'SackTrench_Small', p: [0,0,-14], r: 0.3, collider: 1.0 },
    { m: 'SackTrench_Small', p: [0,0,14], r: -0.3, collider: 1.0 },
    { m: 'Barrier_Fixed', p: [-14,0,0], r: Math.PI/2, collider: 1.2 },
    { m: 'Barrier_Fixed', p: [14,0,0], r: -Math.PI/2, collider: 1.2 },
    { m: 'Barrier_Single', p: [-4,0,18], r: 0.2, collider: 0.8 },
    { m: 'Barrier_Single', p: [4,0,-18], r: -0.2, collider: 0.8 },
    { m: 'Crate', p: [-16,0,-10], r: 0.4, collider: 0.8 },
    { m: 'Crate', p: [16,0,10], r: -0.4, collider: 0.8 },
    { m: 'Crate', p: [-18,0,-8], r: 0.1, collider: 0.8 },
  ],
  barrels: [
    [4,0,4], [-4,0,-4], [-4,0,4], [4,0,-4],
    [-12,0,-14], [12,0,14],
    [20,0,0], [-20,0,0],
    [-16,0,18], [16,0,-18], [22,0,22], [-22,0,-22],
  ],
  decor: [
    { m: 'GasCan', p: [-20,0,-16] },
    { m: 'GasCan', p: [20,0,16] },
    { m: 'GasCan', p: [-8,0,22] },
    { m: 'Pipes', p: [16,0,-20] },
    { m: 'Pipes', p: [-16,0,20] },
    { m: 'Sign', p: [24,0,0] },
    { m: 'Sign', p: [-24,0,0] },
    { m: 'Sign', p: [0,0,24] },
    { m: 'Debris_Papers_1', p: [22,0,-18] },
    { m: 'Debris_Papers_2', p: [-22,0,18] },
    { m: 'Debris_Pile', p: [-24,0,-24] },
    { m: 'Debris_Pile', p: [24,0,24] },
    { m: 'Debris_Tires', p: [24,0,-24] },
    { m: 'WaterTank_Floor', p: [-24,0,24] },
    { m: 'TrafficCone', p: [-10,0,2] },
    { m: 'TrafficCone', p: [10,0,-2] },
  ],
};

export const LEVEL_CONFIGS = {
  1: {
    name: 'Urban Warfare',
    ground: 'urban',
    arenaObjects: ARENA_OBJECTS,
    background: 0x1a1a2e,
    fog: { color: 0x1a1a2e, near: 40, far: 65 },
    hemi: { sky: 0xb1e1ff, ground: 0x886644, intensity: 1.2 },
    dir: { color: 0xfff4e6, intensity: 1.8 },
    fill: { color: 0x8888ff, intensity: 0.3 },
    waveNum: 1,
  },
  2: {
    name: 'Desert Storm',
    ground: 'desert',
    arenaObjects: DESERT_ARENA_OBJECTS,
    background: 0x2a1f0e,
    fog: { color: 0x2a1f0e, near: 35, far: 60 },
    hemi: { sky: 0xffe4b5, ground: 0x8b7355, intensity: 1.5 },
    dir: { color: 0xffa500, intensity: 2.2 },
    fill: { color: 0xffcc88, intensity: 0.4 },
    waveNum: 2,
  },
};

export const DIALOGUE = {
  intro: [
    { type:'line', speaker:'SGT. REYES', text:'Command just confirmed it. Jordan\'s border is compromised \u2014 hostiles pouring through the eastern corridor.', camera:'wide' },
    { type:'line', speaker:'SGT. REYES', text:'They\'re sending us in. Just us. No backup for at least six hours.', camera:'closeS1' },
    { type:'choice', speaker:'YOU', options: [
      { text:'Six hours? We\'ve handled worse.', next:'confident' },
      { text:'Just the two of us? That\'s insane.', next:'reluctant' },
    ]},
    { type:'line', id:'confident', speaker:'SGT. REYES', text:'Ha. That\'s the spirit. Keep that energy when they start flanking.', camera:'closeS1' },
    { type:'goto', target:'converge1' },
    { type:'line', id:'reluctant', speaker:'SGT. REYES', text:'Insane is what they trained us for, Corporal. You didn\'t sign up for easy.', camera:'closeS1' },
    { type:'line', id:'converge1', speaker:'SGT. REYES', text:'Intel says a strike force is heading straight for us. This is the real deal.', camera:'wide' },
    { type:'line', speaker:'SGT. REYES', text:'This intersection is the choke point. We hold here, we hold everything.', camera:'closeS1' },
    { type:'choice', speaker:'YOU', options: [
      { text:'What\'s our weapon situation?', next:'weapons' },
      { text:'And if we can\'t hold it?', next:'canthold' },
    ]},
    { type:'line', id:'weapons', speaker:'SGT. REYES', text:'Standard loadout plus whatever we find in the field. Grab any weapon drops you see.', camera:'closeS1' },
    { type:'goto', target:'converge2' },
    { type:'line', id:'canthold', speaker:'SGT. REYES', text:'Then the whole eastern front collapses. No pressure.', camera:'closeS1' },
    { type:'line', id:'converge2', speaker:'SGT. REYES', text:'Listen \u2014 first assault is urban combat. Street fighting, close quarters.', camera:'wide' },
    { type:'line', speaker:'SGT. REYES', text:'If we survive that... we push east into the desert for the final fight. That\'s where it gets real ugly.', camera:'closeS1' },
    { type:'line', speaker:'SGT. REYES', text:'*checks rifle* They\'re coming. I can hear them.', camera:'wide' },
    { type:'choice', speaker:'YOU', options: [
      { text:'Let\'s make every shot count.', next:'ready1' },
      { text:'BOOM time.', next:'ready2' },
    ]},
    { type:'line', id:'ready1', speaker:'SGT. REYES', text:'Damn right. Lock and load, Corporal.', camera:'closeS1' },
    { type:'goto', target:'end_converge' },
    { type:'line', id:'ready2', speaker:'SGT. REYES', text:'*smirks* Now THAT\'S a war cry. Let\'s go!', camera:'closeS1' },
    { type:'line', id:'end_converge', speaker:'SGT. REYES', text:'MOVE! MOVE! MOVE!', camera:'wide' },
    { type:'end' },
  ],
  victory: [
    { type:'line', speaker:'SGT. REYES', text:'*breathing heavy* ...That was the last of them.', camera:'wide' },
    { type:'line', speaker:'SGT. REYES', text:'You did it, Corporal. The eastern corridor is secure.', camera:'closeS1' },
    { type:'choice', speaker:'YOU', options: [
      { text:'WE did it, Sergeant.', next:'humble' },
      { text:'Was there ever any doubt?', next:'cocky' },
    ]},
    { type:'line', id:'humble', speaker:'SGT. REYES', text:'Yeah... yeah, we did. I\'ll make sure command knows what you did here today.', camera:'closeS1' },
    { type:'goto', target:'vconverge' },
    { type:'line', id:'cocky', speaker:'SGT. REYES', text:'*laughs* Plenty of doubt. But you proved every last one of \'em wrong.', camera:'closeS1' },
    { type:'line', id:'vconverge', speaker:'SGT. REYES', text:'Backup\'s inbound. ETA two minutes. Our job here is done.', camera:'wide' },
    { type:'line', speaker:'SGT. REYES', text:'Outstanding work, soldier. Outstanding.', camera:'closeS1' },
    { type:'end' },
  ],
};
