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
    selectedTheme: 'christmas', // Default theme
    dayColor: '', // Will be set by setTheme
    nightColor: '', // Will be set by setTheme
};

config.xBoundary = config.gridWidth * config.cellSize - config.ballSize;
config.yBoundary = config.gridHeight * config.cellSize - config.ballSize;

// Helper to get CSS variable values
function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Function to set the theme
function setTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
        document.documentElement.style.setProperty('--day-color', theme.dayColor);
        document.documentElement.style.setProperty('--night-color', theme.nightColor);
        config.dayColor = theme.dayColor;
        config.nightColor = theme.nightColor;
        config.selectedTheme = themeName;

        if (game && renderer) {
            // Update grid cell colors based on their isDay state
            for (let y = 0; y < config.gridHeight; y++) {
                for (let x = 0; x < config.gridWidth; x++) {
                    const cell = game.grid.getCell(x, y);
                    cell.color = cell.isDay ? config.dayColor : config.nightColor;
                }
            }
            renderer.updateAllCellColors(game.grid);

            // Update ball colors based on their isDay state
            game.balls.forEach(ball => {
                ball.color = ball.isDay ? config.dayColor : config.nightColor;
            });
            renderer.updateBallColors(game.balls);

            renderer.updateCounts(game.grid.dayCount, game.grid.nightCount);
        }
    }
}

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
            // Collision occurs if ball's isDay state matches cell's isDay state
            if (cell && ball.isDay === cell.isDay) {
                this.grid.flipCellColor(cell);
                this.renderer.updateCell(cell, gridX, gridY);
                this.renderer.updateCounts(this.grid.dayCount, this.grid.nightCount);
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
                    ball.x += overlapX + config.bounceOffset;
                } else {
                    ball.x -= overlapX + config.bounceOffset;
                }
                ball.vx *= -1;
            } else {
                if (dy > 0) {
                    ball.y += overlapY + config.bounceOffset;
                } else {
                    ball.y -= overlapY + config.bounceOffset;
                }
                ball.vy *= -1;
            }
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
        this.dayCountElement = document.getElementById('day-count');
        this.nightCountElement = document.getElementById('night-count');
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

    updateAllCellColors(grid) {
        for (let y = 0; y < config.gridHeight; y++) {
            for (let x = 0; x < config.gridWidth; x++) {
                const cell = grid.getCell(x, y);
                this.cellElements[y][x].style.backgroundColor = cell.color;
            }
        }
    }

    updateBallColors(balls) {
        balls.forEach((ball, index) => {
            if (this.ballElements[index]) {
                this.ballElements[index].style.backgroundColor = ball.color;
            }
        });
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

    updateCounts(dayCount, nightCount) {
        this.dayCountElement.innerHTML = `Day <span style="color: ${config.dayColor};">Cells</span>: ${dayCount}`;
        this.nightCountElement.innerHTML = `Night <span style="color: ${config.nightColor};">Cells</span>: ${nightCount}`;
    }
}

// --- Main ---
const gridContainer = document.getElementById('grid-container');
const renderer = new Renderer(gridContainer);
const game = new Game(renderer);

// Function to populate the theme selector dropdown
function populateThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    for (const themeName in themes) {
        const option = document.createElement('option');
        option.value = themeName;
        option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1).replace(/([A-Z])/g, ' $1'); // Capitalize and add spaces
        themeSelect.appendChild(option);
    }
    themeSelect.value = config.selectedTheme; // Set initial selection
}

// Initialize theme and populate selector
setTheme(config.selectedTheme);
populateThemeSelector();

game.gameLoop();
