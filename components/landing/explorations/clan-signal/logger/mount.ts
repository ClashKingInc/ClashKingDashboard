import * as THREE from 'three';
import { parseGLB, buildExportScene } from './clash-model.mjs';

export async function mountLogger(host: HTMLElement, canMove: () => boolean, signal: AbortSignal) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0, 0);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', host.getAttribute('aria-label') || '');
  host.append(canvas);
  let disposeScene: (() => void) | undefined;
  let texture: THREE.Texture | undefined;
  try {
    const load = async (name: string) => {
      const response = await fetch(`/landing/logger/${name}`, { signal });
      if (!response.ok) throw new Error(`Logger asset returned ${response.status}`);
      return parseGLB(await response.arrayBuffer());
    };
    const [geometry, entrance, loadedTexture] = await Promise.all([
      load('logger-geo.glb'), load('logger-ui1.glb'),
      new THREE.TextureLoader().loadAsync('/landing/logger/logger-texture.png'),
    ]);
    texture = loadedTexture;
    if (signal.aborted) { texture.dispose(); renderer.dispose(); canvas.remove(); return () => {}; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    geometry.texture = texture;
    entrance.path = 'menu';
    entrance.menuLoopStart = 85;
    const built = buildExportScene(geometry, entrance);
    disposeScene = built.dispose;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x57516a, 2.7));
    const key = new THREE.DirectionalLight(0xffecd5, 3.2); key.position.set(35, 65, 55); scene.add(key);
    const fill = new THREE.DirectionalLight(0x81aaff, 1.2); fill.position.set(-40, 15, 20); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2); rim.position.set(10, 30, -25); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 500);
    // Entrance and idle use identical framing; never zoom when the menu loop begins.
    camera.position.set(0, 19, 68); camera.lookAt(0, 19, 0);
    const group = new THREE.Group(); group.add(built.root); scene.add(group);
    const mixer = new THREE.AnimationMixer(built.root);
    const action = mixer.clipAction(built.clip);
    action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    // animations.csv specifies ui1 with LoopStartFrame=85. Combat idle1 is a different pose.
    const loopStart = 85 / entrance.animation.frameRate;
    const duration = built.clip.duration, loopDuration = duration - loopStart;
    let elapsed = canMove() ? 0 : duration, previous = performance.now();
    let targetYaw = -.15, yaw = -.15, drag: { id: number; x: number; yaw: number } | null = null;
    let visible = true, frame = 0, disposed = false;
    host.dataset.model = 'ready'; host.dataset.loopStartFrame = '85'; host.dataset.cameraZ = '68';
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.max(0, Math.min((now - previous) / 1000, .05)); previous = now;
      if (canMove()) elapsed += dt;
      action.time = elapsed < duration ? elapsed : loopStart + ((elapsed - duration) % loopDuration);
      mixer.update(0);
      if (canMove()) yaw += (targetYaw - yaw) * (1 - Math.exp(-dt * 10));
      group.rotation.y = yaw;
      host.dataset.phase = elapsed < duration ? 'entrance' : 'idle';
      host.dataset.animationTime = action.time.toFixed(3);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    const resume = () => { if (visible && !document.hidden && !frame) { previous = performance.now(); frame = requestAnimationFrame(tick); } };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    intersection.observe(host); document.addEventListener('visibilitychange', resume);
    const down = (event: PointerEvent) => {
      if (!canMove() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, yaw: targetYaw }; canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (drag?.id === event.pointerId) targetYaw = THREE.MathUtils.clamp(drag.yaw + (event.clientX - drag.x) * .007, -.85, .85);
      else if (event.pointerType === 'mouse' && canMove()) { const bounds = canvas.getBoundingClientRect(); targetYaw = -.15 + ((event.clientX - bounds.left) / bounds.width - .5) * .35; }
    };
    const up = () => { drag = null; };
    const leave = () => { if (!drag) targetYaw = -.15; };
    const keyboard = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); targetYaw = THREE.MathUtils.clamp(targetYaw + (event.key === 'ArrowLeft' ? -.15 : .15), -.85, .85);
      yaw = targetYaw; group.rotation.y = yaw; renderer.render(scene, camera);
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('pointerleave', leave); canvas.addEventListener('keydown', keyboard);
    resume();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', resume);
      mixer.stopAllAction(); mixer.uncacheRoot(built.root); built.dispose(); texture?.dispose();
      renderer.dispose(); canvas.remove(); delete host.dataset.model;
    };
  } catch (error) {
    disposeScene?.(); texture?.dispose(); renderer.dispose(); canvas.remove(); throw error;
  }
}
