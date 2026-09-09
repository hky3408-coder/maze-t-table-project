/**
 * Maze Generation & Map Perception Engine
 * Supports DFS, Prim, random obstacles with BFS path validation, and empty grids.
 */

class Maze {
  constructor(rows = 11, cols = 11) {
    this.rows = rows % 2 === 0 ? rows + 1 : rows; // Ensure odd dimensions for maze walls
    this.cols = cols % 2 === 0 ? cols + 1 : cols;
    this.grid = []; // 0: Path, 1: Wall
    this.start = { r: 1, c: 1 };
    this.goal = { r: this.rows - 2, c: this.cols - 2 };
    this.bfsDistanceMap = []; // Stores shortest path distance to goal for each cell
  }

  // Generate Maze based on selected algorithm
  generate(type = 'dfs', density = 0.25) {
    if (type === 'dfs') {
      this.generateDFS();
    } else if (type === 'prim') {
      this.generatePrim();
    } else if (type === 'random') {
      this.generateRandom(density);
    } else if (type === 'empty') {
      this.generateEmpty();
    }
    
    // Ensure start and goal are open
    this.grid[this.start.r][this.start.c] = 0;
    this.grid[this.goal.r][this.goal.c] = 0;

    // Calculate BFS distance map to goal for distance shaping rewards & optimal baseline
    this.computeBFSDistanceMap();
  }

  // Open every cell, including the border. Out-of-bounds movement stays blocked.
  generateEmpty() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
  }

  // DFS Recursive Backtracker Maze Generation
  generateDFS() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
    const stack = [];
    const startR = 1, startC = 1;
    this.grid[startR][startC] = 0;
    stack.push({ r: startR, c: startC });

    const directions = [
      { dr: -2, dc: 0 }, // Up
      { dr: 0, dc: 2 },  // Right
      { dr: 2, dc: 0 },  // Down
      { dr: 0, dc: -2 }  // Left
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];

      for (const dir of directions) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (nr > 0 && nr < this.rows - 1 && nc > 0 && nc < this.cols - 1 && this.grid[nr][nc] === 1) {
          neighbors.push({ nr, nc, dir });
        }
      }

      if (neighbors.length > 0) {
        const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Carve wall between current and chosen
        const wallR = current.r + chosen.dir.dr / 2;
        const wallC = current.c + chosen.dir.dc / 2;
        this.grid[wallR][wallC] = 0;
        this.grid[chosen.nr][chosen.nc] = 0;
        stack.push({ r: chosen.nr, c: chosen.nc });
      } else {
        stack.pop();
      }
    }
  }

  // Prim's Algorithm Maze Generation
  generatePrim() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
    const walls = [];

    const startR = 1, startC = 1;
    this.grid[startR][startC] = 0;

    const addWalls = (r, c) => {
      const dirs = [
        { dr: -2, dc: 0 }, { dr: 2, dc: 0 },
        { dr: 0, dc: -2 }, { dr: 0, dc: 2 }
      ];
      for (const d of dirs) {
        const nr = r + d.dr;
        const nc = c + d.dc;
        if (nr > 0 && nr < this.rows - 1 && nc > 0 && nc < this.cols - 1) {
          walls.push({ r1: r, c1: c, r2: nr, c2: nc, wr: r + d.dr / 2, wc: c + d.dc / 2 });
        }
      }
    };

    addWalls(startR, startC);

    while (walls.length > 0) {
      const randIdx = Math.floor(Math.random() * walls.length);
      const wall = walls.splice(randIdx, 1)[0];

      if (this.grid[wall.r2][wall.c2] === 1) {
        this.grid[wall.wr][wall.wc] = 0;
        this.grid[wall.r2][wall.c2] = 0;
        addWalls(wall.r2, wall.c2);
      }
    }
  }

  // Random Obstacles Grid with BFS Path Guarantee
  generateRandom(density = 0.25) {
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
      attempts++;
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

      // Fill outer border with walls
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
            this.grid[r][c] = 1;
          } else if (Math.random() < density && !(r === this.start.r && c === this.start.c) && !(r === this.goal.r && c === this.goal.c)) {
            this.grid[r][c] = 1;
          }
        }
      }

      this.grid[this.start.r][this.start.c] = 0;
      this.grid[this.goal.r][this.goal.c] = 0;

      // Validate using BFS path check
      if (this.hasValidPath()) {
        valid = true;
      }
    }

    // Fallback if random placement failed to produce path
    if (!valid) {
      this.generateDFS();
    }
  }

  // Check if a path exists from start to goal
  hasValidPath() {
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const queue = [{ r: this.start.r, c: this.start.c }];
    visited[this.start.r][this.start.c] = true;

    const dirs = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.r === this.goal.r && curr.c === this.goal.c) return true;

      for (const d of dirs) {
        const nr = curr.r + d.dr;
        const nc = curr.c + d.dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !visited[nr][nc] && this.grid[nr][nc] === 0) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return false;
  }

  // Pre-calculate shortest distance from each cell to goal using BFS
  computeBFSDistanceMap() {
    this.bfsDistanceMap = Array.from({ length: this.rows }, () => Array(this.cols).fill(Infinity));
    const queue = [{ r: this.goal.r, c: this.goal.c, dist: 0 }];
    this.bfsDistanceMap[this.goal.r][this.goal.c] = 0;

    const dirs = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const d of dirs) {
        const nr = curr.r + d.dr;
        const nc = curr.c + d.dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.grid[nr][nc] === 0) {
          if (this.bfsDistanceMap[nr][nc] > curr.dist + 1) {
            this.bfsDistanceMap[nr][nc] = curr.dist + 1;
            queue.push({ r: nr, c: nc, dist: curr.dist + 1 });
          }
        }
      }
    }
  }

  // Check if cell is a Wall
  isWall(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
    return this.grid[r][c] === 1;
  }

  // Check if cell is a Dead-end (surrounded by 3 walls, excluding start & goal)
  isDeadEnd(r, c) {
    if (this.isWall(r, c)) return false;
    if ((r === this.start.r && c === this.start.c) || (r === this.goal.r && c === this.goal.c)) return false;

    let wallCount = 0;
    const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    for (const d of dirs) {
      if (this.isWall(r + d.dr, c + d.dc)) wallCount++;
    }
    return wallCount >= 3;
  }

  // Agent perception sensor: Returns 4-directional wall sensing [Up, Right, Down, Left]
  getSensors(r, c) {
    return [
      this.isWall(r - 1, c) ? 1 : 0, // Up
      this.isWall(r, c + 1) ? 1 : 0, // Right
      this.isWall(r + 1, c) ? 1 : 0, // Down
      this.isWall(r, c - 1) ? 1 : 0  // Left
    ];
  }
}
