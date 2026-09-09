/**
 * Reinforcement Learning Agent & Customizable Reward Engine
 * Implements Tabular Q-Learning with Wall Masking & Smart Path Exploration.
 */

class QLearningAgent {
  constructor(maze) {
    this.maze = maze;

    // Hyperparameters (Defaults)
    this.alpha = 0.2;    // Learning Rate
    this.gamma = 0.95;   // Discount Factor
    this.epsilon = 1.0;  // Initial Exploration Rate
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.992;

    // Customizable Reward & Penalty Parameters
    this.rewardsConfig = {
      goal: 100,            // 도착 상점
      step: -1,             // 이동/시간 지연 벌점
      wall: -10,            // 벽 충돌 벌점
      deadEnd: -15,         // 막다른 길 입성 벌점
      revisit: -2,          // 재방문 벌점
      distanceShaping: 0.5  // 목적지 접근 보상 (BFS 거리 감소 시)
    };

    // Actions: 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
    this.actionDirs = [
      { dr: -1, dc: 0, name: 'UP', icon: 'arrow-up' },
      { dr: 0, dc: 1, name: 'RIGHT', icon: 'arrow-right' },
      { dr: 1, dc: 0, name: 'DOWN', icon: 'arrow-down' },
      { dr: 0, dc: -1, name: 'LEFT', icon: 'arrow-left' }
    ];

    this.initQTable();
    this.resetState();
  }

  // Initialize Q-Table with Wall Masking
  // Wall actions are masked with -Infinity so arrows and policy selection NEVER favor walls!
  initQTable() {
    this.qTable = Array.from({ length: this.maze.rows }, (_, r) =>
      Array.from({ length: this.maze.cols }, (_, c) => {
        if (this.maze.isWall(r, c)) return [-Infinity, -Infinity, -Infinity, -Infinity];

        const qValues = [0, 0, 0, 0];
        for (let a = 0; a < 4; a++) {
          const targetR = r + this.actionDirs[a].dr;
          const targetC = c + this.actionDirs[a].dc;
          if (this.maze.isWall(targetR, targetC)) {
            qValues[a] = -Infinity; // Mask wall actions
          }
        }
        return qValues;
      })
    );
  }

  // Reset agent position for new episode
  resetState() {
    this.r = this.maze.start.r;
    this.c = this.maze.start.c;
    this.steps = 0;
    this.totalReward = 0;
    this.visitedCells = new Map(); // Key: "r,c" -> count
    this.recordVisit(this.r, this.c);
    this.lastEvent = "시작 준비 완료";
    this.isFinished = false;
    this.reachedGoal = false;
  }

  recordVisit(r, c) {
    const key = `${r},${c}`;
    this.visitedCells.set(key, (this.visitedCells.get(key) || 0) + 1);
  }

  // Get list of valid (non-wall) action indices for current cell
  getValidActions(r, c) {
    const valid = [];
    for (let a = 0; a < 4; a++) {
      if (this.qTable[r][c][a] !== -Infinity) {
        valid.push(a);
      }
    }
    return valid.length > 0 ? valid : [0, 1, 2, 3];
  }

  // Epsilon-Greedy Action Selection over Valid Actions
  selectAction(r, c) {
    const validActions = this.getValidActions(r, c);

    if (Math.random() < this.epsilon) {
      // Random Exploration among valid paths
      return validActions[Math.floor(Math.random() * validActions.length)];
    } else {
      // Exploitation: Choose valid action with max Q-value
      let maxQ = -Infinity;
      const bestActions = [];

      for (const a of validActions) {
        const q = this.qTable[r][c][a];
        if (q > maxQ) {
          maxQ = q;
          bestActions.length = 0;
          bestActions.push(a);
        } else if (q === maxQ) {
          bestActions.push(a);
        }
      }

      return bestActions.length > 0
        ? bestActions[Math.floor(Math.random() * bestActions.length)]
        : validActions[0];
    }
  }

  // Execute one step in the environment
  step() {
    if (this.isFinished) return null;

    const currR = this.r;
    const currC = this.c;
    const action = this.selectAction(currR, currC);
    const dir = this.actionDirs[action];

    const targetR = currR + dir.dr;
    const targetC = currC + dir.dc;

    let nextR = currR;
    let nextC = currC;
    let reward = 0;
    let eventDetail = [];

    const isWallHit = this.maze.isWall(targetR, targetC);

    if (isWallHit) {
      // Wall collision logic: Agent remains in place & penalizes wall action
      reward += this.rewardsConfig.wall;
      eventDetail.push(`벽 충돌 (${this.rewardsConfig.wall})`);
      this.qTable[currR][currC][action] = -Infinity; // Permanently mask wall
    } else {
      // Valid move to open pathway
      nextR = targetR;
      nextC = targetC;
      reward += this.rewardsConfig.step; // Time step penalty
      eventDetail.push(`${dir.name} 이동 (${this.rewardsConfig.step})`);

      // 1. Goal Reached Check
      if (nextR === this.maze.goal.r && nextC === this.maze.goal.c) {
        reward += this.rewardsConfig.goal;
        eventDetail.push(`도착 지점 도달! (+${this.rewardsConfig.goal})`);
        this.reachedGoal = true;
        this.isFinished = true;
      } else {
        // 2. Dead-end Penalty Check
        if (this.maze.isDeadEnd(nextR, nextC)) {
          reward += this.rewardsConfig.deadEnd;
          eventDetail.push(`막다른 길 (${this.rewardsConfig.deadEnd})`);
        }

        // 3. Re-visit Penalty Check
        const visitCount = this.visitedCells.get(`${nextR},${nextC}`) || 0;
        if (visitCount > 0 && this.rewardsConfig.revisit !== 0) {
          const revPen = this.rewardsConfig.revisit * visitCount;
          reward += revPen;
          eventDetail.push(`재방문 x${visitCount} (${revPen})`);
        }

        // 4. Distance Shaping Reward Check
        if (this.rewardsConfig.distanceShaping !== 0) {
          const prevDist = this.maze.bfsDistanceMap[currR][currC];
          const nextDist = this.maze.bfsDistanceMap[nextR][nextC];
          if (nextDist < prevDist) {
            reward += this.rewardsConfig.distanceShaping;
            eventDetail.push(`목적지 접근 (+${this.rewardsConfig.distanceShaping})`);
          } else if (nextDist > prevDist) {
            reward -= this.rewardsConfig.distanceShaping;
            eventDetail.push(`목적지 이탈 (-${this.rewardsConfig.distanceShaping})`);
          }
        }
      }
    }

    // Update Q-Table using Bellman Equation
    const validNextQ = this.isFinished ? [0] : this.getValidActions(nextR, nextC).map(a => this.qTable[nextR][nextC][a]);
    const maxNextQ = this.isFinished ? 0 : Math.max(...validNextQ);
    const oldQ = this.qTable[currR][currC][action];

    if (oldQ !== -Infinity) {
      this.qTable[currR][currC][action] = oldQ + this.alpha * (reward + this.gamma * maxNextQ - oldQ);
    }

    // Update Agent Position & Metrics
    this.r = nextR;
    this.c = nextC;
    this.recordVisit(this.r, this.c);
    this.steps++;
    this.totalReward += reward;
    this.lastEvent = eventDetail.join(" | ");

    return {
      action,
      dirName: dir.name,
      reward,
      nextR,
      nextC,
      isWallHit,
      reachedGoal: this.reachedGoal,
      isFinished: this.isFinished,
      reachedGoal: this.reachedGoal
    };
  }

  // Decay Epsilon exploration rate
  decayEpsilon() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
  }

  // Get Best Action among VALID (non-wall) directions for visual policy rendering
  getBestAction(r, c) {
    if (this.maze.isWall(r, c)) {
      return { bestAction: null, maxQ: -Infinity, isExplored: false };
    }

    const qValues = this.qTable[r][c];
    let maxQ = -Infinity;
    let bestA = null;
    let hasExplored = false;

    for (let a = 0; a < 4; a++) {
      const q = qValues[a];
      if (q !== -Infinity) {
        if (q !== 0) hasExplored = true;
        if (q > maxQ) {
          maxQ = q;
          bestA = a;
        }
      }
    }

    // Fallback if all valid Q-values are equal (unexplored): pick direction closest to Goal
    if (bestA === null || (maxQ === 0 && !hasExplored)) {
      let minDist = Infinity;
      for (let a = 0; a < 4; a++) {
        if (qValues[a] !== -Infinity) {
          const nr = r + this.actionDirs[a].dr;
          const nc = c + this.actionDirs[a].dc;
          const dist = this.maze.bfsDistanceMap[nr][nc];
          if (dist < minDist) {
            minDist = dist;
            bestA = a;
          }
        }
      }
    }

    return { bestAction: bestA, maxQ, isExplored: hasExplored || maxQ !== 0 };
  }
}
