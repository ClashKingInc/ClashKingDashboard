import type { Object3D, AnimationClip, Texture } from 'three';
export interface DecodedModel { animation: { frameRate: number }; texture?: Texture; path?: string; menuLoopStart?: number }
export function parseGLB(buffer: ArrayBuffer): DecodedModel;
export function buildExportScene(model: DecodedModel, animation: DecodedModel): { root: Object3D; clip: AnimationClip; dispose(): void };
