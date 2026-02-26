const STORAGE_KEY = 'coin-catch-challenge:stats';

export interface GameStats {
  bestScore: number;
}

export function loadStats(): GameStats {
  if (typeof window === 'undefined') {
    return { bestScore: 0 };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestScore: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      bestScore:
        typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore)
          ? Math.max(0, Math.floor(parsed.bestScore))
          : 0,
    };
  } catch {
    return { bestScore: 0 };
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bestScore: Math.max(0, Math.floor(stats.bestScore)),
      }),
    );
  } catch {
    // Storage failures should not block gameplay.
  }
}
