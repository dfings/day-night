// --- Configuration ---
const config = {
    gridWidth: 20,
    gridHeight: 20,
    dayColor: 'rgb(53, 18, 35)',
    nightColor: 'rgb(18, 53, 36)',
    speed: 8,
    ballSize: 40,
    cellSize: 40,
    startPositionRange: { min: 0.2, max: 0.8 },
};
config.xBoundary = config.gridWidth * config.cellSize - config.ballSize;
config.yBoundary = config.gridHeight * config.cellSize - config.ballSize;

// --- Classes ---

class Game {
    constructor(renderer) {
        this.renderer = renderer;
        this.grid = new Grid();
        this.balls = [
            new Ball(0, config.nightColor, 45),
            new Ball(config.xBoundary, config.dayColor, 135),
        ];
        this.renderer.renderGrid(this.grid);
        this.renderer.renderBalls(this.balls);
    }

    gameLoop() {
        this.balls.forEach(ball => {
            ball.update();
        });

        this.handleCollisions();

        this.renderer.renderBalls(this.balls);

        requestAnimationFrame(() => this.gameLoop());
    }

    handleCollisions() {
        this.balls.forEach(ball => {
            const gridX = Math.floor((ball.x + config.ballSize / 2) / config.cellSize);
            const gridY = Math.floor((ball.y + config.ballSize / 2) / config.cellSize);

            const cell = this.grid.getCell(gridX, gridY);
            if (cell && cell.color === ball.color) {
                this.grid.flipCellColor(cell);
                this.renderer.updateCell(cell, gridX, gridY);
                this.bounceBallOffCell(ball, gridX, gridY);
            }
        });
    }

    bounceBallOffCell(ball, gridX, gridY) {
        const ballHalf = config.ballSize / 2;
        const cellHalf = config.cellSize / 2;

        const ballCenterX = ball.x + ballHalf;
        const ballCenterY = ball.y + ballHalf;
        const cellCenterX = gridX * config.cellSize + cellHalf;
        const cellCenterY = gridY * config.cellSize + cellHalf;

        const dx = ballCenterX - cellCenterX;
        const dy = ballCenterY - cellCenterY;

        const overlapX = (ballHalf + cellHalf) - Math.abs(dx);
        const overlapY = (ballHalf + cellHalf) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                if (dx > 0) {
                    ball.x += overlapX;
                } else {
                    ball.x -= overlapX;
                }
                ball.vx *= -1;
            } else {
                if (dy > 0) {
                    ball.y += overlapY;
                } else {
                    ball.y -= overlapY;
                }
                ball.vy *= -1;
            }
        }
    }
}

class Grid {
    constructor() {
        this.grid = [];
        for (let y = 0; y < config.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < config.gridWidth; x++) {
                this.grid[y][x] = {
                    color: x < config.gridWidth / 2 ? config.dayColor : config.nightColor,
                };
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
        cell.color = cell.color === config.dayColor ? config.nightColor : config.dayColor;
    }
}

class Ball {
    constructor(x, color, angle) {
        this.x = x;
        const range = config.startPositionRange.max - config.startPositionRange.min;
        const startY = Math.random() * range + config.startPositionRange.min;
        this.y = startY * config.gridHeight * config.cellSize;
        this.color = color;

        const rad = angle * (Math.PI / 180);
        this.vx = Math.cos(rad) * config.speed;
        this.vy = Math.sin(rad) * config.speed;
        this.vy *= Math.random() > 0.5 ? 1 : -1;
    }

    update() {
        this.handleWallCollision();
        this.x += this.vx;
        this.y += this.vy;
    }

    handleWallCollision() {
        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (nextX < 0 || nextX > config.xBoundary) {
            this.vx *= -1;
        }
        if (nextY < 0 || nextY > config.yBoundary) {
            this.vy *= -1;
        }
    }
}

class Renderer {
    constructor(gridContainer) {
        this.gridContainer = gridContainer;
        this.gridContainer.style.gridTemplateColumns = `repeat(${config.gridWidth}, 1fr)`;
        this.ballElements = [];
        this.cellElements = [];
    }

    renderGrid(grid) {
        for (let y = 0; y < config.gridHeight; y++) {
            this.cellElements[y] = [];
            for (let x = 0; x < config.gridWidth; x++) {
                const cell = grid.getCell(x, y);
                const cellElement = document.createElement('div');
                cellElement.classList.add('grid-cell');
                cellElement.style.backgroundColor = cell.color;
                cellElement.style.width = `${config.cellSize}px`;
                cellElement.style.height = `${config.cellSize}px`;
                this.gridContainer.appendChild(cellElement);
                this.cellElements[y][x] = cellElement;
            }
        }
    }

    renderBalls(balls) {
        const containerRect = this.gridContainer.getBoundingClientRect();
        balls.forEach((ball, index) => {
            if (!this.ballElements[index]) {
                const ballElement = document.createElement('div');
                ballElement.classList.add('ball');
                document.body.appendChild(ballElement);
                this.ballElements[index] = ballElement;
            }
            const ballElement = this.ballElements[index];
            ballElement.style.backgroundColor = ball.color;
            ballElement.style.width = `${config.ballSize}px`;
            ballElement.style.height = `${config.ballSize}px`;
            ballElement.style.left = `${containerRect.left + ball.x}px`;
            ballElement.style.top = `${containerRect.top + ball.y}px`;
        });
    }

    updateCell(cell, x, y) {
        this.cellElements[y][x].style.backgroundColor = cell.color;
    }
}

// --- Main ---
const gridContainer = document.getElementById('grid-container');
const renderer = new Renderer(gridContainer);
const game = new Game(renderer);
game.gameLoop();
