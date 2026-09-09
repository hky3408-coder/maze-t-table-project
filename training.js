// An online bandit controller learns which bounded parameter profile helps the explorer.
// Scores use distance progress, revisits and goal completion, never raw reward totals.
class ParameterController {
  constructor() {
    this.scores = [0, 0, 0];
    this.counts = [0, 0, 0];
    this.active = 0;
    this.updates = 0;
    this.resetWindow();
  }

  resetWindow() { this.observations = 0; this.progress = 0; this.repeats = 0; this.goals = 0; }

  observe(before, result, explorer) {
    if (!result) return null;
    const map = explorer.maze;
    const after = map.bfsDistanceMap[explorer.r][explorer.c];
    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      this.resetWindow();
      return null;
    }
    this.observations++;
    this.progress += Math.max(-1, Math.min(1, before - after));
    this.repeats += (explorer.visitedCells.get(`${explorer.r},${explorer.c}`) || 0) > 1 ? 1 : 0;
    this.goals += result.reachedGoal ? 1 : 0;
    if (this.observations < 32 && !result.isFinished) return null;
    const score = this.progress / this.observations - 0.25 * this.repeats / this.observations + this.goals;
    const n = ++this.counts[this.active];
    this.scores[this.active] += (score - this.scores[this.active]) * Math.max(0.1, 1 / n);
    this.updates++;
    const untried = this.counts.findIndex(count => count === 0);
    this.active = untried >= 0 ? untried : this.scores.reduce((best, value, i) => {
      const confidence = j => this.scores[j] + 0.35 * Math.sqrt(Math.log(this.updates + 1) / this.counts[j]);
      return confidence(i) > confidence(best) ? i : best;
    }, 0);
    this.resetWindow();
    return this.targets(map);
  }

  targets(map) {
    const distance = map.bfsDistanceMap[map.start.r][map.start.c];
    const profiles = [
      { step: -0.5, deadEnd: -2, revisit: -0.5, distanceShaping: 2, alpha: 0.35, epsilon: 0.35 },
      { step: -1, deadEnd: -4, revisit: -1, distanceShaping: 1.5, alpha: 0.25, epsilon: 0.15 },
      { step: -1.5, deadEnd: -5, revisit: -1, distanceShaping: 0.5, alpha: 0.1, epsilon: 0.03 }
    ];
    return { ...profiles[this.active], goal: Math.min(500, Math.max(100, distance * 3)), wall: -10,
      gamma: Math.min(0.99, Math.max(0.95, 1 - 1 / Math.max(20, distance))) };
  }
}

const PARAMETER_LIMITS = {
  goal: [10, 500], step: [-20, 0], wall: [-50, 0], deadEnd: [-50, 0], revisit: [-20, 0],
  distanceShaping: [0, 5], alpha: [0.01, 1], gamma: [0.5, 0.99], epsilon: [0, 1]
};

function explorerSettings(explorer) {
  return { ...explorer.rewardsConfig, alpha: explorer.alpha, gamma: explorer.gamma, epsilon: explorer.epsilon };
}

function applyExplorerSettings(explorer, settings) {
  for (const key of Object.keys(PARAMETER_LIMITS)) {
    if (key in explorer.rewardsConfig) explorer.rewardsConfig[key] = settings[key];
    else explorer[key] = settings[key];
  }
}

// A compact compatibility identifier, not a saved map or layout.
function learningContext(map) {
  const text = JSON.stringify([map.rows, map.cols, map.grid, map.start, map.goal]);
  let hash = 14695981039346656037n;
  for (let i = 0; i < text.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 1099511628211n);
  return hash.toString(16).padStart(16, '0');
}

// Evaluate a fixed greedy policy without exploration, Q updates or shortest-path hints.
function evaluateLearnedPolicy(explorer) {
  const map = explorer.maze;
  const shortest = map.bfsDistanceMap[map.start.r][map.start.c];
  let { r, c } = map.start;
  let steps = 0;
  const visited = new Set();
  const result = status => ({ status, steps, shortest, optimal: status === 'success' && steps === shortest });
  if (!Number.isFinite(shortest)) return result('unreachable');
  while (r !== map.goal.r || c !== map.goal.c) {
    const key = r + ',' + c;
    if (visited.has(key)) return result('loop');
    visited.add(key);
    let action = -1, best = -Infinity;
    for (let a = 0; a < 4; a++) {
      const dir = explorer.actionDirs[a];
      const q = explorer.qTable[r][c][a];
      if (!map.isWall(r + dir.dr, c + dir.dc) && Number.isFinite(q) && q > best) { best = q; action = a; }
    }
    if (action < 0) return result('blocked');
    if (explorer.qTable[r][c].filter(Number.isFinite).every(v => v === 0)) return result('unlearned');
    r += explorer.actionDirs[action].dr;
    c += explorer.actionDirs[action].dc;
    steps++;
  }
  return result('success');
}

// Validate all learned data before applying it to the currently displayed environment.
function decodeTraining(text, currentMaze) {
  let data = JSON.parse(text);
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const finite = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const integer = (v, min, max) => Number.isSafeInteger(v) && finite(v, min, max);
  const settingsValid = s => s && Object.entries(PARAMETER_LIMITS).every(([key, [min, max]]) => finite(s[key], min, max));
  check(data && data.format === 'rl-maze-training' && [1, 2].includes(data.version), '지원하지 않는 저장 형식입니다.');
  // Read earlier saves as learning imports; never replace the current environment.
  if (data.version === 1) {
    const m = data.maze;
    check(m && [7,11,15,21,49].includes(m.rows) && m.cols === m.rows && Array.isArray(m.grid) && m.grid.length === m.rows && m.grid.every(row => Array.isArray(row) && row.length === m.cols && row.every(v => v === 0 || v === 1)), '이전 파일의 미로 데이터가 손상되었습니다.');
    const position = p => p && integer(p.r, 0, m.rows - 1) && integer(p.c, 0, m.cols - 1) && m.grid[p.r][p.c] === 0;
    check(position(m.start) && position(m.goal), '이전 파일의 학습 위치가 올바르지 않습니다.');
    data = { format: data.format, version: 2, context: learningContext(m),
      agent: { settings: data.agent?.settings, qTable: data.agent?.qTable },
      controller: data.controller, episodeCount: data.episodeCount, totalWins: data.totalWins, metricsHistory: data.metricsHistory };
  }
  check(typeof data.context === 'string' && /^[0-9a-f]{16}$/.test(data.context), '학습 환경 식별값이 올바르지 않습니다.');
  const a = data.agent;
  check(a && settingsValid(a.settings), '학습 설정 범위를 확인해 주세요.');
  check(Array.isArray(a.qTable) && [7,11,15,21,49].includes(a.qTable.length) && a.qTable.every(row => Array.isArray(row) && row.length === a.qTable.length && row.every(cell => Array.isArray(cell) && cell.length === 4 && cell.every(v => v === null || finite(v, -1e12, 1e12)))), 'Q-Table 크기 또는 값이 올바르지 않습니다.');
  const restoredAgent = new QLearningAgent(currentMaze);
  applyExplorerSettings(restoredAgent, a.settings);
  const compatible = data.context === learningContext(currentMaze);
  if (compatible) {
    check(a.qTable.length === currentMaze.rows && a.qTable.every((row, r) => row.every((cell, c) => cell.every((v, action) => restoredAgent.qTable[r][c][action] === -Infinity ? v === null : v !== null))), 'Q-Table과 현재 환경이 일치하지 않습니다.');
    restoredAgent.qTable = a.qTable.map(row => row.map(cell => cell.map(v => v === null ? -Infinity : v)));
  }
  const t = data.controller;
  check(t && Array.isArray(t.scores) && t.scores.length === 3 && t.scores.every(v => finite(v, -2, 2)) && Array.isArray(t.counts) && t.counts.length === 3 && t.counts.every(v => integer(v, 0, 1e9)), '조정기 학습 기록이 올바르지 않습니다.');
  check(integer(t.active, 0, 2) && integer(t.updates, 0, 1e9) && t.counts.reduce((sum, v) => sum + v, 0) === t.updates, '조정 횟수가 올바르지 않습니다.');
  const controller = new ParameterController();
  for (const key of ['scores', 'counts', 'active', 'updates']) controller[key] = t[key];
  check(integer(data.episodeCount, 0, 1e9) && integer(data.totalWins, 0, data.episodeCount), '학습 통계가 올바르지 않습니다.');
  check(Array.isArray(data.metricsHistory) && data.metricsHistory.length <= 100 && data.metricsHistory.every(v => v && integer(v.episode, 1, data.episodeCount) && integer(v.steps, 0, 1e9) && finite(v.reward, -1e12, 1e12) && typeof v.success === 'boolean'), '학습 그래프가 올바르지 않습니다.');
  return { data, agent: restoredAgent, controller, compatible };
}
