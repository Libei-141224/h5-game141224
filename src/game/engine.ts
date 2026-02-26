import type { DropInstance, DropType, EndReason, GameConfig, GameState } from './types';

const SCORE_BY_TYPE: Record<Exclude<DropType, 'BOMB'>, number> = {
  COIN: 10,
  BIG_COIN: 30,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  durationSec: 60,
  spawnIntervalMs: 600,
  minSpawnIntervalMs: 250,
  dropWeights: {
    COIN: 80,
    BIG_COIN: 10,
    BOMB: 10,
  },
  baseDropSpeed: 220,
  maxDropsOnScreen: 12,
  maxSpeedPxPerSec: 420,
  fieldWidth: 332,
  fieldHeight: 566,
  spawnPadding: 10,
  playerWidth: 124,
  playerHeight: 22,
  playerBottomOffset: 18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextSeed(seed: number): number {
  return (Math.imul(seed || 1, 1664525) + 1013904223) >>> 0;
}

function seededRandom(seed: number): { seed: number; value: number } {
  const newSeed = nextSeed(seed);
  return {
    seed: newSeed,
    value: newSeed / 4294967296,
  };
}

function pickDropType(weights: Record<DropType, number>, seed: number): { seed: number; type: DropType } {
  const total = weights.COIN + weights.BIG_COIN + weights.BOMB;
  const { seed: s1, value } = seededRandom(seed);
  const target = value * total;
  let cursor = 0;
  for (const type of ['COIN', 'BIG_COIN', 'BOMB'] as const) {
    cursor += weights[type];
    if (target <= cursor) {
      return { seed: s1, type };
    }
  }
  return { seed: s1, type: 'COIN' };
}

function getDifficultyMultiplier(elapsedMs: number): number {
  const steps = Math.floor(elapsedMs / 10000);
  return 1 + steps * 0.05;
}

function getDropMetrics(type: DropType, baseSpeed: number, seed: number): { seed: number; size: number; speed: number } {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(r1.seed);
  const speedJitter = 0.9 + r2.value * 0.25;

  if (type === 'BIG_COIN') {
    return {
      seed: r2.seed,
      size: 38 + Math.round(r1.value * 8),
      speed: baseSpeed * 0.95 * speedJitter,
    };
  }

  if (type === 'BOMB') {
    return {
      seed: r2.seed,
      size: 32 + Math.round(r1.value * 6),
      speed: baseSpeed * 1.05 * speedJitter,
    };
  }

  return {
    seed: r2.seed,
    size: 24 + Math.round(r1.value * 8),
    speed: baseSpeed * speedJitter,
  };
}

function createPlayer(config: GameConfig) {
  return {
    x: Math.round((config.fieldWidth - config.playerWidth) / 2),
    width: config.playerWidth,
    height: config.playerHeight,
    speed: 320,
  };
}

export function getPlayerTop(state: Pick<GameState, 'config' | 'player'>): number {
  return state.config.fieldHeight - state.config.playerBottomOffset - state.player.height;
}

export function createInitialState(
  seed = Date.now() >>> 0,
  bestScore = 0,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameState {
  return {
    status: 'idle',
    endReason: null,
    score: 0,
    timeLeft: config.durationSec,
    player: createPlayer(config),
    drops: [],
    config,
    bestScore,
    newRecord: false,
    startedAt: null,
    lastFrameAt: null,
    elapsedMs: 0,
    spawnAccumulatorMs: 0,
    rngSeed: seed || 1,
    nextDropId: 1,
  };
}

export function start(state: GameState, now: number): GameState {
  const reset = createInitialState(state.rngSeed || (Date.now() >>> 0), state.bestScore, state.config);
  return {
    ...reset,
    status: 'playing',
    startedAt: now,
    lastFrameAt: now,
  };
}

export function restart(state: GameState, seed = Date.now() >>> 0): GameState {
  return createInitialState(seed, state.bestScore, state.config);
}

export function end(state: GameState, reason: EndReason): GameState {
  if (state.status === 'ended') {
    return state;
  }

  const nextBest = Math.max(state.bestScore, state.score);
  return {
    ...state,
    status: 'ended',
    endReason: reason,
    bestScore: nextBest,
    newRecord: state.score > state.bestScore,
    lastFrameAt: null,
    spawnAccumulatorMs: 0,
  };
}

export function move(state: GameState, dir: 'left' | 'right', now: number): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const deltaMs = Math.min(Math.max(0, now - (state.lastFrameAt ?? now)), 50) || 16;
  const deltaSec = deltaMs / 1000;
  const signedDir = dir === 'left' ? -1 : 1;
  const maxX = state.config.fieldWidth - state.player.width;

  return {
    ...state,
    player: {
      ...state.player,
      x: clamp(state.player.x + signedDir * state.player.speed * deltaSec, 0, maxX),
    },
  };
}

function intersectsDropPlayer(drop: DropInstance, state: GameState): boolean {
  const playerTop = getPlayerTop(state);
  const playerBottom = playerTop + state.player.height;
  const playerLeft = state.player.x;
  const playerRight = state.player.x + state.player.width;

  const dropLeft = drop.x;
  const dropRight = drop.x + drop.size;
  const dropTop = drop.y;
  const dropBottom = drop.y + drop.size;

  return !(
    dropRight < playerLeft ||
    dropLeft > playerRight ||
    dropBottom < playerTop ||
    dropTop > playerBottom
  );
}

export function spawnDrop(state: GameState, _now: number, seed?: number): GameState {
  if (state.drops.length >= state.config.maxDropsOnScreen) {
    return state;
  }

  const difficultyMultiplier = getDifficultyMultiplier(state.elapsedMs);
  const baseSpeed = Math.min(
    state.config.baseDropSpeed * difficultyMultiplier,
    state.config.maxSpeedPxPerSec,
  );

  let workingSeed = seed ?? state.rngSeed;
  const picked = pickDropType(state.config.dropWeights, workingSeed);
  workingSeed = picked.seed;

  const metrics = getDropMetrics(picked.type, baseSpeed, workingSeed);
  workingSeed = metrics.seed;

  const xRand = seededRandom(workingSeed);
  workingSeed = xRand.seed;

  const maxX = state.config.fieldWidth - state.config.spawnPadding - metrics.size;
  const minX = state.config.spawnPadding;
  const x = minX + (maxX > minX ? xRand.value * (maxX - minX) : 0);

  const nextDrop: DropInstance = {
    id: `drop-${state.nextDropId}`,
    type: picked.type,
    x: Math.round(x),
    y: -metrics.size,
    size: metrics.size,
    speed: Math.min(metrics.speed, state.config.maxSpeedPxPerSec),
  };

  return {
    ...state,
    drops: [...state.drops, nextDrop],
    rngSeed: workingSeed || 1,
    nextDropId: state.nextDropId + 1,
  };
}

export function step(state: GameState, now: number, inputDir = 0): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const lastFrameAt = state.lastFrameAt ?? now;
  const rawDeltaMs = Math.max(0, now - lastFrameAt);
  const deltaMs = Math.min(rawDeltaMs, 50);

  let next: GameState = {
    ...state,
    lastFrameAt: now,
  };

  if (deltaMs <= 0) {
    return next;
  }

  const deltaSec = deltaMs / 1000;
  const maxPlayerX = next.config.fieldWidth - next.player.width;
  const nextPlayerX = clamp(
    next.player.x + clamp(inputDir, -1, 1) * next.player.speed * deltaSec,
    0,
    maxPlayerX,
  );

  const elapsedMs = next.elapsedMs + deltaMs;
  const remainingMs = Math.max(0, next.config.durationSec * 1000 - elapsedMs);
  const movedDrops = next.drops
    .map((drop) => ({ ...drop, y: drop.y + drop.speed * deltaSec }))
    .filter((drop) => drop.y <= next.config.fieldHeight + drop.size);

  let score = next.score;
  let bombHit = false;
  const survivingDrops: DropInstance[] = [];

  const nextForCollision: GameState = {
    ...next,
    elapsedMs,
    player: { ...next.player, x: nextPlayerX },
    drops: movedDrops,
    timeLeft: Math.ceil(remainingMs / 1000),
  };

  for (const drop of movedDrops) {
    if (!intersectsDropPlayer(drop, nextForCollision)) {
      survivingDrops.push(drop);
      continue;
    }

    if (drop.type === 'BOMB') {
      bombHit = true;
      survivingDrops.push(drop);
      continue;
    }

    score += SCORE_BY_TYPE[drop.type];
  }

  next = {
    ...nextForCollision,
    score,
    drops: survivingDrops,
    spawnAccumulatorMs: next.spawnAccumulatorMs + deltaMs,
  };

  if (!bombHit && remainingMs > 0) {
    let guard = 0;
    while (
      next.spawnAccumulatorMs >= Math.max(next.config.spawnIntervalMs, next.config.minSpawnIntervalMs) &&
      next.drops.length < next.config.maxDropsOnScreen &&
      guard < 8
    ) {
      next = {
        ...spawnDrop(next, now),
        spawnAccumulatorMs:
          next.spawnAccumulatorMs - Math.max(next.config.spawnIntervalMs, next.config.minSpawnIntervalMs),
      };
      guard += 1;
    }
  } else {
    next = { ...next, spawnAccumulatorMs: 0 };
  }

  if (bombHit) {
    return end(next, 'bomb');
  }

  if (remainingMs <= 0) {
    return end({ ...next, timeLeft: 0 }, 'time_up');
  }

  return next;
}
