/**
 * Main Web Application Controller & Canvas Renderer for RL Maze Studio
 */

let maze;
let agent;
let isRunning = false;
let animFrameId = null;
let speedMode = 1; // 1: Normal, 5: Fast, 20: Turbo, 100: Max Train
let autoRegenMaze = false;
let autoTuneEnabled = false;
let parameterController = new ParameterController();
const tuningControls = [
  ['rewardGoal', 'valGoal', 'goal'], ['penaltyStep', 'valStep', 'step'],
  ['penaltyWall', 'valWall', 'wall'], ['penaltyDeadEnd', 'valDeadEnd', 'deadEnd'],
  ['penaltyRevisit', 'valRevisit', 'revisit'], ['rewardDistance', 'valDistance', 'distanceShaping'],
  ['paramAlpha', 'valAlpha', 'alpha'], ['paramGamma', 'valGamma', 'gamma'],
  ['paramEpsilon', 'valEpsilon', 'epsilon']
];
let showHeatmap = true;
let showPolicyArrows = true;
let showSensors = true;
let selectedCell = { r: 1, c: 1 };
let editMode = 'inspect'; // 'inspect', 'wall', 'start', 'goal'

// Performance & Analytics Tracking
let episodeCount = 0;
let totalWins = 0;
let metricsHistory = []; // { episode, reward, steps, success }
const MAX_METRICS_HISTORY = 100;

// Canvas Elements
let mazeCanvas, ctx;
let chartCanvas, chartCtx;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  mazeCanvas = document.getElementById('mazeCanvas');
  ctx = mazeCanvas.getContext('2d');

  chartCanvas = document.getElementById('analyticsChart');
  chartCtx = chartCanvas.getContext('2d');

  // Create Initial Maze & Agent
  const gridDim = parseInt(document.getElementById('mazeSizeSelect').value) || 11;
  const mazeType = document.getElementById('mazeTypeSelect').value || 'dfs';

  maze = new Maze(gridDim, gridDim);
  maze.generate(mazeType);

  agent = new QLearningAgent(maze);

  // Setup Canvas Event Listeners
  mazeCanvas.addEventListener('click', handleCanvasClick);
  mazeCanvas.addEventListener('mousemove', handleCanvasHover);

  // Bind UI Controls
  bindUIEvents();

  // Initial Render & UI Update
  resizeCanvas();
  updateUI();
  renderMaze();
  renderChart();

  // Initialize Icons if Lucide is present
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Handle Window Resize
window.addEventListener('resize', () => {
  resizeCanvas();
  renderMaze();
  renderChart();
});

function resizeCanvas() {
  const container = mazeCanvas.parentElement;
  const size = Math.min(container.clientWidth - 24, 600);
  mazeCanvas.width = size;
  mazeCanvas.height = size;

  if (chartCanvas) {
    chartCanvas.width = chartCanvas.parentElement.clientWidth - 32;
    chartCanvas.height = 160;
  }
}

// Bind UI Input Sliders & Buttons
function bindUIEvents() {
  document.getElementById('toggleAutoTune').addEventListener('change', e => {
    autoTuneEnabled = e.target.checked;
    resetAutoTune();
    syncParameterControls();
  });
  // Reward Engine Inputs
  document.getElementById('rewardGoal').addEventListener('input', (e) => {
    agent.rewardsConfig.goal = parseFloat(e.target.value);
    document.getElementById('valGoal').textContent = agent.rewardsConfig.goal;
  });
  document.getElementById('penaltyStep').addEventListener('input', (e) => {
    agent.rewardsConfig.step = parseFloat(e.target.value);
    document.getElementById('valStep').textContent = agent.rewardsConfig.step;
  });
  document.getElementById('penaltyWall').addEventListener('input', (e) => {
    agent.rewardsConfig.wall = parseFloat(e.target.value);
    document.getElementById('valWall').textContent = agent.rewardsConfig.wall;
  });
  document.getElementById('penaltyDeadEnd').addEventListener('input', (e) => {
    agent.rewardsConfig.deadEnd = parseFloat(e.target.value);
    document.getElementById('valDeadEnd').textContent = agent.rewardsConfig.deadEnd;
  });
  document.getElementById('penaltyRevisit').addEventListener('input', (e) => {
    agent.rewardsConfig.revisit = parseFloat(e.target.value);
    document.getElementById('valRevisit').textContent = agent.rewardsConfig.revisit;
  });
  document.getElementById('rewardDistance').addEventListener('input', (e) => {
    agent.rewardsConfig.distanceShaping = parseFloat(e.target.value);
    document.getElementById('valDistance').textContent = agent.rewardsConfig.distanceShaping;
  });

  // Hyperparameters
  document.getElementById('paramAlpha').addEventListener('input', (e) => {
    agent.alpha = parseFloat(e.target.value);
    document.getElementById('valAlpha').textContent = agent.alpha.toFixed(2);
  });
  document.getElementById('paramGamma').addEventListener('input', (e) => {
    agent.gamma = parseFloat(e.target.value);
    document.getElementById('valGamma').textContent = agent.gamma.toFixed(2);
  });
  document.getElementById('paramEpsilon').addEventListener('input', (e) => {
    agent.epsilon = parseFloat(e.target.value);
    document.getElementById('valEpsilon').textContent = agent.epsilon.toFixed(2);
  });

  // Display Overlays Toggles
  document.getElementById('toggleHeatmap').addEventListener('change', (e) => {
    showHeatmap = e.target.checked;
    renderMaze();
  });
  document.getElementById('togglePolicy').addEventListener('change', (e) => {
    showPolicyArrows = e.target.checked;
    renderMaze();
  });
  document.getElementById('toggleSensors').addEventListener('change', (e) => {
    showSensors = e.target.checked;
    renderMaze();
  });
  document.getElementById('toggleAutoRegen').addEventListener('change', (e) => {
    autoRegenMaze = e.target.checked;
    resetAutoTune();
  });

  // Speed Mode Buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('bg-mint', 'text-black', 'font-bold'));
      btn.classList.add('bg-mint', 'text-black', 'font-bold');
      speedMode = parseInt(btn.dataset.speed);
    });
  });

  // Control Action Buttons
  document.getElementById('btnPlayPause').addEventListener('click', togglePlayPause);
  document.getElementById('btnStep').addEventListener('click', stepSimulation);
  document.getElementById('btnResetEpisode').addEventListener('click', resetEpisode);
  document.getElementById('btnResetQTable').addEventListener('click', resetQTable);
  document.getElementById('btnNewMaze').addEventListener('click', generateNewMaze);
  document.getElementById('btnSaveAI').addEventListener('click', saveTraining);
  document.getElementById('btnEvaluatePolicy').addEventListener('click', showPolicyEvaluation);
  document.getElementById('btnLoadAI').addEventListener('click', () => document.getElementById('trainingFile').click());
  document.getElementById('trainingFile').addEventListener('change', loadTraining);

  // Maze Dimensions & Types
  document.getElementById('mazeSizeSelect').addEventListener('change', generateNewMaze);
  document.getElementById('mazeTypeSelect').addEventListener('change', generateNewMaze);

  // Preset Buttons
  document.getElementById('btnPresetStandard').addEventListener('click', () => applyPreset('standard'));
  document.getElementById('btnPresetStrict').addEventListener('click', () => applyPreset('strict'));
  document.getElementById('btnPresetWallBumper').addEventListener('click', () => applyPreset('wallBumper'));
  document.getElementById('btnPresetGuided').addEventListener('click', () => applyPreset('guided'));

  // Edit Mode Buttons
  document.querySelectorAll('.edit-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edit-mode-btn').forEach(b => b.classList.remove('bg-white/20', 'border-mint'));
      btn.classList.add('bg-white/20', 'border-mint');
      editMode = btn.dataset.mode;
    });
  });

  // Modal Listeners
  document.getElementById('btnOpenGuide').addEventListener('click', () => {
    document.getElementById('guideModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseGuide').addEventListener('click', () => {
    document.getElementById('guideModal').classList.add('hidden');
  });
}

function syncParameterControls() {
  for (const [inputId, labelId, key] of tuningControls) {
    const value = key in agent.rewardsConfig ? agent.rewardsConfig[key] : agent[key];
    document.getElementById(inputId).value = value;
    document.getElementById(inputId).disabled = autoTuneEnabled;
    document.getElementById(labelId).textContent = key === 'epsilon' ? value.toFixed(3) : value;
  }
  for (const id of ['btnPresetStandard', 'btnPresetStrict', 'btnPresetWallBumper', 'btnPresetGuided']) {
    document.getElementById(id).disabled = autoTuneEnabled;
  }
  document.getElementById('autoTuneState').textContent = autoTuneEnabled ? 'ON' : 'OFF';
}

function resetAutoTune() {
  clearPolicyEvaluation();
  parameterController.resetWindow();
  document.getElementById('autoTuneStatus').textContent = autoTuneEnabled
    ? '실시간 관측 중 · 32스텝마다 조정 · 기존 조정 학습 유지'
    : '자동 조정 OFF · 현재 설정 유지 · 탐험율은 기존 방식으로 감소';
}

function stepExplorer() {
  clearPolicyEvaluation();
  const distance = maze.bfsDistanceMap[agent.r][agent.c];
  const result = agent.step();
  if (!autoTuneEnabled) return;
  const targets = parameterController.observe(distance, result, agent);
  if (!targets) {
    if (!Number.isFinite(distance)) document.getElementById('autoTuneStatus').textContent = '조정 대기: 도착점까지 연결된 경로가 없습니다.';
    return;
  }
  for (const [inputId, , key] of tuningControls) {
    const input = document.getElementById(inputId);
    const target = key in agent.rewardsConfig ? agent.rewardsConfig : agent;
    const min = Number(input.min), max = Number(input.max), step = Number(input.step);
    const next = target[key] + 0.2 * (targets[key] - target[key]);
    target[key] = Number(Math.min(max, Math.max(min, min + Math.round((next - min) / step) * step)).toFixed(3));
  }
  syncParameterControls();
  const mode = ['탐색', '균형', '경로 단축'][parameterController.active];
  document.getElementById('autoTuneStatus').textContent = '관측 기반 ' + mode + ' 조정 · 누적 ' + parameterController.updates + '회';
}

// Preset Configurator
function applyPreset(presetName) {
  if (presetName === 'standard') {
    setRewards({ goal: 100, step: -1, wall: -10, deadEnd: -15, revisit: -2, distance: 0 });
  } else if (presetName === 'strict') {
    setRewards({ goal: 100, step: -5, wall: -20, deadEnd: -25, revisit: -5, distance: 0 });
  } else if (presetName === 'wallBumper') {
    setRewards({ goal: 100, step: -1, wall: -30, deadEnd: -10, revisit: -1, distance: 0 });
  } else if (presetName === 'guided') {
    setRewards({ goal: 100, step: -1, wall: -10, deadEnd: -15, revisit: -2, distance: 1.0 });
  }
}

function setRewards(cfg) {
  agent.rewardsConfig.goal = cfg.goal;
  agent.rewardsConfig.step = cfg.step;
  agent.rewardsConfig.wall = cfg.wall;
  agent.rewardsConfig.deadEnd = cfg.deadEnd;
  agent.rewardsConfig.revisit = cfg.revisit;
  agent.rewardsConfig.distanceShaping = cfg.distance;

  document.getElementById('rewardGoal').value = cfg.goal;
  document.getElementById('valGoal').textContent = cfg.goal;
  document.getElementById('penaltyStep').value = cfg.step;
  document.getElementById('valStep').textContent = cfg.step;
  document.getElementById('penaltyWall').value = cfg.wall;
  document.getElementById('valWall').textContent = cfg.wall;
  document.getElementById('penaltyDeadEnd').value = cfg.deadEnd;
  document.getElementById('valDeadEnd').textContent = cfg.deadEnd;
  document.getElementById('penaltyRevisit').value = cfg.revisit;
  document.getElementById('valRevisit').textContent = cfg.revisit;
  document.getElementById('rewardDistance').value = cfg.distance;
  document.getElementById('valDistance').textContent = cfg.distance;
}

// Generate Fresh Maze
function generateNewMaze() {
  const gridDim = parseInt(document.getElementById('mazeSizeSelect').value) || 11;
  const mazeType = document.getElementById('mazeTypeSelect').value || 'dfs';

  const retainedSettings = explorerSettings(agent);
  maze = new Maze(gridDim, gridDim);
  maze.generate(mazeType);
  agent = new QLearningAgent(maze);
  applyExplorerSettings(agent, retainedSettings);

  episodeCount = 0;
  totalWins = 0;
  metricsHistory = [];
  selectedCell = { r: maze.start.r, c: maze.start.c };
  resetAutoTune();
  syncParameterControls();

  updateUI();
  renderMaze();
  renderChart();
}

function trainingSnapshot() {
  const { scores, counts, active, updates } = parameterController;
  return {
    format: 'rl-maze-training', version: 2, context: learningContext(maze),
    agent: { settings: explorerSettings(agent), qTable: agent.qTable },
    controller: { scores, counts, active, updates },
    episodeCount, totalWins, metricsHistory
  };
}

function showPolicyEvaluation() {
  if (isRunning) togglePlayPause();
  const result = evaluateLearnedPolicy(agent);
  const status = document.getElementById('policyEvaluationStatus');
  if (result.status === 'success') {
    status.textContent = '학습 경로 ' + result.steps + '스텝 / 실제 최단 ' + result.shortest + '스텝 · ' +
      (result.optimal ? '최단 경로 달성 (현재 시작·도착점 기준)' : '최단 경로보다 ' + (result.steps - result.shortest) + '스텝 더 이동');
  } else {
    const reasons = { unreachable: '도착점까지 연결된 경로 없음', loop: '학습 정책이 반복 경로에 빠짐', blocked: '이동 가능한 행동 없음', unlearned: '경로 중 아직 학습되지 않은 칸이 있음' };
    status.textContent = '최단 경로 미확인 · ' + reasons[result.status] +
      (Number.isFinite(result.shortest) ? ' · 실제 최단 ' + result.shortest + '스텝' : '');
  }
}

function clearPolicyEvaluation() {
  document.getElementById('policyEvaluationStatus').textContent = '평가 버튼으로 현재 Q-Table의 경로를 확인하세요.';
}

function saveTraining() {
  try {
    // JSON null explicitly represents masked (-Infinity) Q-values.
    const text = JSON.stringify(trainingSnapshot());
    decodeTraining(text, maze);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `maze-ai-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.getElementById('trainingStatus').textContent = 'AI 저장 파일 다운로드를 요청했습니다.';
  } catch (error) {
    document.getElementById('trainingStatus').textContent = '저장 실패: ' + error.message;
  }
}

let loadingTraining = false;
async function loadTraining(event) {
  const file = event.target.files[0];
  if (!file || loadingTraining) return;
  loadingTraining = true;
  document.getElementById('btnLoadAI').disabled = true;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('5MB 이하의 AI 저장 파일을 선택해 주세요.');
    const restored = decodeTraining(await file.text(), maze);
    if (isRunning) togglePlayPause();
    agent = restored.agent;
    parameterController = restored.controller;
    episodeCount = restored.data.episodeCount;
    totalWins = restored.data.totalWins;
    metricsHistory = restored.data.metricsHistory;
    selectedCell = { r: agent.r, c: agent.c };
    document.getElementById('toggleAutoTune').checked = autoTuneEnabled;
    document.getElementById('toggleAutoRegen').checked = autoRegenMaze;
    syncParameterControls();
    document.getElementById('autoTuneStatus').textContent = `조정 AI 복원 · 누적 ${parameterController.updates}회 · ${autoTuneEnabled ? 'ON' : 'OFF'}`;
    agent.lastEvent = '저장한 학습 상태 복원 완료';
    updateUI();
    renderMaze();
    renderChart();
    clearPolicyEvaluation();
    document.getElementById('trainingStatus').textContent = restored.compatible
      ? '학습 기록·Q-Table 복원 완료 · 현재 미로의 시작점에서 재개합니다.'
      : '에피소드·설정·조정 AI 복원 완료 · 환경이 달라 위치별 Q-Table은 초기화했습니다.';
  } catch (error) {
    document.getElementById('trainingStatus').textContent = '불러오기 실패: ' + error.message;
  } finally {
    event.target.value = '';
    loadingTraining = false;
    document.getElementById('btnLoadAI').disabled = false;
  }
}

// Reset Current Episode
function resetEpisode() {
  agent.resetState();
  updateUI();
  renderMaze();
}

// Reset Q-Table
function resetQTable() {
  agent.initQTable();
  agent.resetState();
  episodeCount = 0;
  totalWins = 0;
  metricsHistory = [];
  resetAutoTune();
  updateUI();
  renderMaze();
  renderChart();
}

// Toggle Play / Pause Simulation
function togglePlayPause() {
  isRunning = !isRunning;
  const btn = document.getElementById('btnPlayPause');

  if (isRunning) {
    btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4 mr-1"></i> 일시정지`;
    btn.classList.replace('bg-mint', 'bg-amber-500');
    btn.classList.replace('text-black', 'text-white');
    runLoop();
  } else {
    btn.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i> 학습 시작`;
    btn.classList.replace('bg-amber-500', 'bg-mint');
    btn.classList.replace('text-white', 'text-black');
    if (animFrameId) cancelAnimationFrame(animFrameId);
  }
  if (window.lucide) lucide.createIcons();
}

// Keep the existing limit through 21 x 21; allow larger maps more exploration.
function getEpisodeStepLimit() {
  return Math.max(400, Math.ceil(400 * maze.rows * maze.cols / (21 * 21)));
}

// Simulation Main Loop
function runLoop() {
  if (!isRunning) return;

  const stepsPerFrame = speedMode === 100 ? 50 : speedMode;

  for (let i = 0; i < stepsPerFrame; i++) {
    if (agent.isFinished || agent.steps >= getEpisodeStepLimit()) {
      finishEpisode();
      if (!isRunning) break;
    } else {
      stepExplorer();
    }
  }

  updateUI();
  renderMaze();

  if (isRunning) {
    animFrameId = requestAnimationFrame(runLoop);
  }
}

// Single Step Simulation Button
function stepSimulation() {
  if (agent.isFinished || agent.steps >= getEpisodeStepLimit()) {
    finishEpisode();
  } else {
    stepExplorer();
  }
  updateUI();
  renderMaze();
}

// Handle Episode Completion
function finishEpisode() {
  episodeCount++;
  if (agent.reachedGoal) totalWins++;

  metricsHistory.push({
    episode: episodeCount,
    reward: agent.totalReward,
    steps: agent.steps,
    success: agent.reachedGoal
  });

  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }

  if (!autoTuneEnabled) agent.decayEpsilon();

  if (autoRegenMaze) {
    const mazeType = document.getElementById('mazeTypeSelect').value;
    maze.generate(mazeType);
    agent.initQTable();
    resetAutoTune();
  }

  agent.resetState();
  renderChart();
}

// Update UI Labels & Inspector
function updateUI() {
  document.getElementById('paramEpsilon').value = agent.epsilon;
  document.getElementById('valEpsilon').textContent = agent.epsilon.toFixed(3);
  document.getElementById('statEpisode').textContent = episodeCount;
  document.getElementById('statSteps').textContent = agent.steps;
  document.getElementById('statReward').textContent = agent.totalReward.toFixed(1);

  const winRate = episodeCount > 0 ? ((totalWins / episodeCount) * 100).toFixed(1) : "0.0";
  document.getElementById('statWinRate').textContent = `${winRate}%`;

  document.getElementById('lblLastEvent').textContent = agent.lastEvent || "대기 중...";

  updateInspector();
}

// Update Cell Inspector Panel
function updateInspector() {
  const { r, c } = selectedCell;
  document.getElementById('inspectCoord').textContent = `(${r}, ${c})`;

  if (maze.isWall(r, c)) {
    document.getElementById('inspectType').textContent = "벽 (Wall)";
    document.getElementById('inspectType').className = "text-xs font-mono badge-crimson px-2 py-0.5 rounded";
    document.getElementById('qValuesContainer').innerHTML = `<div class="text-xs text-gray-500 py-4 text-center">벽 타일에는 Q-Value가 존재하지 않습니다.</div>`;
    return;
  }

  const isStart = r === maze.start.r && c === maze.start.c;
  const isGoal = r === maze.goal.r && c === maze.goal.c;

  let typeText = "일반 경로 (Path)";
  let typeClass = "badge-mint";
  if (isStart) { typeText = "시작점 (Start)"; typeClass = "badge-blue"; }
  if (isGoal) { typeText = "도착점 (Goal)"; typeClass = "badge-purple"; }

  document.getElementById('inspectType').textContent = typeText;
  document.getElementById('inspectType').className = `text-xs font-mono ${typeClass} px-2 py-0.5 rounded`;

  const qVals = agent.qTable[r][c];
  const validVals = qVals.filter(v => v !== -Infinity);
  const maxQ = validVals.length > 0 ? Math.max(...validVals) : -Infinity;

  const actions = [
    { label: '상 (UP)', val: qVals[0], icon: 'arrow-up', idx: 0 },
    { label: '우 (RIGHT)', val: qVals[1], icon: 'arrow-right', idx: 1 },
    { label: '하 (DOWN)', val: qVals[2], icon: 'arrow-down', idx: 2 },
    { label: '좌 (LEFT)', val: qVals[3], icon: 'arrow-left', idx: 3 }
  ];

  let html = `<div class="grid grid-cols-2 gap-2 mt-2">`;
  actions.forEach(a => {
    const isWallAction = a.val === -Infinity;
    const valText = isWallAction ? '벽 (Wall)' : a.val.toFixed(2);
    const isBest = !isWallAction && a.val === maxQ && maxQ !== -Infinity;
    const borderCls = isWallAction ? 'border-borderColor opacity-50 bg-surfaceDark' : (isBest ? 'border-mint bg-mint/10' : 'border-borderColor bg-surfaceCard');
    const textCls = isWallAction ? 'text-gray-500 font-mono text-[10px]' : (isBest ? 'text-mint font-bold' : 'text-gray-300');

    html += `
      <div class="p-2 rounded-lg border ${borderCls} flex items-center justify-between">
        <span class="text-xs text-gray-400 flex items-center gap-1">
          <i data-lucide="${a.icon}" class="w-3.5 h-3.5"></i> ${a.label}
        </span>
        <span class="text-xs font-mono ${textCls}">${valText}</span>
      </div>
    `;
  });
  html += `</div>`;

  document.getElementById('qValuesContainer').innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// Interactive Canvas Click & Hover Logic
function handleCanvasClick(e) {
  const rect = mazeCanvas.getBoundingClientRect();
  const cellWidth = rect.width / maze.cols;
  const cellHeight = rect.height / maze.rows;

  const c = Math.floor((e.clientX - rect.left) / cellWidth);
  const r = Math.floor((e.clientY - rect.top) / cellHeight);

  if (r >= 0 && r < maze.rows && c >= 0 && c < maze.cols) {
    selectedCell = { r, c };
    if (editMode !== 'inspect') resetAutoTune();

    if (editMode === 'wall') {
      // Toggle Wall
      if (!(r === maze.start.r && c === maze.start.c) && !(r === maze.goal.r && c === maze.goal.c)) {
        maze.grid[r][c] = maze.grid[r][c] === 1 ? 0 : 1;
        maze.computeBFSDistanceMap();
        agent.initQTable(); // Re-mask walls!
        agent.resetState();
      }
    } else if (editMode === 'start') {
      if (!maze.isWall(r, c) && !(r === maze.goal.r && c === maze.goal.c)) {
        maze.start = { r, c };
        agent.resetState();
        maze.computeBFSDistanceMap();
      }
    } else if (editMode === 'goal') {
      if (!maze.isWall(r, c) && !(r === maze.start.r && c === maze.start.c)) {
        maze.goal = { r, c };
        agent.resetState();
        maze.computeBFSDistanceMap();
      }
    }

    updateUI();
    renderMaze();
  }
}

function handleCanvasHover(e) {
  if (editMode !== 'inspect') return;
  const rect = mazeCanvas.getBoundingClientRect();
  const cellWidth = rect.width / maze.cols;
  const cellHeight = rect.height / maze.rows;

  const c = Math.floor((e.clientX - rect.left) / cellWidth);
  const r = Math.floor((e.clientY - rect.top) / cellHeight);

  if (r >= 0 && r < maze.rows && c >= 0 && c < maze.cols) {
    selectedCell = { r, c };
    updateInspector();
  }
}

// Render Canvas Maze & Policy Layers
function renderMaze() {
  if (!ctx) return;

  const width = mazeCanvas.width;
  const height = mazeCanvas.height;
  const cellW = width / maze.cols;
  const cellH = height / maze.rows;

  ctx.clearRect(0, 0, width, height);

  // Find Max Q for Heatmap Normalization
  let maxAbsQ = 0.1;
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      if (!maze.isWall(r, c)) {
        const validVals = agent.qTable[r][c].filter(v => v !== -Infinity);
        if (validVals.length > 0) {
          const maxQ = Math.max(...validVals);
          if (Math.abs(maxQ) > maxAbsQ && maxQ !== 0) maxAbsQ = Math.abs(maxQ);
        }
      }
    }
  }

  // 1. Draw Grid Cells & Heatmap
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const x = c * cellW;
      const y = r * cellH;

      if (maze.isWall(r, c)) {
        // Wall Cell Design
        ctx.fillStyle = '#141418';
        ctx.fillRect(x, y, cellW, cellH);

        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        // Subtle inner diagonal pattern for walls
        ctx.strokeStyle = '#202025';
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + cellW, y + cellH);
        ctx.stroke();
      } else {
        // Path Cell
        ctx.fillStyle = '#0B0B0E';
        ctx.fillRect(x, y, cellW, cellH);

        // Heatmap Overlay
        if (showHeatmap) {
          const { maxQ, isExplored } = agent.getBestAction(r, c);
          if (isExplored && maxQ !== 0 && maxQ !== -Infinity) {
            const intensity = Math.min(Math.abs(maxQ) / maxAbsQ, 1);
            if (maxQ > 0) {
              ctx.fillStyle = `rgba(16, 185, 129, ${intensity * 0.45})`; // Mint glow for positive Q
            } else {
              ctx.fillStyle = `rgba(239, 68, 68, ${intensity * 0.45})`; // Crimson glow for negative Q
            }
            ctx.fillRect(x, y, cellW, cellH);
          }
        }

        ctx.strokeStyle = '#1E1E24';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
  }

  // 2. Draw Policy Arrows (Only for non-wall actions!)
  if (showPolicyArrows) {
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        if (!maze.isWall(r, c) && !(r === maze.goal.r && c === maze.goal.c)) {
          const { bestAction } = agent.getBestAction(r, c);
          if (bestAction !== null) {
            const cx = c * cellW + cellW / 2;
            const cy = r * cellH + cellH / 2;
            drawPolicyArrow(cx, cy, bestAction, Math.min(cellW, cellH) * 0.35);
          }
        }
      }
    }
  }

  // 3. Highlight Selected Cell
  const selX = selectedCell.c * cellW;
  const selY = selectedCell.r * cellH;
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.strokeRect(selX + 1, selY + 1, cellW - 2, cellH - 2);

  // 4. Draw Start (S) & Goal (G) Icons/Badges
  drawCellBadge(maze.start.r, maze.start.c, 'S', '#3B82F6', cellW, cellH);
  drawCellBadge(maze.goal.r, maze.goal.c, 'G', '#8B5CF6', cellW, cellH);

  // 5. Draw Agent Sensors & Agent Body
  const agentX = agent.c * cellW + cellW / 2;
  const agentY = agent.r * cellH + cellH / 2;

  // Sensor Laser Rays
  if (showSensors) {
    const sensors = maze.getSensors(agent.r, agent.c);
    const dirs = [
      { dx: 0, dy: -cellH / 2 },
      { dx: cellW / 2, dy: 0 },
      { dx: 0, dy: cellH / 2 },
      { dx: -cellW / 2, dy: 0 }
    ];

    sensors.forEach((isWall, idx) => {
      ctx.strokeStyle = isWall ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = isWall ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(agentX, agentY);
      ctx.lineTo(agentX + dirs[idx].dx, agentY + dirs[idx].dy);
      ctx.stroke();
    });
  }

  // Agent Body Glow
  const radius = Math.min(cellW, cellH) * 0.28;
  const grad = ctx.createRadialGradient(agentX, agentY, 2, agentX, agentY, radius * 1.8);
  grad.addColorStop(0, '#34D399');
  grad.addColorStop(0.6, '#10B981');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(agentX, agentY, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(agentX, agentY, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Helper: Draw Policy Arrow in Cell Center
function drawPolicyArrow(cx, cy, action, size) {
  ctx.save();
  ctx.translate(cx, cy);

  // Rotate arrow based on action: 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  ctx.rotate(angles[action]);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-size / 2, 0);
  ctx.lineTo(size / 2, 0);
  ctx.lineTo(size / 4, -size / 3);
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 4, size / 3);
  ctx.stroke();

  ctx.restore();
}

// Helper: Draw Start / Goal Badge
function drawCellBadge(r, c, label, color, cellW, cellH) {
  const x = c * cellW;
  const y = r * cellH;

  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(cellH * 0.45)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + cellW / 2, y + cellH / 2);
}

// Render Custom Canvas Analytics Chart
function renderChart() {
  if (!chartCtx) return;

  const w = chartCanvas.width;
  const h = chartCanvas.height;

  chartCtx.clearRect(0, 0, w, h);

  if (metricsHistory.length < 2) {
    chartCtx.fillStyle = '#71717A';
    chartCtx.font = '12px Inter, sans-serif';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('에피소드 학습 데이터 수집 중...', w / 2, h / 2);
    return;
  }

  const padding = 30;
  const plotW = w - padding * 2;
  const plotH = h - padding * 2;

  // Draw Grid Lines
  chartCtx.strokeStyle = '#27272A';
  chartCtx.lineWidth = 1;
  chartCtx.beginPath();
  chartCtx.moveTo(padding, padding);
  chartCtx.lineTo(padding, h - padding);
  chartCtx.lineTo(w - padding, h - padding);
  chartCtx.stroke();

  // Compute Scales
  const maxReward = Math.max(...metricsHistory.map(m => m.reward), 10);
  const minReward = Math.min(...metricsHistory.map(m => m.reward), -100);
  const rangeReward = maxReward - minReward || 1;

  // Plot Total Reward Line
  chartCtx.strokeStyle = '#10B981';
  chartCtx.lineWidth = 2;
  chartCtx.beginPath();

  metricsHistory.forEach((m, idx) => {
    const x = padding + (idx / (metricsHistory.length - 1)) * plotW;
    const y = h - padding - ((m.reward - minReward) / rangeReward) * plotH;
    if (idx === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();

  // Labels
  chartCtx.fillStyle = '#A1A1AA';
  chartCtx.font = '10px Inter, sans-serif';
  chartCtx.textAlign = 'left';
  chartCtx.fillText(`최고 보상: ${maxReward.toFixed(0)}`, padding, padding - 8);
  chartCtx.textAlign = 'right';
  chartCtx.fillText(`에피소드 #${metricsHistory[metricsHistory.length - 1].episode}`, w - padding, h - padding + 16);
}
