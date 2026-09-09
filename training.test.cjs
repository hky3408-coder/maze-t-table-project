const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const elements = new Map();
for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
  const el = { value: '', textContent: '', disabled: false, listeners: {},
    classList: { replace() {} }, addEventListener(event, fn) { this.listeners[event] = fn; } };
  for (const attr of match[0].matchAll(/\b(min|max|step|value)="([^"]+)"/g)) el[attr[1]] = attr[2];
  elements.set(match[1], el);
}
let downloaded = false;
const context = vm.createContext({ Blob, URL, setTimeout,
  cancelAnimationFrame() {}, requestAnimationFrame() { return 1; },
  document: { addEventListener() {}, querySelectorAll() { return []; },
    getElementById(id) { assert(elements.has(id), id); return elements.get(id); },
    createElement() { return { click() { downloaded = true; }, remove() {} }; }, body: { appendChild() {} } },
  window: { addEventListener() {} } });
const run = code => vm.runInContext(code, context);
run(['maze.js', 'agent.js', 'training.js', 'app.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n'));
run('maze = new Maze(); maze.generate("empty"); agent = new QLearningAgent(maze); bindUIEvents();');
const toggle = checked => elements.get('toggleAutoTune').listeners.change({ target: { checked } });
elements.get('mazeTypeSelect').value = 'empty';
elements.get('mazeSizeSelect').value = '11';

// New maps retain parameters and learned controller scores, but have a fresh positional Q-table.
toggle(true);
run('for (let i=0; i<100; i++) stepSimulation();');
assert(run('parameterController.updates > 0'));
const settings = run('JSON.stringify(explorerSettings(agent))');
const learned = run('JSON.stringify([parameterController.scores, parameterController.counts])');
run('generateNewMaze()');
assert.equal(run('JSON.stringify(explorerSettings(agent))'), settings);
assert.equal(run('JSON.stringify([parameterController.scores, parameterController.counts])'), learned);
assert.equal(run('agent.steps'), 0);
toggle(false);
assert.equal(run('JSON.stringify(explorerSettings(agent))'), settings);
assert(!elements.get('paramAlpha').disabled);
run('stepSimulation()');
assert.equal(run('JSON.stringify([parameterController.scores, parameterController.counts])'), learned);

// Exercise every map/size with both controllers; validate saves during unfinished episodes.
toggle(true);
for (const size of [7, 11, 15, 21, 49]) {
  for (const type of ['dfs', 'prim', 'random', 'empty']) {
    elements.get('mazeSizeSelect').value = String(size);
    elements.get('mazeTypeSelect').value = type;
    run('generateNewMaze(); for (let i=0; i<300; i++) stepSimulation();');
    assert(run('Number.isFinite(agent.totalReward)'));
    assert(run('agent.qTable.flat(2).every(v => v === -Infinity || Number.isFinite(v))'));
    run('decodeTraining(JSON.stringify(trainingSnapshot()), maze)');
    for (const [key, limits] of Object.entries(run('PARAMETER_LIMITS'))) {
      const value = run(`explorerSettings(agent).${key}`);
      assert(value >= limits[0] && value <= limits[1], key);
    }
  }
}

// Saving contains only learned content plus a compact Q-table compatibility identifier.
const saved = run('JSON.stringify(trainingSnapshot())');
const payload = JSON.parse(saved);
assert.deepEqual(Object.keys(payload).sort(), ['agent','context','controller','episodeCount','format','metricsHistory','totalWins','version'].sort());
assert.deepEqual(Object.keys(payload.agent).sort(), ['qTable','settings']);
assert.deepEqual(Object.keys(payload.controller).sort(), ['active','counts','scores','updates']);
const restored = run('decodeTraining(' + JSON.stringify(saved) + ', maze)');
assert(restored.compatible);
assert.equal(JSON.stringify(restored.agent.qTable), JSON.stringify(payload.agent.qTable));
assert.equal(restored.agent.steps, 0);
assert.equal(restored.controller.observations, 0);
run('saveTraining()'); assert(downloaded);

for (const corrupt of [
  d => { d.version = 99; }, d => { d.context = 'bad'; },
  d => { d.agent.settings.alpha = null; }, d => { d.agent.qTable = []; },
  d => { d.agent.qTable[1][1][0] = null; },
  d => { d.controller.scores[0] = 1e100; }, d => { d.controller.updates = -1; },
  d => { d.episodeCount = -1; }
]) {
  const data = JSON.parse(saved); corrupt(data);
  assert.throws(() => run('decodeTraining(' + JSON.stringify(JSON.stringify(data)) + ', maze)'));
  assert.equal(run('JSON.stringify(trainingSnapshot())'), saved);
}

(async () => {
  const originalMap = run('JSON.stringify(maze.grid)');
  context.fileEvent = { target: { files: [{ size: saved.length, text: async () => saved }], value: 'file' } };
  run('isRunning = true');
  await run('loadTraining(fileEvent)');
  assert.equal(run('isRunning'), false);
  assert.equal(run('JSON.stringify(trainingSnapshot())'), saved);
  assert.equal(run('JSON.stringify(maze.grid)'), originalMap);
  assert.equal(run('agent.steps'), 0);
  context.fileEvent.target.files = [{ size: 1, text: async () => '{bad' }];
  await run('loadTraining(fileEvent)');
  assert(elements.get('trainingStatus').textContent.includes('실패'));
  assert.equal(run('JSON.stringify(trainingSnapshot())'), saved);
  context.fileEvent.target.files = [{ size: 6 * 1024 * 1024, text: async () => saved }];
  await run('loadTraining(fileEvent)');
  assert(elements.get('trainingStatus').textContent.includes('5MB'));

  // A different environment never gets replaced or receives incompatible Q-values.
  elements.get('mazeSizeSelect').value = '7'; elements.get('mazeTypeSelect').value = 'dfs';
  run('generateNewMaze(); autoTuneEnabled=false; autoRegenMaze=true;');
  const currentMap = run('JSON.stringify([maze.grid,maze.start,maze.goal])');
  context.fileEvent.target.files = [{ size: saved.length, text: async () => saved }];
  await run('loadTraining(fileEvent)');
  assert.equal(run('JSON.stringify([maze.grid,maze.start,maze.goal])'), currentMap);
  assert.equal(run('autoTuneEnabled'), false); assert.equal(run('autoRegenMaze'), true);
  assert.equal(run('episodeCount'), payload.episodeCount);
  assert.equal(run('JSON.stringify(explorerSettings(agent))'), JSON.stringify(payload.agent.settings));
  assert(run('agent.qTable.flat(2).every(v => v === -Infinity || v === 0)'));
  assert(elements.get('trainingStatus').textContent.includes('환경이 달라'));

  // Old full-session saves import learning only, preserving the selected environment.
  const legacy = JSON.parse(run('JSON.stringify({format:"rl-maze-training",version:1,maze:{rows:maze.rows,cols:maze.cols,grid:maze.grid,start:maze.start,goal:maze.goal},agent:{settings:explorerSettings(agent),qTable:agent.qTable},controller:parameterController,episodeCount,totalWins,metricsHistory})'));
  context.fileEvent.target.files = [{ size: 1000, text: async () => JSON.stringify(legacy) }];
  await run('loadTraining(fileEvent)');
  assert.equal(run('JSON.stringify([maze.grid,maze.start,maze.goal])'), currentMap);
  assert(!elements.get('trainingStatus').textContent.includes('실패'));

  // Greedy evaluation must use learned Q-values, not the BFS answer or exploration.
  run('maze=new Maze(7,7);maze.generate("empty");agent=new QLearningAgent(maze);');
  assert.equal(run('evaluateLearnedPolicy(agent).status'), 'unlearned');
  run('for(let c=1;c<5;c++) agent.qTable[1][c][1]=10; for(let r=1;r<5;r++) agent.qTable[r][5][2]=10;');
  assert(run('evaluateLearnedPolicy(agent).optimal'));
  assert.equal(run('evaluateLearnedPolicy(agent).steps'), 8);
  const beforeEvaluation = run('JSON.stringify(trainingSnapshot())');
  run('showPolicyEvaluation()');
  assert.equal(run('JSON.stringify(trainingSnapshot())'), beforeEvaluation);
  assert(elements.get('policyEvaluationStatus').textContent.includes('최단 경로 달성'));
  run('agent.qTable[1][1][3]=20; agent.qTable[1][0][2]=20; agent.qTable[2][0][1]=20; for(let c=1;c<5;c++) agent.qTable[2][c][1]=20;');
  assert.equal(run('evaluateLearnedPolicy(agent).steps'), 10);
  assert.equal(run('evaluateLearnedPolicy(agent).optimal'), false);
  run('agent.qTable[1][0][1]=30;');
  assert.equal(run('evaluateLearnedPolicy(agent).status'), 'loop');
  run('maze.grid[0][1]=maze.grid[1][0]=maze.grid[1][2]=maze.grid[2][1]=1;maze.computeBFSDistanceMap();');
  assert.equal(run('evaluateLearnedPolicy(agent).status'), 'unreachable');
  console.log('PASS: 20 map combinations / 6,000 steps, learning-only save, same/different/legacy imports, corrupt files, setting preservation, exact/long/loop/unlearned/unreachable policy evaluation and no evaluation mutations.');
})().catch(error => { console.error(error); process.exitCode = 1; });
