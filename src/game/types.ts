export type DropType = 'COIN' | 'BIG_COIN' | 'BOMB';
export type GameStatus = 'idle' | 'playing' | 'ended';
export type EndReason = 'time_up' | 'bomb' | null;

export interface DropInstance {
  id: string;
  type: DropType;
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface Player {
  x: number;
  width: number;
  height: number;
  speed: number;
}

export interface GameConfig {
  durationSec: number;
  spawnIntervalMs: number;
  minSpawnIntervalMs: number;
  dropWeights: Record<DropType, number>;
  baseDropSpeed: number;
  maxDropsOnScreen: number;
  maxSpeedPxPerSec: number;
  fieldWidth: number;
  fieldHeight: number;
  spawnPadding: number;
  playerWidth: number;
  playerHeight: number;
  playerBottomOffset: number;
}

export interface GameState {
  status: GameStatus;
  endReason: EndReason;
  score: number;
  timeLeft: number;
  player: Player;
  drops: DropInstance[];
  config: GameConfig;
  bestScore: number;
  newRecord: boolean;
  startedAt: number | null;
  lastFrameAt: number | null;
  elapsedMs: number;
  spawnAccumulatorMs: number;
  rngSeed: number;
  nextDropId: number;
}
