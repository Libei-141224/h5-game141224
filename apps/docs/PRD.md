# 接金币大挑战 PRD

## 1. 项目概述
- 项目名称：接金币大挑战（Coin Catch Challenge）
- 项目路径：`<your_project_path>/coin-catch-challenge`
- 技术栈：Nuxt + Vue + TypeScript + Vite +（shadcn-vue 或 Nuxt UI v3）+ Tailwind
- 目标：实现桌面浏览器优先的接金币小游戏，包含金币/大金币/炸弹、60 秒倒计时、本地最高分持久化与侧边栏结算页。

## 2. 目标与范围
### 2.1 目标
- 提供可直接游玩的接金币核心玩法（左右移动接物体）。
- 通过炸弹即时失败机制提升紧张感与可重复游玩性。
- 提供清晰的 UI 状态（开始页/进行页/侧边栏结算）。
- 支持本地最高分持久化（`localStorage`）。
- 玩法参数可配置（掉落频率、概率、速度等，便于调参）。

### 2.2 范围内
- 桌面浏览器优先（Chrome/Edge/Firefox 新版）。
- 键盘操控：`←/→` 移动。
- 分数系统（金币/大金币）。
- 倒计时系统（60 秒）。
- 掉落物生成系统（金币/大金币/炸弹）。
- 碰撞判定与结束结算（时间到/炸弹）。
- 侧边栏结算页：本局得分、历史最高分、再玩一次。
- 本地存档（`localStorage`）。

### 2.3 范围外
- 联网排行榜/账号系统。
- 复杂音效系统与背景音乐（MVP 不做；可选简单音效后续加）。
- 移动端触控优先（后续再做虚拟摇杆/触控）。

## 3. 核心玩法规则
### 3.1 场景与基础参数
- 游戏视口：自适应容器（建议固定比例，例如 9:16 或 3:4，桌面居中）。
- 玩家角色：位于底部，可水平移动，不能移出左右边界。
- 单局时长：`60s`。
- 初始分数：`0`。
- 掉落物类型：
  - `COIN`：金币（+10）
  - `BIG_COIN`：大金币（+30，随机出现）
  - `BOMB`：炸弹（致命）

### 3.2 动态难度（可选，MVP 可先固定）
> 若你想先保持简单，可先不启用，只保留配置位。
- 难度增强方式（任选其一，建议先做 A）：
  - A：随时间增加下落速度（例如每 10s 速度 +5%）
  - B：随分数增加生成频率（缩短生成间隔）
- 下限/上限：
  - 生成间隔不低于 `250ms`
  - 下落速度不高于 `maxSpeedPxPerSec`

### 3.3 得分规则
- 接到金币：`+10` 分
- 接到大金币：`+30` 分
- 掉落物未接到离开底部：销毁，不扣分、不惩罚

### 3.4 炸弹规则
- 接到炸弹：❌ 游戏立即结束（优先级最高）
- 结束时停止：
  - 掉落物生成
  - 掉落物位置更新
  - 计时器更新（保持 final state）

### 3.5 输入规则
- `ArrowLeft` / `ArrowRight`：左右移动
- 长按连续移动；松开停止（或使用速度与 deltaTime 模拟平滑）
- 禁止越界：玩家角色碰到边界不再移动

## 4. 掉落物系统
### 4.1 生成与存在规则
- 掉落物可同时存在多个（上限建议：`maxDropsOnScreen`，防止性能问题）。
- 生成频率（可配置）：
  - 默认：每 `600ms` 生成 1 个掉落物
  - 可调范围：`250ms ~ 1200ms`
- 生成位置：
  - 生成于顶部 `y = 0`
  - `x` 在场景宽度范围内随机
  - 可设置与边界的 padding（避免贴边）
- 销毁规则：
  - 掉落物 `y > bottom` 未接到：销毁
  - 接到后立即销毁

### 4.2 掉落物列表（MVP）
1. `COIN`（金币）
- 得分：`+10`

2. `BIG_COIN`（大金币）
- 得分：`+30`

3. `BOMB`（炸弹）
- 效果：立即结束

### 4.3 掉落物权重（可配置）
> 默认推荐权重（可后续根据难度调参）
- `COIN`: 80%
- `BIG_COIN`: 10%
- `BOMB`: 10%

## 5. 视觉与交互
- 风格：轻量卡通/清爽扁平风（MVP 先保证清晰辨识）。
- 开始页：
  - 游戏标题
  - 「开始游戏」主按钮
  - 「玩法说明」次按钮（弹窗/抽屉）
- 游戏页：
  - 顶部 HUD：分数、剩余时间
  - 中间：掉落物动画
  - 底部：玩家角色
- 结算侧边栏：
  - 本局得分
  - 历史最高分（新纪录提示）
  - 「再玩一次」按钮
- 反馈（可选但建议）：
  - 接到金币：轻量缩放/闪光
  - 接到大金币：更强的闪光/粒子（轻量）
  - 接到炸弹：屏幕抖动/红色闪烁（注意不过度）

## 6. 数据与状态
- 统一由 `useCoinCatchGame` 管理游戏状态、键盘监听与主循环。
- 推荐使用 `requestAnimationFrame` + deltaTime 驱动下落（更平滑），也可用 `setInterval`（更简单）。
- 运行时状态：
  - `score: number`
  - `timeLeft: number`（秒）
  - `status: 'idle' | 'playing' | 'ended'`
  - `player: { x: number; width: number; speed: number }`
  - `drops: DropInstance[]`
  - `config: GameConfig`（掉落频率/权重/速度等）
- 本地持久化：
  - 初始化读取 `bestScore`
  - 游戏结束时更新写回
  - 存储失败不影响游戏主流程

## 7. 核心接口（建议文件结构）
### 7.1 `src/game/types.ts`
- `DropType = 'COIN' | 'BIG_COIN' | 'BOMB'`
- `DropInstance = { id: string; type: DropType; x: number; y: number; speed: number }`
- `Player = { x: number; width: number; speed: number }`
- `GameConfig = { durationSec: number; spawnIntervalMs: number; dropWeights: Record<DropType, number>; baseDropSpeed: number; maxDropsOnScreen: number }`
- `GameState = { status; score; timeLeft; player; drops; config; bestScore }`

### 7.2 `src/game/engine.ts`
- `createInitialState(seed?: number): GameState`
- `start(state: GameState, now: number): GameState`
- `step(state: GameState, now: number): GameState`（推进时间/掉落位置/碰撞/结束判断）
- `move(state: GameState, dir: 'left' | 'right', now: number): GameState`
- `spawnDrop(state: GameState, now: number, seed?: number): GameState`
- `end(state: GameState, reason: 'time_up' | 'bomb'): GameState`
- `restart(state: GameState, seed?: number): GameState`

### 7.3 `src/storage/stats.ts`
- `loadStats(): { bestScore: number }`
- `saveStats(stats: { bestScore: number }): void`

## 8. 验收标准
### 8.1 功能验收
1. 开始页存在标题、「开始游戏」、「玩法说明」按钮，玩法说明可打开/关闭。
2. 点击「开始游戏」进入游戏页，`timeLeft` 从 60 开始倒计时。
3. `←/→` 可左右移动角色，角色不越界。
4. 接到金币：分数 +10；接到大金币：分数 +30；HUD 实时更新。
5. 接到炸弹：游戏立即结束，打开结算侧边栏。
6. 时间到 0：游戏结束，打开结算侧边栏。
7. 结算侧边栏展示本局得分与历史最高分；若破纪录显示提示。
8. 点击「再玩一次」重置状态并立即开始新一局（分数=0，时间=60，清空掉落物）。
9. 刷新页面后历史最高分仍存在（localStorage 持久化）。

### 8.2 测试验收（建议最小单测覆盖）
- 初始状态（idle，score=0，timeLeft=60，drops 为空）
- 计时推进与 time_up 结束
- 生成逻辑：数量上限、权重分布（可用 mock seed）
- 碰撞判定：coin/big_coin 加分；bomb 结束
- 越界限制：player 不可超出左右边界
- restart：状态完全重置
- 本地存储：读取/写入与容错

## 9. 非功能要求
- 优先稳定可玩：低端电脑也能流畅（限制同时掉落物上限）。
- 存储异常不阻塞主流程。
- 结构可扩展：后续可加在线排行榜、难度曲线、道具系统、皮肤系统。