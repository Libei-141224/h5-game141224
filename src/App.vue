<script setup lang="ts">
import { computed } from 'vue';
import { getPlayerTop } from './game/engine';
import type { DropInstance, DropType } from './game/types';
import { useCoinCatchGame } from './composables/useCoinCatchGame';

const {
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
  setMovePressed,
} = useCoinCatchGame();

const typeLabelMap: Record<DropType, string> = {
  COIN: '金币',
  BIG_COIN: '大金币',
  BOMB: '炸弹',
};

const typeShortLabelMap: Record<DropType, string> = {
  COIN: 'COIN',
  BIG_COIN: 'BIG',
  BOMB: 'BOMB',
};

const typeScoreMap: Partial<Record<DropType, string>> = {
  COIN: '+10',
  BIG_COIN: '+30',
};

const scoreText = computed(() => String(state.value.score).padStart(4, '0'));
const bestScoreText = computed(() => String(state.value.bestScore));
const timeText = computed(() => `${state.value.timeLeft}s`);

const playStatusTag = computed(() => (isEnded.value ? '已结束' : '进行中'));
const topRightTag = computed(() => {
  if (!isEnded.value) return 'Desktop 优先';
  return state.value.endReason === 'bomb' ? '炸弹命中' : '时间结束';
});

const endReasonTitle = computed(() => {
  return state.value.endReason === 'bomb' ? '命中炸弹' : '倒计时结束';
});

const endReasonDescription = computed(() => {
  if (state.value.endReason === 'bomb') {
    return '命中炸弹后游戏立即结束，计时与掉落更新停止，并保留最终状态。';
  }
  return '倒计时归零后结束回合，打开结算侧栏展示本局与历史最高分。';
});

const fieldStyle = computed(() => ({
  width: `${state.value.config.fieldWidth}px`,
  height: `${state.value.config.fieldHeight}px`,
}));

const playerStyle = computed(() => ({
  width: `${state.value.player.width}px`,
  height: `${state.value.player.height}px`,
  transform: `translate(${state.value.player.x}px, ${getPlayerTop(state.value)}px)`,
}));

const floorStyle = computed(() => ({
  width: `${Math.max(0, state.value.config.fieldWidth - 28)}px`,
}));

const gameCardFxStyle = computed(() => {
  if (feedback.shakeMode === 'none') {
    return undefined;
  }

  const parity = feedback.shakeTick % 2 === 0 ? 'a' : 'b';
  const animationNameMap = {
    soft: `shake-soft-${parity}`,
    medium: `shake-medium-${parity}`,
    hard: `shake-hard-${parity}`,
  } as const;
  const durationMap = {
    soft: '180ms',
    medium: '230ms',
    hard: '420ms',
  } as const;

  return {
    animationName: animationNameMap[feedback.shakeMode],
    animationDuration: durationMap[feedback.shakeMode],
    animationTimingFunction: feedback.shakeMode === 'hard' ? 'cubic-bezier(.25,.7,.2,1)' : 'ease-out',
    animationIterationCount: '1',
  };
});

function dropClass(drop: DropInstance) {
  if (drop.type === 'BIG_COIN') return 'drop drop--big-coin';
  if (drop.type === 'BOMB') return 'drop drop--bomb';
  return 'drop drop--coin';
}

function dropStyle(drop: DropInstance) {
  return {
    width: `${drop.size}px`,
    height: `${drop.size}px`,
    transform: `translate(${drop.x}px, ${drop.y}px)`,
  };
}

function particleStyle(particle: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}) {
  return {
    width: `${particle.size}px`,
    height: `${particle.size}px`,
    left: `${particle.x}px`,
    top: `${particle.y}px`,
    '--dx': `${particle.dx}px`,
    '--dy': `${particle.dy}px`,
  } as Record<string, string>;
}

function popupStyle(popup: { x: number; y: number }) {
  return {
    left: `${popup.x}px`,
    top: `${popup.y}px`,
  };
}
</script>

<template>
  <main class="app-shell">
    <div class="ambient ambient--a" aria-hidden="true"></div>
    <div class="ambient ambient--b" aria-hidden="true"></div>

    <section class="canvas">
      <header class="canvas-head">
        <div>
          <p class="canvas-kicker">Coin Catch Challenge</p>
          <h1 class="canvas-title">接金币大挑战</h1>
          <p class="canvas-subtitle">按 PRD + UI 状态设计实现（开始页 / 游戏进行页 / 结算侧边栏）</p>
        </div>
      </header>

      <section v-if="isIdle" class="panel start-state">
        <div class="chip-row">
          <span class="chip chip--warm">准备开始</span>
          <span class="chip chip--indigo">最高分 {{ state.bestScore }}</span>
        </div>

        <h2 class="state-title">接金币大挑战</h2>
        <p class="state-desc">
          60 秒内接住金币，避开炸弹。桌面键盘 ← / → 操作，支持本地最高分持久化。
        </p>

        <div class="preview-shell">
          <div class="preview-hud">
            <div class="mini-chip mini-chip--teal">Score 000</div>
            <div class="mini-chip mini-chip--amber">60s</div>
          </div>
          <div class="preview-field" aria-hidden="true">
            <div class="drop drop--coin is-preview" style="transform: translate(54px, 70px); width: 28px; height: 28px"></div>
            <div class="drop drop--big-coin is-preview" style="transform: translate(266px, 102px); width: 44px; height: 44px"></div>
            <div class="drop drop--bomb is-preview" style="transform: translate(180px, 64px); width: 36px; height: 36px">
              <span>!</span>
            </div>
            <div class="preview-player" style="transform: translate(148px, 218px)"></div>
            <div class="preview-key-hint">← / → 移动</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn--primary" type="button" @click="startGame">开始游戏</button>
          <button class="btn btn--ghost" type="button" @click="openRules">玩法说明</button>
        </div>

        <section class="tips-card" aria-label="玩法要点">
          <h3>玩法要点</h3>
          <ul>
            <li>金币 +10，大金币 +30</li>
            <li>接到炸弹立即结束</li>
            <li>60 秒倒计时结束自动结算</li>
          </ul>
        </section>
      </section>

      <section v-else class="play-layout">
        <section class="panel play-state" :class="{ 'is-ended': isEnded }">
          <div class="chip-row chip-row--tight">
            <span class="chip" :class="isEnded ? 'chip--rose' : 'chip--blue'">{{ playStatusTag }}</span>
            <span class="chip" :class="isEnded ? 'chip--amber' : 'chip--teal'">{{ topRightTag }}</span>
          </div>

          <div class="game-card" :style="gameCardFxStyle">
            <div class="hud">
              <div class="mini-chip mini-chip--teal">分数 {{ scoreText }}</div>
              <div class="mini-chip" :class="isEnded ? 'mini-chip--rose-soft' : 'mini-chip--amber'">
                {{ isEnded ? `终止 ${timeText}` : `剩余 ${timeText}` }}
              </div>
            </div>

            <div
              class="field"
              :class="{
                'field--ended': isEnded,
                'field--bomb': isEnded && state.endReason === 'bomb',
              }"
              :style="fieldStyle"
              aria-label="游戏区域"
            >
              <div
                v-for="drop in state.drops"
                :key="drop.id"
                :class="dropClass(drop)"
                :style="dropStyle(drop)"
              >
                <span v-if="drop.type === 'BOMB'">!</span>
              </div>

              <div
                v-for="flash in feedback.flashes"
                :key="flash.id"
                class="fx-flash"
                :class="`fx-flash--${flash.kind}`"
                aria-hidden="true"
              ></div>

              <div class="fx-overlay" aria-hidden="true">
                <div
                  v-for="particle in feedback.particles"
                  :key="particle.id"
                  class="fx-particle"
                  :class="`fx-particle--${particle.tone}`"
                  :style="particleStyle(particle)"
                ></div>
                <div
                  v-for="popup in feedback.scorePopups"
                  :key="popup.id"
                  class="fx-score-popup"
                  :class="`fx-score-popup--${popup.tone}`"
                  :style="popupStyle(popup)"
                >
                  {{ popup.text }}
                </div>
              </div>

              <div v-if="isEnded && state.endReason === 'bomb'" class="field-flash" aria-hidden="true"></div>
              <div v-if="isEnded" class="field-dim" aria-hidden="true"></div>
              <div v-if="isEnded && state.endReason === 'bomb'" class="boom-badge">BOOM!</div>

              <div class="floor-bar" :style="floorStyle" aria-hidden="true"></div>
              <div class="player-bar" :style="playerStyle" aria-hidden="true"></div>
            </div>

            <div class="kbd-bar">
              <button
                class="key-btn"
                type="button"
                :class="{ 'is-active': controls.left }"
                @pointerdown="setMovePressed('left', true)"
                @pointerup="setMovePressed('left', false)"
                @pointerleave="setMovePressed('left', false)"
                @pointercancel="setMovePressed('left', false)"
              >
                ←
              </button>
              <button
                class="key-btn"
                type="button"
                :class="{ 'is-active': controls.right }"
                @pointerdown="setMovePressed('right', true)"
                @pointerup="setMovePressed('right', false)"
                @pointerleave="setMovePressed('right', false)"
                @pointercancel="setMovePressed('right', false)"
              >
                →
              </button>
              <p class="kbd-hint">
                {{ isPlaying ? '长按连续移动，松开停止' : '按 Enter 可快速开始/再玩一局，R 键打开玩法说明' }}
              </p>
            </div>
          </div>
        </section>

        <aside class="panel side-panel" :class="{ 'side-panel--ended': isEnded }">
          <template v-if="!isEnded">
            <h3 class="side-title">回合信息</h3>

            <section class="info-card">
              <h4>实时状态</h4>
              <p>状态: {{ state.status }}</p>
              <p>掉落间隔: {{ state.config.spawnIntervalMs }}ms</p>
              <p>同屏上限: {{ state.config.maxDropsOnScreen }}</p>
            </section>

            <section class="info-card">
              <h4>掉落权重</h4>
              <p v-for="row in weightRows" :key="row.type">
                {{ typeShortLabelMap[row.type] }} {{ row.weight }}%
              </p>
            </section>

            <section class="info-card">
              <h4>图例</h4>
              <p v-for="row in weightRows" :key="`${row.type}-legend`">
                {{ typeLabelMap[row.type] }}
                <span v-if="typeScoreMap[row.type]">{{ typeScoreMap[row.type] }}</span>
                <span v-else>立即结束</span>
              </p>
            </section>

            <section class="warn-card">
              注意：接到炸弹会立即结束当前回合，并打开结算侧栏。
            </section>

            <div class="side-actions">
              <button class="btn btn--ghost" type="button" @click="openRules">玩法说明</button>
              <button class="btn btn--white" type="button" @click="goHome">返回开始页</button>
            </div>
          </template>

          <template v-else>
            <h3 class="side-title side-title--result">结算结果</h3>
            <p class="result-sub">显示本局得分、历史最高分与再玩一次入口</p>

            <section class="result-card result-card--score">
              <p class="result-label">本局得分</p>
              <p class="result-score">{{ state.score }}</p>
            </section>

            <section class="result-card">
              <p class="result-label result-label--dark">历史最高分</p>
              <p class="result-best">{{ bestScoreText }}</p>
            </section>

            <p v-if="state.newRecord" class="record-badge">新纪录 + 已保存</p>

            <section class="info-card result-reason">
              <h4>结束原因</h4>
              <p class="reason-title">{{ endReasonTitle }}</p>
              <p class="reason-body">{{ endReasonDescription }}</p>
            </section>

            <div class="side-actions">
              <button class="btn btn--primary" type="button" @click="replayGame">再玩一次</button>
              <button class="btn btn--white" type="button" @click="goHome">返回开始页</button>
            </div>
          </template>
        </aside>
      </section>
    </section>

    <div
      v-if="rulesVisible"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      @click.self="closeRules"
    >
      <div class="modal-panel">
        <div class="modal-head">
          <div>
            <p class="canvas-kicker">Rulebook</p>
            <h3 id="rules-title" class="modal-title">玩法说明</h3>
          </div>
          <button class="icon-btn" type="button" aria-label="关闭玩法说明" @click="closeRules">×</button>
        </div>

        <div class="modal-grid">
          <section class="modal-card">
            <h4>目标</h4>
            <p>60 秒内尽可能多接金币，避免炸弹。桌面键盘左右方向键控制角色移动。</p>
          </section>
          <section class="modal-card">
            <h4>得分规则</h4>
            <ul>
              <li>金币：+10</li>
              <li>大金币：+30</li>
              <li>炸弹：立即结束</li>
            </ul>
          </section>
          <section class="modal-card">
            <h4>机制说明</h4>
            <ul>
              <li>掉落物按权重随机生成（COIN 80% / BIG 10% / BOMB 10%）</li>
              <li>支持本地最高分持久化（localStorage）</li>
              <li>刷新页面后历史最高分仍保留</li>
            </ul>
          </section>
        </div>

        <div class="modal-actions">
          <button class="btn btn--primary" type="button" @click="isIdle ? startGame() : closeRules()">
            {{ isIdle ? '开始游戏' : '继续' }}
          </button>
          <button class="btn btn--ghost" type="button" @click="closeRules">关闭</button>
        </div>
      </div>
    </div>
  </main>
</template>
