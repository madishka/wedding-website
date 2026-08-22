"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The public root's hero mark: the emblem GLB, turning on its Y axis
 * as the page scrolls through `.emblem-scroll-space` (see page.tsx) —
 * 0° at the top of that space, 180° once it's fully scrolled past, and
 * pinned at 180° for any scroll beyond that. Transparent canvas, so
 * `.hero-bg-plain` (see globals.css) shows through behind it exactly
 * as it does behind the text it replaces.
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
      model.rotation.z = Math.PI;
      // Normalize scale so the model fills the frame consistently
      // regardless of how it was authored, then center it — in that
      // order, so the recentering below measures (and cancels out)
      // the model's actual final centroid instead of its unscaled
      // one. The sickle's handle throws the geometric center off from
      // (0,0,0), so centering before scaling left a residual offset
      // proportional to the scale factor: it visibly rotated around
      // the handle rather than the emblem's true center.
      const rawSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
      model.scale.setScalar(2.4 / maxDim);

      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.sub(center);

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

    const scrollSpace = document.querySelector<HTMLElement>(
      ".emblem-scroll-space"
    );
    const footerOverlay = document.querySelector<HTMLElement>(
      ".hero-footer-overlay"
    );
    const scrollCue = document.querySelector<HTMLElement>(".scroll-cue");

    function scrollProgress() {
      if (!scrollSpace) return 0;
      // The hero is the page's first element (static top offset 0), so
      // it's pinned from scrollY 0 onward — not from whenever the
      // scroll-space's own top happens to cross the viewport's top
      // edge, which only happens after an extra full viewport of
      // scrolling. The pin lasts exactly the scroll-space's height.
      const total = scrollSpace.offsetHeight || 1;
      return clamp(window.scrollY, 0, total) / total;
    }

    let raf = 0;
    function tick() {
      const progress = scrollProgress();
      emblem.rotation.y = progress * Math.PI; // 0 -> 180°, then holds

      // Monogram overlay: starts fading in once the emblem is halfway
      // turned (90°) and is fully in by the time it finishes (180°).
      if (footerOverlay) {
        footerOverlay.style.opacity = String(clamp(progress - 0.5, 0, 0.5) / 0.5);
      }

      // Scroll cue: gone within the first sliver of scrolling, well
      // before the footer overlay above needs the same spot.
      if (scrollCue) {
        scrollCue.style.opacity = String(1 - clamp(progress / 0.08, 0, 1));
      }

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
