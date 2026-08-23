export const GRAPHICS_EDITOR_MODE_EVENT = "clashking:graphics-editor-mode";
let graphicsEditorMode = false;

export function dispatchGraphicsEditorMode(active: boolean): void {
  graphicsEditorMode = active;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<boolean>(GRAPHICS_EDITOR_MODE_EVENT, { detail: active }));
}

export function getGraphicsEditorMode(): boolean {
  return graphicsEditorMode;
}
