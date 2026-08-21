"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * The public root's hero mark: the emblem GLB, slowly and continuously
 * spinning on its Y axis. Transparent canvas, so `.hero-bg-plain` (see
 * globals.css) shows through behind it exactly as it does behind the
 * text it replaces.
 */
export function EmblemHero() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const canvas = document.createElement("canvas");
    wrap.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
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

    const loader = new GLTFLoader();
    let disposed = false;
    loader.load("/soviet_canada_emblem.glb", (gltf) => {
      if (disposed) return;

      const model = gltf.scene;

      // The asset was authored lying flat (face pointing up the Y
      // axis); turn it 90° on Z so its face points at the camera
      // before the continuous Y-axis spin takes over. The extra 180°
      // on Y corrects it facing away/backwards after that fix-up.
      model.rotation.x = Math.PI / 2;

      // Center the model on its own origin and normalize its scale so
      // it fills the frame consistently regardless of how it was
      // authored. Computed after the fix-up rotation above, so the
      // box reflects the model's actual on-screen orientation.
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(2.4 / maxDim);

      emblem.add(model);
    });

    function resize() {
      const width = wrap!.clientWidth || 400;
      const height = wrap!.clientHeight || 400;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const ROTATION_SPEED = 0.25; // radians/sec — slow, continuous

    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (!reduceMotion) emblem.rotation.y += ROTATION_SPEED * dt;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      wrap.removeChild(canvas);
    };
  }, []);

  return <div className="emblem-hero-canvas" ref={wrapRef} aria-hidden="true" />;
}
