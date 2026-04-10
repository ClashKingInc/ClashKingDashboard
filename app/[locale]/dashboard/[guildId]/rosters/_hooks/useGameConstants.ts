import { useState, useEffect } from 'react';

interface GameConstants {
  townhall: {
    min: number;
    max: number;
  };
  builderhall: {
    min: number;
    max: number;
  };
}

// Default values as fallback
const DEFAULT_CONSTANTS: GameConstants = {
  townhall: { min: 1, max: 17 },
  builderhall: { min: 1, max: 10 },
};

// Module-level cache
let cachedConstants: GameConstants | null = null;
let fetchPromise: Promise<GameConstants> | null = null;

async function fetchMaxLevel(category: string, itemName: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/v2/static/${category}/${encodeURIComponent(itemName)}/maxlevel`);
    if (response.ok) {
      const data = await response.json();
      return data.max_level;
    }
  } catch (error) {
    console.error(`Failed to fetch max level for ${itemName}:`, error);
  }
  return null;
}

async function fetchGameConstants(): Promise<GameConstants> {
  const [thMax, bhMax] = await Promise.all([
    fetchMaxLevel('buildings', 'Town Hall'),
    fetchMaxLevel('buildings', 'Builder Hall'),
  ]);

  const constants: GameConstants = {
    townhall: { min: 1, max: thMax ?? DEFAULT_CONSTANTS.townhall.max },
    builderhall: { min: 1, max: bhMax ?? DEFAULT_CONSTANTS.builderhall.max },
  };

  cachedConstants = constants;
  return constants;
}

export function useGameConstants() {
  const [constants, setConstants] = useState<GameConstants>(
    cachedConstants || DEFAULT_CONSTANTS
  );
  const [loading, setLoading] = useState(!cachedConstants);

  useEffect(() => {
    if (cachedConstants) {
      setConstants(cachedConstants);
      setLoading(false);
      return;
    }

    // Use shared promise to avoid duplicate requests
    fetchPromise ??= fetchGameConstants();

    fetchPromise.then((data) => {
      setConstants(data);
      setLoading(false);
    });
  }, []);

  return {
    constants,
    loading,
    maxTh: constants.townhall.max,
    minTh: constants.townhall.min,
    maxBh: constants.builderhall.max,
    minBh: constants.builderhall.min,
  };
}
