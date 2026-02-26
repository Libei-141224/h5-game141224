import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import {
  DEFAULT_GAME_CONFIG,
  createInitialState,
  getPlayerTop,
  restart,
  start,
  step,
} from '../game/engine';
import type { DropType, GameState } from '../game/types';
import { loadStats, saveStats } from '../storage/stats';

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

type ShakeMode = 'none' | 'soft' | 'medium' | 'hard';
type FlashKind = 'coin' | 'big' | 'bomb' | 'time-up';

interface FieldFlash {
  id: number;
  kind: FlashKind;
}

interface ScorePopup {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: 'coin' | 'big';
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  tone: 'coin' | 'big' | 'bomb';
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useCoinCatchGame() {
  const stats = loadStats();
  const state = ref<GameState>(createInitialState(Date.now() >>> 0, stats.bestScore, DEFAULT_GAME_CONFIG));
  const rulesVisible = ref(false);

  const controls = reactive({
    left: false,
    right: false,
  });

  const feedback = reactive({
    flashes: [] as FieldFlash[],
    scorePopups: [] as ScorePopup[],
    particles: [] as BurstParticle[],
    shakeMode: 'none' as ShakeMode,
    shakeTick: 0,
  });

  let rafId: number | null = null;
  let fxSeq = 1;
  const timeoutIds = new Set<number>();
  let audioCtx: AudioContext | null = null;

  const controlDirection = computed(() => {
    return (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  });

  const isPlaying = computed(() => state.value.status === 'playing');
  const isIdle = computed(() => state.value.status === 'idle');
  const isEnded = computed(() => state.value.status === 'ended');

  const weightRows = computed(() => {
    return (['COIN', 'BIG_COIN', 'BOMB'] as DropType[]).map((type) => ({
      type,
      weight: state.value.config.dropWeights[type],
    }));
  });

  function scheduleCleanup(delayMs: number, task: () => void) {
    const timerId = window.setTimeout(() => {
      timeoutIds.delete(timerId);
      task();
    }, delayMs);
    timeoutIds.add(timerId);
  }

  function nextFxId() {
    const id = fxSeq;
    fxSeq += 1;
    return id;
  }

  function removeById<T extends { id: number }>(list: T[], id: number) {
    const index = list.findIndex((item) => item.id === id);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  function triggerShake(mode: Exclude<ShakeMode, 'none'>) {
    feedback.shakeMode = mode;
    feedback.shakeTick += 1;
    const shakeTick = feedback.shakeTick;
    scheduleCleanup(mode === 'hard' ? 420 : 220, () => {
      if (feedback.shakeMode === mode && feedback.shakeTick === shakeTick) {
        feedback.shakeMode = 'none';
      }
    });
  }

  function pushFlash(kind: FlashKind) {
    const flash: FieldFlash = { id: nextFxId(), kind };
    feedback.flashes.push(flash);
    scheduleCleanup(kind === 'bomb' ? 280 : 180, () => removeById(feedback.flashes, flash.id));
  }

  function pushScorePopup(snapshot: GameState, amount: number, tone: 'coin' | 'big') {
    const playerCenterX = snapshot.player.x + snapshot.player.width / 2;
    const playerTop = getPlayerTop(snapshot);
    const jitterX = (Math.random() - 0.5) * 26;
    const jitterY = Math.random() * 8;

    const popup: ScorePopup = {
      id: nextFxId(),
      text: `+${amount}`,
      x: clampValue(playerCenterX - 18 + jitterX, 10, snapshot.config.fieldWidth - 48),
      y: clampValue(playerTop - 8 - jitterY, 16, snapshot.config.fieldHeight - 42),
      tone,
    };

    feedback.scorePopups.push(popup);
    scheduleCleanup(720, () => removeById(feedback.scorePopups, popup.id));
  }

  function pushBurstParticles(snapshot: GameState, tone: 'coin' | 'big' | 'bomb') {
    const playerCenterX = snapshot.player.x + snapshot.player.width / 2;
    const playerTop = getPlayerTop(snapshot) + snapshot.player.height * 0.35;
    const count = tone === 'bomb' ? 14 : tone === 'big' ? 10 : 6;

    for (let i = 0; i < count; i += 1) {
      const angle = (-Math.PI * 0.9) + (Math.PI * 0.8 * (i / Math.max(1, count - 1)));
      const spread = tone === 'bomb' ? 56 : tone === 'big' ? 42 : 30;
      const speed = spread * (0.75 + Math.random() * 0.6);
      const particle: BurstParticle = {
        id: nextFxId(),
        x: clampValue(playerCenterX + (Math.random() - 0.5) * 18, 8, snapshot.config.fieldWidth - 8),
        y: clampValue(playerTop + (Math.random() - 0.5) * 8, 10, snapshot.config.fieldHeight - 10),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - (tone === 'bomb' ? 6 : 0),
        size: tone === 'bomb' ? 4 + Math.random() * 5 : 3 + Math.random() * 4,
        tone,
      };
      feedback.particles.push(particle);
      scheduleCleanup(tone === 'bomb' ? 540 : 420, () => removeById(feedback.particles, particle.id));
    }
  }

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (audioCtx) {
      return audioCtx;
    }

    const audioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioCtor) {
      return null;
    }

    audioCtx = new audioCtor();
    return audioCtx;
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'suspended') {
      return;
    }
    void ctx.resume().catch(() => {
      // Ignore autoplay policy failures; audio stays optional.
    });
  }

  function playTone(options: {
    type: OscillatorType;
    frequency: number;
    durationMs: number;
    gain: number;
    attackMs?: number;
    releaseMs?: number;
    endFrequency?: number;
  }) {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const attack = (options.attackMs ?? 8) / 1000;
    const release = (options.releaseMs ?? 80) / 1000;
    const durationSec = Math.max(options.durationMs / 1000, attack + 0.01);
    const endTime = now + durationSec;

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.frequency, now);
    if (typeof options.endFrequency === 'number') {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, options.endFrequency), endTime);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.gain, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(now + attack + 0.01, endTime - release));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(endTime + 0.02);
  }

  function playCoinSfx() {
    playTone({ type: 'triangle', frequency: 880, endFrequency: 1120, durationMs: 110, gain: 0.045 });
  }

  function playBigCoinSfx() {
    playTone({ type: 'triangle', frequency: 660, endFrequency: 1320, durationMs: 140, gain: 0.06 });
    playTone({ type: 'sine', frequency: 990, endFrequency: 1580, durationMs: 100, gain: 0.035, attackMs: 2 });
  }

  function playBombSfx() {
    playTone({ type: 'sawtooth', frequency: 220, endFrequency: 65, durationMs: 260, gain: 0.09, attackMs: 2 });
    playTone({ type: 'square', frequency: 180, endFrequency: 42, durationMs: 320, gain: 0.06, attackMs: 4 });
  }

  function playStartSfx() {
    playTone({ type: 'sine', frequency: 520, endFrequency: 740, durationMs: 120, gain: 0.04 });
  }

  function playTimeUpSfx() {
    playTone({ type: 'triangle', frequency: 620, endFrequency: 360, durationMs: 180, gain: 0.05 });
  }

  function triggerCatchFeedback(snapshot: GameState, amount: number) {
    if (amount >= 30) {
      pushFlash('big');
      triggerShake('medium');
      pushScorePopup(snapshot, amount, 'big');
      pushBurstParticles(snapshot, 'big');
      playBigCoinSfx();
      return;
    }

    pushFlash('coin');
    triggerShake('soft');
    pushScorePopup(snapshot, amount, 'coin');
    pushBurstParticles(snapshot, 'coin');
    playCoinSfx();
  }

  function triggerBombFeedback(snapshot: GameState) {
    pushFlash('bomb');
    triggerShake('hard');
    pushBurstParticles(snapshot, 'bomb');
    playBombSfx();
  }

  function triggerTimeUpFeedback(snapshot: GameState) {
    pushFlash('time-up');
    triggerShake('soft');
    pushBurstParticles(snapshot, 'coin');
    playTimeUpSfx();
  }

  function processScoreDelta(prevState: GameState, nextState: GameState) {
    let delta = nextState.score - prevState.score;
    if (delta <= 0) {
      return;
    }

    while (delta >= 30) {
      triggerCatchFeedback(nextState, 30);
      delta -= 30;
    }
    while (delta >= 10) {
      triggerCatchFeedback(nextState, 10);
      delta -= 10;
    }
    if (delta > 0) {
      triggerCatchFeedback(nextState, delta);
    }
  }

  function commitState(nextState: GameState) {
    const prev = state.value;
    processScoreDelta(prev, nextState);

    if (prev.status !== 'ended' && nextState.status === 'ended') {
      if (nextState.endReason === 'bomb') {
        triggerBombFeedback(nextState);
      } else if (nextState.endReason === 'time_up') {
        triggerTimeUpFeedback(nextState);
      }
    }

    if (prev.status !== 'playing' && nextState.status === 'playing') {
      playStartSfx();
    }

    state.value = nextState;

    if (prev.status !== 'ended' && nextState.status === 'ended' && nextState.bestScore > prev.bestScore) {
      saveStats({ bestScore: nextState.bestScore });
    }
  }

  function frameLoop(now: number) {
    if (state.value.status === 'playing') {
      commitState(step(state.value, now, controlDirection.value));
    }

    rafId = window.requestAnimationFrame(frameLoop);
  }

  function resetControlState() {
    controls.left = false;
    controls.right = false;
  }

  function startGame() {
    unlockAudio();
    rulesVisible.value = false;
    resetControlState();
    commitState(start(state.value, nowMs()));
  }

  function replayGame() {
    unlockAudio();
    resetControlState();
    const resetState = restart(state.value, Date.now() >>> 0);
    commitState(start(resetState, nowMs()));
  }

  function goHome() {
    resetControlState();
    commitState(createInitialState(Date.now() >>> 0, state.value.bestScore, state.value.config));
    rulesVisible.value = false;
  }

  function setMovePressed(dir: 'left' | 'right', pressed: boolean) {
    if (pressed) {
      unlockAudio();
    }
    controls[dir] = pressed;
  }

  function openRules() {
    rulesVisible.value = true;
  }

  function closeRules() {
    rulesVisible.value = false;
  }

  function toggleRules() {
    rulesVisible.value = !rulesVisible.value;
  }

  function onKeyDown(event: KeyboardEvent) {
    const key = event.key;

    if (key === 'ArrowLeft') {
      unlockAudio();
      controls.left = true;
      event.preventDefault();
      return;
    }

    if (key === 'ArrowRight') {
      unlockAudio();
      controls.right = true;
      event.preventDefault();
      return;
    }

    if ((key === 'Enter' || key === ' ') && isIdle.value) {
      event.preventDefault();
      startGame();
      return;
    }

    if ((key === 'Enter' || key === ' ') && isEnded.value) {
      event.preventDefault();
      replayGame();
      return;
    }

    if (key.toLowerCase() === 'r' && !isPlaying.value) {
      event.preventDefault();
      toggleRules();
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      controls.left = false;
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      controls.right = false;
      event.preventDefault();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    rafId = window.requestAnimationFrame(frameLoop);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    for (const timerId of timeoutIds) {
      window.clearTimeout(timerId);
    }
    timeoutIds.clear();
  });

  return {
    state,
    controls,
    feedback,
    rulesVisible,
    isIdle,
    isPlaying,
    isEnded,
    weightRows,
    startGame,
    replayGame,
    goHome,
    openRules,
    closeRules,
    toggleRules,
    setMovePressed,
  };
}
