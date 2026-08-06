// The simulation: grid, balls, collisions. No DOM access lives in this file, so
// it can be loaded by the browser as a plain script and required by the tests.

// --- Themes ---
const themes = {
    christmas: {
        dayColor: 'rgb(53, 18, 35)',
        nightColor: 'rgb(18, 53, 36)',
    },
    sunsetTwilight: {
        dayColor: 'rgb(255, 165, 0)', // Orange
        nightColor: 'rgb(75, 0, 130)', // Indigo
    },
    forest: {
        dayColor: 'rgb(34, 139, 34)', // Forest Green
        nightColor: 'rgb(25, 25, 112)', // Midnight Blue
    },
    desert: {
        dayColor: 'rgb(244, 164, 96)', // Sandy Brown
        nightColor: 'rgb(101, 67, 33)', // Dark Brown
    },
    ocean: {
        dayColor: 'rgb(0, 191, 255)', // Deep Sky Blue
        nightColor: 'rgb(25, 25, 112)', // Midnight Blue
    },
    space: {
        dayColor: 'rgb(25, 25, 112)', // Midnight Blue
        nightColor: 'rgb(10, 10, 30)', // Very Dark Blue/Black
    },
    halloween: {
        dayColor: 'rgb(255, 140, 0)', // Dark Orange
        nightColor: 'rgb(75, 0, 130)', // Indigo/Deep Purple
    },
    valentines: {
        dayColor: 'rgb(255, 105, 180)', // Hot Pink
        nightColor: 'rgb(178, 34, 34)', // Firebrick Red
    },
    easter: {
        dayColor: 'rgb(255, 255, 0)', // Yellow
        nightColor: 'rgb(147, 112, 219)', // Medium Purple
    },
    monochrome: {
        dayColor: 'rgb(255, 255, 255)', // White
        nightColor: 'rgb(0, 0, 0)', // Black
    },
};

// --- Configuration ---
const config = {
    gridWidth: 16,
    gridHeight: 16,
    speed: 10,
    ballSize: 50,
    cellSize: 50,
    startPositionRange: { min: 0.2, max: 0.8 },
    bounceOffset: 2, // Added to push ball out of collision
    bounceJitter: 0.15, // Radians of random spread applied on each bounce
    minVelocityRatio: 0.25, // Keeps the jitter from flattening a ball against an axis
    selectedTheme: 'christmas', // Default theme
    dayColor: '', // Will be set by setTheme
    nightColor: '', // Will be set by setTheme
};

config.xBoundary = config.gridWidth * config.cellSize - config.ballSize;
config.yBoundary = config.gridHeight * config.cellSize - config.ballSize;

// --- Classes ---

class Game {
    constructor(renderer) {
        this.renderer = renderer;
        this.grid = new Grid();
        this.balls = [
            new Ball(0, false, 45), // Ball 1 starts as night (isDay: false)
            new Ball(config.xBoundary, true, 135), // Ball 2 starts as day (isDay: true)
        ];
        this.renderer.renderGrid(this.grid);
        this.renderer.renderBalls(this.balls);
        this.renderer.updateCounts(this.grid.dayCount, this.grid.nightCount);
    }

    gameLoop() {
        this.step();
        requestAnimationFrame(() => this.gameLoop());
    }

    // One frame of simulation. Separated from gameLoop so tests can advance the
    // world without a browser.
    step() {
        this.balls.forEach(ball => {
            ball.update();
        });

        this.handleCollisions();

        this.renderer.renderBalls(this.balls);
    }

    handleCollisions() {
        this.balls.forEach(ball => {
            const hits = this.findCollidingCells(ball);
            if (hits.length === 0) {
                return;
            }

            hits.forEach(hit => {
                this.grid.flipCellColor(hit.cell);
                this.renderer.updateCell(hit.cell, hit.gridX, hit.gridY);
            });
            this.renderer.updateCounts(this.grid.dayCount, this.grid.nightCount);

            this.bounceBallOffCells(ball, hits);
            // The push-out can shove the ball past the edge of the grid.
            ball.handleWallCollision();
        });
    }

    // Every cell the ball overlaps, not just the one under its center. The ball
    // is as big as a cell, so it can touch up to four at once.
    findCollidingCells(ball) {
        const minX = Math.floor(ball.x / config.cellSize);
        const maxX = Math.ceil((ball.x + config.ballSize) / config.cellSize) - 1;
        const minY = Math.floor(ball.y / config.cellSize);
        const maxY = Math.ceil((ball.y + config.ballSize) / config.cellSize) - 1;

        const hits = [];
        for (let gridY = minY; gridY <= maxY; gridY++) {
            for (let gridX = minX; gridX <= maxX; gridX++) {
                const cell = this.grid.getCell(gridX, gridY);
                // Collision occurs if ball's isDay state matches cell's isDay state
                if (cell && ball.isDay === cell.isDay) {
                    hits.push({ cell, gridX, gridY });
                }
            }
        }
        return hits;
    }

    bounceBallOffCells(ball, hits) {
        const ballHalf = config.ballSize / 2;
        const cellHalf = config.cellSize / 2;
        const ballCenterX = ball.x + ballHalf;
        const ballCenterY = ball.y + ballHalf;

        // A cell the ball has just run into cannot be penetrated by more than the
        // distance travelled this frame. Anything deeper is a cell that changed
        // colour underneath the ball, and pushing out of those would fling it
        // across the grid, so they get flipped without a bounce.
        const maxPenetrationX = Math.abs(ball.vx) + config.bounceOffset;
        const maxPenetrationY = Math.abs(ball.vy) + config.bounceOffset;

        // Resolve each cell along the axis it is least penetrated on, keeping the
        // deepest push per axis so that a corner hit reverses both.
        let pushX = 0;
        let pushY = 0;

        hits.forEach(({ gridX, gridY }) => {
            const dx = ballCenterX - (gridX * config.cellSize + cellHalf);
            const dy = ballCenterY - (gridY * config.cellSize + cellHalf);

            const overlapX = (ballHalf + cellHalf) - Math.abs(dx);
            const overlapY = (ballHalf + cellHalf) - Math.abs(dy);

            if (overlapX < overlapY) {
                if (overlapX > maxPenetrationX) {
                    return;
                }
                const push = dx > 0 ? overlapX : -overlapX;
                if (Math.abs(push) > Math.abs(pushX)) {
                    pushX = push;
                }
            } else {
                if (overlapY > maxPenetrationY) {
                    return;
                }
                const push = dy > 0 ? overlapY : -overlapY;
                if (Math.abs(push) > Math.abs(pushY)) {
                    pushY = push;
                }
            }
        });

        if (pushX !== 0) {
            ball.x += pushX + Math.sign(pushX) * config.bounceOffset;
            // Only reverse if the ball was heading into the cell, never away from it.
            if (ball.vx * pushX < 0) {
                ball.vx *= -1;
            }
        }
        if (pushY !== 0) {
            ball.y += pushY + Math.sign(pushY) * config.bounceOffset;
            if (ball.vy * pushY < 0) {
                ball.vy *= -1;
            }
        }

        if (pushX !== 0 || pushY !== 0) {
            ball.jitterDirection();
        }
    }
}

class Grid {
    constructor() {
        this.grid = [];
        this.dayCount = 0;
        this.nightCount = 0;
        for (let y = 0; y < config.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < config.gridWidth; x++) {
                const isDay = x < config.gridWidth / 2;
                const color = isDay ? config.dayColor : config.nightColor;
                this.grid[y][x] = { color: color, isDay: isDay };
                if (isDay) {
                    this.dayCount++;
                } else {
                    this.nightCount++;
                }
            }
        }
    }

    getCell(x, y) {
        if (x >= 0 && x < config.gridWidth && y >= 0 && y < config.gridHeight) {
            return this.grid[y][x];
        }
        return null;
    }

    flipCellColor(cell) {
        cell.isDay = !cell.isDay;
        if (cell.isDay) {
            cell.color = config.dayColor;
            this.dayCount++;
            this.nightCount--;
        } else {
            cell.color = config.nightColor;
            this.dayCount--;
            this.nightCount++;
        }
    }
}

class Ball {
    constructor(x, isDay, angle) {
        this.x = x;
        const range = config.startPositionRange.max - config.startPositionRange.min;
        const startY = Math.random() * range + config.startPositionRange.min;
        this.y = startY * config.gridHeight * config.cellSize;
        this.isDay = isDay;
        this.color = isDay ? config.dayColor : config.nightColor;

        const rad = angle * (Math.PI / 180);
        this.vx = Math.cos(rad) * config.speed;
        this.vy = Math.sin(rad) * config.speed;
        this.vy *= Math.random() > 0.5 ? 1 : -1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.handleWallCollision();
    }

    // Clamps to the grid and turns the ball around, so it reaches the wall
    // instead of reversing a step early. Safe to call more than once a frame.
    handleWallCollision() {
        let bounced = false;

        if (this.x < 0) {
            this.x = 0;
            this.vx = Math.abs(this.vx);
            bounced = true;
        } else if (this.x > config.xBoundary) {
            this.x = config.xBoundary;
            this.vx = -Math.abs(this.vx);
            bounced = true;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = Math.abs(this.vy);
            bounced = true;
        } else if (this.y > config.yBoundary) {
            this.y = config.yBoundary;
            this.vy = -Math.abs(this.vy);
            bounced = true;
        }

        if (bounced) {
            this.jitterDirection();
        }
    }

    // Bouncing on exact axes is perfectly periodic: the balls eventually retrace
    // the same orbit and the simulation stops evolving. A small random nudge on
    // every bounce keeps it alive. Speed is preserved, only the heading moves.
    jitterDirection() {
        const angle = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * config.bounceJitter;
        const vx = Math.cos(angle) * config.speed;
        const vy = Math.sin(angle) * config.speed;

        // Reject a nudge that flattens the ball against an axis, where it would
        // skim a wall instead of crossing the grid.
        const minComponent = config.speed * config.minVelocityRatio;
        if (Math.abs(vx) >= minComponent && Math.abs(vy) >= minComponent) {
            this.vx = vx;
            this.vy = vy;
        }
    }
}

// Exported for the Node test suite. The browser loads this as a plain script,
// where `module` does not exist and this block is skipped.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { themes, config, Game, Grid, Ball };
}
