// Rendering and page wiring. The simulation itself lives in engine.js, which
// must be loaded first.

// Function to set the theme
function setTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
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
        balls.forEach((ball, index) => {
            let ballElement = this.ballElements[index];
            if (!ballElement) {
                ballElement = document.createElement('div');
                ballElement.classList.add('ball');
                ballElement.style.width = `${config.ballSize}px`;
                ballElement.style.height = `${config.ballSize}px`;
                ballElement.style.backgroundColor = ball.color;
                // Inside the grid so ball coordinates stay grid-relative on scroll.
                this.gridContainer.appendChild(ballElement);
                this.ballElements[index] = ballElement;
            }
            ballElement.style.transform = `translate(${ball.x}px, ${ball.y}px)`;
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
const gridStage = document.getElementById('grid-stage');
const renderer = new Renderer(gridContainer);
// Assigned below, once the theme has supplied the colors the grid is built from.
let game = null;

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

// Initialize theme and populate selector, then build the world with real colors
setTheme(config.selectedTheme);
populateThemeSelector();

game = new Game(renderer);

function resizeGrid() {
    const margin = 16;
    const availableWidth = Math.max(1, document.documentElement.clientWidth - margin);
    const availableHeight = Math.max(1, document.documentElement.clientHeight - margin);
    const logicalWidth = gridContainer.offsetWidth;
    const logicalHeight = gridContainer.offsetHeight;
    const scale = Math.min(1, availableWidth / logicalWidth, availableHeight / logicalHeight);

    gridStage.style.width = `${logicalWidth * scale}px`;
    gridStage.style.height = `${logicalHeight * scale}px`;
    gridContainer.style.transform = `scale(${scale})`;
}

resizeGrid();
window.addEventListener('resize', resizeGrid);
requestAnimationFrame(timestamp => game.gameLoop(timestamp));
