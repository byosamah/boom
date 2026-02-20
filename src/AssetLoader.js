import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export default class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  async loadAll(manifest, onProgress) {
    const entries = Object.entries(manifest);
    let loaded = 0;
    const promises = entries.map(([key, path]) =>
      new Promise((resolve, reject) => {
        this.loader.load(path,
          (gltf) => { this.cache.set(key, gltf); loaded++; onProgress(loaded / entries.length); resolve(); },
          undefined,
          (err) => { console.warn(`Failed to load ${key}:`, err); loaded++; onProgress(loaded / entries.length); resolve(); }
        );
      })
    );
    await Promise.all(promises);
  }

  getGLTF(key) { return this.cache.get(key); }

  cloneCharacter(key) {
    const gltf = this.cache.get(key);
    if (!gltf) return null;
    const clone = SkeletonUtils.clone(gltf.scene);
    clone.traverse(c => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        if (Array.isArray(c.material)) {
          c.material = c.material.map(m => m.clone());
        } else if (c.material) {
          c.material = c.material.clone();
        }
      }
    });
    return { scene: clone, animations: gltf.animations };
  }

  cloneStatic(key) {
    const gltf = this.cache.get(key);
    if (!gltf) return null;
    const clone = gltf.scene.clone();
    clone.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return clone;
  }
}
