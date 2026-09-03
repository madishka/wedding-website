import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

/* Meshopt-compressed (gltf-transform optimize --compress meshopt) —
   a fraction of the original export's size. The decoder is pure JS
   bundled with three, no external wasm files to host. */
const MODEL_URL = "/soviet_canada_emblem.glb";

export type EmblemScene = {
  /** Y-axis rotation in radians. Call render() afterwards to see it. */
  setRotation(radians: number): void;
  render(): void;
  /** Re-fit the canvas to the wrapper; call on window resize. */
  resize(): void;
  /** Fires once the model is in the scene (immediately if it already is). */
  onLoad(callback: () => void): void;
  dispose(): void;
};

/**
 * The emblem, as a self-contained three.js scene rendered into a canvas
 * appended to `wrap`. Shared by the two places it appears — the public
 * root's hero (EmblemHero.tsx) and the RSVP section (EmblemRsvp.tsx) —
 * which differ only in what drives the rotation and when they render.
 *
 * Transparent canvas, so whatever is behind the wrapper shows through:
 * the hero's dark gradient in one case, the RSVP's white in the other.
 */
export function createEmblemScene(wrap: HTMLElement): EmblemScene | null {
  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  // WebGL is not guaranteed. Hardware acceleration switched off, an older
  // phone, a low-power mode, a browser under memory pressure — Safari in
  // particular refuses a context rather than falling back to software, and
  // three.js turns that refusal into a throw.
  //
  // Thrown from inside the effect that calls this, that throw unmounts the
  // React tree and the guest gets "Application error: a client-side
  // exception has occurred" instead of their invitation. An emblem that
  // cannot spin is worth losing; the invitation is not.
  //
  // Returning null lets both callers skip the scene and leave the page
  // otherwise intact.
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const hemi = new THREE.HemisphereLight(0xfff2d8, 0x3a2f14, 2.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2d8, 3.5);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd7ff, 1.5);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  const emblem = new THREE.Group();
  scene.add(emblem);

  let disposed = false;
  let loaded = false;
  const loadCallbacks: Array<() => void> = [];

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, (gltf) => {
    if (disposed) return;
    const model = gltf.scene;

    // The asset was authored lying flat (face pointing up the Y axis);
    // turn it 90° on Z so its face points at the camera before the
    // Y-axis spin takes over. The extra 180° on Y corrects it facing
    // away/backwards after that fix-up.
    model.rotation.x = Math.PI / 2;
    model.rotation.z = Math.PI;

    // Normalize scale so the model fills the frame consistently
    // regardless of how it was authored, then center it — in that
    // order, so the recentering measures (and cancels out) the model's
    // actual final centroid instead of its unscaled one. The sickle's
    // handle throws the geometric center off from (0,0,0), so centering
    // before scaling left a residual offset proportional to the scale
    // factor: it visibly rotated around the handle rather than the
    // emblem's true center.
    const rawSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
    model.scale.setScalar(2.4 / maxDim);

    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.position.sub(center);

    emblem.add(model);
    loaded = true;
    loadCallbacks.splice(0).forEach((cb) => cb());
  });

  function resize() {
    const width = wrap.clientWidth || 400;
    const height = wrap.clientHeight || 400;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();

  return {
    setRotation(radians) {
      emblem.rotation.y = radians;
    },
    render() {
      if (!disposed) renderer.render(scene, camera);
    },
    resize,
    onLoad(callback) {
      if (loaded) callback();
      else loadCallbacks.push(callback);
    },
    dispose() {
      disposed = true;
      renderer.dispose();
      if (canvas.parentNode === wrap) wrap.removeChild(canvas);
    },
  };
}
