"use client";

import { useSyncExternalStore, type CSSProperties } from "react";

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  viewport?.addEventListener("scroll", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    viewport?.removeEventListener("resize", onChange);
    viewport?.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function viewportSnapshot() {
  const viewport = window.visualViewport;
  // Pinch zoom belongs to the user. Only resize the overlay for an unscaled
  // viewport, where the keyboard can obscure controls without changing dvh.
  if (!viewport || Math.abs(viewport.scale - 1) > 0.01) return "";
  return `${viewport.height}:${viewport.offsetTop}`;
}

export function useOverlayViewport(): CSSProperties {
  const snapshot = useSyncExternalStore(subscribe, viewportSnapshot, () => "");
  if (!snapshot) return {};
  const [height, top] = snapshot.split(":");
  return {
    "--overlay-height": `${height}px`,
    "--overlay-top": `${top}px`,
  } as CSSProperties;
}
