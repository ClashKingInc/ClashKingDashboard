"use client";

import { useCallback, useEffect, useState } from "react";
import {
  assetSourceErrorMessage,
  fetchLibraryAssets,
  isAbortError,
  type LibraryAsset,
  type LibraryAssetPage,
  type LibraryAssetSourceKind,
} from "./asset-sources";

export const LIBRARY_ASSET_DRAG_TYPE = "application/x-clashking-library-asset";

export interface UseAssetLibraryOptions {
  sourceKind: LibraryAssetSourceKind;
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
  accumulate?: boolean;
}

export interface AssetLibraryState {
  result: LibraryAssetPage | null;
  assets: LibraryAsset[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAssetLibrary({
  sourceKind,
  query = "",
  category = "",
  page = 1,
  limit = 25,
  debounceMs = 250,
  enabled = true,
  accumulate = false,
}: UseAssetLibraryOptions): AssetLibraryState {
  const [result, setResult] = useState<LibraryAssetPage | null>(null);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchLibraryAssets(sourceKind, {
        query,
        category,
        page,
        limit,
        signal: controller.signal,
      }).then((nextResult) => {
        if (controller.signal.aborted) return;
        setResult(nextResult);
        setAssets((current) => {
          if (!accumulate || nextResult.page <= 1) return nextResult.assets;
          const known = new Set(current.map((asset) => asset.id));
          return [...current, ...nextResult.assets.filter((asset) => !known.has(asset.id))];
        });
        setLoading(false);
      }).catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return;
        setError(assetSourceErrorMessage(reason));
        setLoading(false);
      });
    }, Math.max(0, debounceMs));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [accumulate, attempt, category, debounceMs, enabled, limit, page, query, sourceKind]);

  return {
    result,
    assets,
    loading,
    error,
    retry,
  };
}

export function writeLibraryAssetDragData(dataTransfer: DataTransfer, asset: LibraryAsset): void {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(LIBRARY_ASSET_DRAG_TYPE, JSON.stringify(asset));
  dataTransfer.setData("text/uri-list", asset.source);
  dataTransfer.setData("text/plain", asset.source);
}

export function readLibraryAssetDragData(dataTransfer: DataTransfer): LibraryAsset | null {
  const raw = dataTransfer.getData(LIBRARY_ASSET_DRAG_TYPE);
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const candidate = value as Partial<LibraryAsset>;
    if (
      typeof candidate.id !== "string"
      || typeof candidate.name !== "string"
      || typeof candidate.source !== "string"
      || typeof candidate.thumbnail !== "string"
      || typeof candidate.category !== "string"
      || (candidate.sourceKind !== "clashking" && candidate.sourceKind !== "supercell-fankit")
    ) return null;
    return candidate as LibraryAsset;
  } catch {
    return null;
  }
}
