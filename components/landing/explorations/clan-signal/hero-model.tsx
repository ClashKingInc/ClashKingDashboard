"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const FRAME_PADDING = 1.18;

const SKINS = [
  {
    slug: "battlecopter-steampunk",
    label: "Steampunk Battle Copter",
    assetRoot: "/concepts/clan-signal/steampunk-battlecopter",
    boundsSamples: 49,
    visualScale: 1.65,
    boundsIgnorePrefixes: [] as string[],
  },
  {
    slug: "barbking-squad",
    label: "Barb King Squad",
    assetRoot: "/concepts/clan-signal/barbking-squad",
    boundsSamples: 20,
    visualScale: 1.65,
    boundsIgnorePrefixes: [] as string[],
  },
] as const;

type ModelState = "loading" | "ready" | "error";

type SkinConfig = {
  model: string;
  animation: {
    clip: string;
    speed: number;
    loop: boolean;
  };
  transform: {
    scale: number;
    offsetY: number;
    initialYaw: number;
  };
  camera: {
    fov: number;
    distance: number;
    targetY: number;
  };
  interaction: {
    allowYaw: boolean;
    minYaw: number;
    maxYaw: number;
    allowPitch: boolean;
    allowZoom: boolean;
    allowPan: boolean;
    dragSensitivity: number;
  };
};

function disposeObject(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
      material.dispose();
    });
  });

  textures.forEach((texture) => texture.dispose());
}

function animatedBounds(
  model: THREE.Object3D,
  mixer: THREE.AnimationMixer,
  clip: THREE.AnimationClip,
  sampleCount: number,
  ignorePrefixes: readonly string[],
) {
  const bounds = new THREE.Box3();
  const frameBounds = new THREE.Box3();

  for (let frame = 0; frame < sampleCount; frame += 1) {
    mixer.setTime(clip.duration * (frame / (sampleCount - 1)));
    model.updateMatrixWorld(true);
    frameBounds.makeEmpty();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (ignorePrefixes.some((prefix) => object.name.toLowerCase().startsWith(prefix))) return;
      frameBounds.expandByObject(object, true);
    });
    if (!frameBounds.isEmpty()) bounds.union(frameBounds);
  }

  mixer.setTime(0);
  model.updateMatrixWorld(true);
  return bounds;
}

function fitCamera(
  camera: THREE.PerspectiveCamera,
  animatedSize: THREE.Vector3,
  targetY: number,
  aspect: number,
  minimumDistance: number,
  minYaw: number,
  maxYaw: number,
  visualScale: number,
) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const halfWidth = animatedSize.x / 2;
  const halfHeight = animatedSize.y / 2;
  const halfDepth = animatedSize.z / 2;
  const horizontalTangent = Math.tan(horizontalFov / 2);
  const verticalTangent = Math.tan(verticalFov / 2);
  const yawSteps = Math.max(1, Math.ceil((maxYaw - minYaw) / 2));
  let distance = minimumDistance;

  for (let step = 0; step <= yawSteps; step += 1) {
    const yaw = THREE.MathUtils.degToRad(minYaw + ((maxYaw - minYaw) * step) / yawSteps);
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);

    for (const x of [-halfWidth, halfWidth]) {
      for (const y of [-halfHeight, halfHeight]) {
        for (const z of [-halfDepth, halfDepth]) {
          const rotatedX = x * cosine + z * sine;
          const rotatedZ = -x * sine + z * cosine;
          distance = Math.max(
            distance,
            rotatedZ + (Math.abs(rotatedX) * FRAME_PADDING) / horizontalTangent,
            rotatedZ + (Math.abs(y) * FRAME_PADDING) / verticalTangent,
          );
        }
      }
    }
  }

  camera.aspect = aspect;
  camera.zoom = visualScale;
  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(100, distance * 12);
  camera.position.set(0, targetY, distance);
  camera.lookAt(0, targetY, 0);
  camera.updateProjectionMatrix();
}

export function ClanSignalHeroModel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedSkinRef = useRef<(typeof SKINS)[number] | null>(null);
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [activeClip, setActiveClip] = useState("");
  const [activeSkin, setActiveSkin] = useState("");
  const [activeLabel, setActiveLabel] = useState("Clash of Clans hero");
  const [frameSamples, setFrameSamples] = useState(0);
  const [visualScale, setVisualScale] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    selectedSkinRef.current ??= SKINS[Math.random() < 0.5 ? 0 : 1];
    const skin = selectedSkinRef.current;
    host.dataset.skin = skin.slug;
    setActiveSkin(skin.slug);
    setActiveLabel(skin.label);
    setFrameSamples(skin.boundsSamples);
    setVisualScale(skin.visualScale);

    const abortController = new AbortController();
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = reducedMotionQuery.matches;
    host.dataset.motionState = prefersReducedMotion ? "paused" : "playing";
    let disposed = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    let scene: THREE.Scene | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let loadedModel: THREE.Object3D | undefined;
    let yawRoot: THREE.Group | undefined;
    let selectedClip: THREE.AnimationClip | undefined;
    let selectedAction: THREE.AnimationAction | undefined;
    let config: SkinConfig | undefined;
    const timer = new THREE.Timer();
    timer.connect(document);
    const animatedSize = new THREE.Vector3(1, 1, 1);

    let pointerId: number | null = null;
    let pointerStartX = 0;
    let pointerStartYaw = 0;
    let currentYaw = 0;

    const stopDragging = () => {
      pointerId = null;
      delete canvas.dataset.dragging;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!config?.interaction.allowYaw || (event.pointerType === "mouse" && event.button !== 0)) return;
      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartYaw = currentYaw;
      canvas.dataset.dragging = "true";
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId || !config || !yawRoot) return;
      const nextYaw = pointerStartYaw + (event.clientX - pointerStartX) * config.interaction.dragSensitivity;
      currentYaw = THREE.MathUtils.clamp(
        nextYaw,
        config.interaction.minYaw,
        config.interaction.maxYaw,
      );
      yawRoot.rotation.y = THREE.MathUtils.degToRad(currentYaw);
      host.dataset.yaw = currentYaw.toFixed(1);
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      stopDragging();
    };

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      host.dataset.motionState = prefersReducedMotion ? "paused" : "playing";
      delete host.dataset.animationFinished;
      if (prefersReducedMotion) {
        mixer?.setTime(0);
        if (selectedAction) selectedAction.paused = true;
      } else if (selectedAction && config) {
        selectedAction.reset();
        selectedAction.paused = false;
        selectedAction.setEffectiveWeight(1);
        selectedAction.setEffectiveTimeScale(config.animation.speed).play();
      }
      timer.reset();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("lostpointercapture", stopDragging);
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);

    const render = (timestamp?: number) => {
      if (disposed || !renderer || !scene) return;

      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      if (!prefersReducedMotion) mixer?.update(delta);
      if (
        !prefersReducedMotion
        && config
        && !config.animation.loop
        && selectedAction?.paused
        && selectedClip
        && selectedAction.time >= selectedClip.duration
      ) {
        host.dataset.motionState = "finished";
        host.dataset.animationFinished = "true";
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);

    const initialize = async () => {
      try {
        const configResponse = await fetch(`${skin.assetRoot}/skin.json`, {
          signal: abortController.signal,
        });
        if (!configResponse.ok) throw new Error(`Skin config returned ${configResponse.status}`);
        config = await configResponse.json() as SkinConfig;
        host.dataset.allowYaw = String(config.interaction.allowYaw);

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.95;

        scene = new THREE.Scene();
        camera.fov = config.camera.fov;

        scene.add(new THREE.HemisphereLight(0xf1f8ff, 0x617067, 3.2));

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        keyLight.position.set(4.5, 6, 6);
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0xb5dcff, 1.5);
        rimLight.position.set(-5, 3, -4);
        scene.add(rimLight);

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(`${skin.assetRoot}/${config.model}`);
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        loadedModel = gltf.scene;
        loadedModel.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
              material.map.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
            }
          });
        });

        yawRoot = new THREE.Group();
        const centeredModel = new THREE.Group();
        yawRoot.add(centeredModel);
        centeredModel.add(loadedModel);
        scene.add(yawRoot);

        selectedClip = gltf.animations.find((clip) => clip.name === config?.animation.clip)
          ?? gltf.animations[0];
        if (!selectedClip) throw new Error("The model does not contain an animation clip");
        host.dataset.animationDuration = selectedClip.duration.toFixed(2);

        const boundsMixer = new THREE.AnimationMixer(loadedModel);
        boundsMixer.clipAction(selectedClip).setLoop(THREE.LoopRepeat, Infinity).play();

        const bounds = animatedBounds(
          loadedModel,
          boundsMixer,
          selectedClip,
          skin.boundsSamples,
          skin.boundsIgnorePrefixes,
        );
        boundsMixer.stopAllAction();
        boundsMixer.uncacheRoot(loadedModel);
        if (bounds.isEmpty()) throw new Error("The animated model bounds are empty");

        mixer = new THREE.AnimationMixer(loadedModel);
        selectedAction = mixer.clipAction(selectedClip);
        selectedAction.setLoop(
          config.animation.loop ? THREE.LoopRepeat : THREE.LoopOnce,
          config.animation.loop ? Infinity : 1,
        );
        selectedAction.clampWhenFinished = !config.animation.loop;
        selectedAction.setEffectiveWeight(1);
        selectedAction.setEffectiveTimeScale(config.animation.speed);

        const center = bounds.getCenter(new THREE.Vector3());
        bounds.getSize(animatedSize).multiplyScalar(config.transform.scale);
        centeredModel.position.set(
          -center.x * config.transform.scale,
          -center.y * config.transform.scale + config.transform.offsetY,
          -center.z * config.transform.scale,
        );
        centeredModel.scale.setScalar(config.transform.scale);

        currentYaw = THREE.MathUtils.clamp(
          config.transform.initialYaw,
          config.interaction.minYaw,
          config.interaction.maxYaw,
        );
        yawRoot.rotation.y = THREE.MathUtils.degToRad(currentYaw);
        host.dataset.yaw = currentYaw.toFixed(1);

        const resize = () => {
          if (!renderer || !config) return;
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          fitCamera(
            camera,
            animatedSize,
            config.camera.targetY + config.transform.offsetY,
            width / height,
            config.camera.distance,
            config.interaction.minYaw,
            config.interaction.maxYaw,
            skin.visualScale,
          );
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        if (prefersReducedMotion) {
          mixer.setTime(0);
          selectedAction.paused = true;
        } else {
          selectedAction.play();
        }
        setActiveClip(selectedClip.name);
        setModelState("ready");
        render();
      } catch (error) {
        if (disposed || abortController.signal.aborted) return;
        console.error(`Failed to load the ${skin.label}`, error);
        setModelState("error");
      }
    };

    void initialize();

    return () => {
      disposed = true;
      delete host.dataset.motionState;
      abortController.abort();
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      timer.dispose();
      reducedMotionQuery.removeEventListener("change", onMotionPreferenceChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("lostpointercapture", stopDragging);
      mixer?.stopAllAction();
      if (loadedModel && mixer) mixer.uncacheRoot(loadedModel);
      if (loadedModel) disposeObject(loadedModel);
      renderer?.renderLists.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`cs-hero-model is-${modelState}`}
      data-model-state={modelState}
      data-skin={activeSkin || undefined}
      data-animation-clip={activeClip || undefined}
      data-frame-samples={frameSamples || undefined}
      data-frame-padding={FRAME_PADDING}
      data-visual-scale={visualScale || undefined}
    >
      <canvas
        ref={canvasRef}
        className="cs-hero-model-canvas"
        aria-label={`Animated ${activeLabel}. Drag horizontally to rotate it.`}
      />
      <span className="cs-visually-hidden" aria-live="polite">
        {modelState === "ready" ? `${activeLabel} ready` : ""}
      </span>
    </div>
  );
}
