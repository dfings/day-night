// Run with:  npm test      (or: node --test)
//
// Each test below pins down a bug that was found in the simulation, so if one
// ever comes back the test fails instead of the demo quietly misbehaving.

const test = require('node:test');
const assert = require('node:assert');

const { themes, config, Game, Ball } = require('../src/engine.js');

// The Game constructor and step() both call into a renderer. The tests do not
// draw anything, so they hand it one that does nothing.
function stubRenderer() {
    return {
        renderGrid() {},
        renderBalls() {},
        updateCell() {},
        updateCounts() {},
        updateAllCellColors() {},
        updateBallColors() {},
    };
}

function newGame() {
    config.dayColor = themes.christmas.dayColor;
    config.nightColor = themes.christmas.nightColor;
    return new Game(stubRenderer());
}

// Places a ball at an exact spot with an exact heading. The real constructor
// randomises the start, which tests cannot reason about.
function placeBall(isDay, x, y, vx, vy) {
    const ball = new Ball(0, isDay, 45);
    Object.assign(ball, { x, y, vx, vy });
    return ball;
}

// Runs the simulation and reports what happened along the way.
function simulate(frames) {
    const game = newGame();
    const totalCells = config.gridWidth * config.gridHeight;

    const result = {
        maxFrameJump: 0,
        framesOutOfBounds: 0,
        maxSpeedDrift: 0,
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
    };

    for (let frame = 0; frame < frames; frame++) {
        const before = game.balls.map(ball => ({ x: ball.x, y: ball.y }));
        game.step();

        game.balls.forEach((ball, i) => {
            const jump = Math.hypot(ball.x - before[i].x, ball.y - before[i].y);
            result.maxFrameJump = Math.max(result.maxFrameJump, jump);

            if (ball.x < 0 || ball.x > config.xBoundary ||
                ball.y < 0 || ball.y > config.yBoundary) {
                result.framesOutOfBounds++;
            }

            const speed = Math.hypot(ball.vx, ball.vy);
            result.maxSpeedDrift = Math.max(result.maxSpeedDrift, Math.abs(speed - config.speed));

            result.minX = Math.min(result.minX, ball.x);
            result.maxX = Math.max(result.maxX, ball.x);
            result.minY = Math.min(result.minY, ball.y);
            result.maxY = Math.max(result.maxY, ball.y);
        });

        assert.strictEqual(
            game.grid.dayCount + game.grid.nightCount, totalCells,
            `day and night counts stopped adding up to ${totalCells} at frame ${frame}`
        );
    }

    return result;
}

test('a ball never leaves the grid', () => {
    const result = simulate(20000);
    assert.strictEqual(result.framesOutOfBounds, 0);
});

test('a ball never teleports across the grid in one frame', () => {
    // A frame is one step of `speed`, plus at most a push back out of the cell
    // it just entered. Anything near a cell width means collision resolution is
    // flinging the ball instead of nudging it.
    const ceiling = config.speed + config.speed + 2 * config.bounceOffset;
    const result = simulate(20000);
    assert.ok(
        result.maxFrameJump <= ceiling,
        `moved ${result.maxFrameJump.toFixed(1)}px in one frame, expected at most ${ceiling}px`
    );
});

test('a ball reaches every wall instead of turning back early', () => {
    const result = simulate(20000);
    assert.strictEqual(result.minX, 0, 'never touched the left wall');
    assert.strictEqual(result.maxX, config.xBoundary, 'never touched the right wall');
    assert.strictEqual(result.minY, 0, 'never touched the top wall');
    assert.strictEqual(result.maxY, config.yBoundary, 'never touched the bottom wall');
});

test('bouncing never changes a ball\'s speed', () => {
    const result = simulate(20000);
    assert.ok(result.maxSpeedDrift < 1e-9, `speed drifted by ${result.maxSpeedDrift}`);
});

test('the world never returns to a state it has already been in', () => {
    // Without a nudge on each bounce the balls retrace an exact orbit, and the
    // whole world -- ball positions and every cell -- repeats forever after
    // roughly 33k frames, freezing the counts.
    const game = newGame();
    const seen = new Set();

    for (let frame = 0; frame < 60000; frame++) {
        game.step();

        const balls = game.balls
            .map(b => `${b.x.toFixed(3)},${b.y.toFixed(3)},${b.vx.toFixed(3)},${b.vy.toFixed(3)}`)
            .join('|');
        const cells = game.grid.grid.map(row => row.map(c => (c.isDay ? 1 : 0)).join('')).join('');
        const state = `${balls}#${cells}`;

        assert.ok(!seen.has(state), `the simulation locked into a repeating loop at frame ${frame}`);
        seen.add(state);
    }
});

test('a ball flips every cell it overlaps, not just the one under its center', () => {
    const game = newGame();

    // Straddle the corner where four cells meet, offset so the ball covers a
    // little of each, and make all four match the ball.
    const x = 4 * config.cellSize - config.cellSize / 2;
    const y = 4 * config.cellSize - config.cellSize / 2;
    const corners = [[3, 3], [4, 3], [3, 4], [4, 4]];
    corners.forEach(([cx, cy]) => { game.grid.getCell(cx, cy).isDay = true; });

    game.balls = [placeBall(true, x, y, config.speed, 0)];
    game.handleCollisions();

    corners.forEach(([cx, cy]) => {
        assert.strictEqual(
            game.grid.getCell(cx, cy).isDay, false,
            `cell ${cx},${cy} was under the ball but never flipped`
        );
    });
});

test('a ball bounces off a matching cell', () => {
    const game = newGame();
    const cell = game.grid.getCell(6, 4);
    cell.isDay = true;

    // Just barely into the cell from the left, moving right.
    const ball = placeBall(true, 6 * config.cellSize - config.ballSize + 1, 4 * config.cellSize, config.speed, 0);
    game.balls = [ball];
    game.handleCollisions();

    assert.ok(ball.vx < 0, 'ball should have been turned around');
    assert.strictEqual(cell.isDay, false, 'the cell it hit should have flipped');
});

test('a ball passes through cells of the opposite color', () => {
    const game = newGame();
    for (let y = 0; y < config.gridHeight; y++) {
        for (let x = 0; x < config.gridWidth; x++) {
            game.grid.getCell(x, y).isDay = false;
        }
    }

    const ball = placeBall(true, 300, 300, config.speed, 0);
    game.balls = [ball];
    game.handleCollisions();

    assert.strictEqual(ball.vx, config.speed, 'ball should not have bounced');
});

test('elapsed time advances equally at different display refresh rates', () => {
    function runAt(frameRate) {
        const game = newGame();
        for (let y = 0; y < config.gridHeight; y++) {
            for (let x = 0; x < config.gridWidth; x++) {
                game.grid.getCell(x, y).isDay = false;
            }
        }

        const ball = placeBall(true, 100, 100, 1, 0);
        game.balls = [ball];
        for (let frame = 0; frame < frameRate; frame++) {
            game.advanceTime(1000 / frameRate);
        }
        return { x: ball.x, y: ball.y };
    }

    const baseline = runAt(60);
    [30, 90, 120, 144, 240].forEach(frameRate => {
        assert.deepStrictEqual(runAt(frameRate), baseline, `motion differed at ${frameRate} Hz`);
    });
});

test('two balls see the same grid snapshot regardless of processing order', () => {
    function runWithOrder(states) {
        const game = newGame();
        for (let y = 0; y < config.gridHeight; y++) {
            for (let x = 0; x < config.gridWidth; x++) {
                game.grid.getCell(x, y).isDay = false;
            }
        }

        const target = game.grid.getCell(2, 2);
        target.isDay = true;
        game.balls = states.map(isDay => placeBall(isDay, 51, 100, config.speed, 0));
        game.handleCollisions();

        return {
            targetIsDay: target.isDay,
            dayVelocity: game.balls.find(ball => ball.isDay).vx,
            nightVelocity: game.balls.find(ball => !ball.isDay).vx,
        };
    }

    const dayFirst = runWithOrder([true, false]);
    const nightFirst = runWithOrder([false, true]);
    assert.deepStrictEqual(dayFirst, nightFirst);
    assert.strictEqual(dayFirst.targetIsDay, false);
    assert.ok(dayFirst.dayVelocity < 0, 'the matching day ball should bounce');
    assert.ok(dayFirst.nightVelocity > 0, 'the non-matching night ball should pass through');
});

test('a circular ball does not collide through a bounding-box corner', () => {
    const game = newGame();
    for (let y = 0; y < config.gridHeight; y++) {
        for (let x = 0; x < config.gridWidth; x++) {
            game.grid.getCell(x, y).isDay = false;
        }
    }

    // The ball's 50px square reaches cell 1,1, but its 25px-radius circle does not.
    game.grid.getCell(1, 1).isDay = true;
    const ball = placeBall(true, 1, 1, config.speed, config.speed);

    assert.deepStrictEqual(game.findCollidingCells(ball), []);
});

test('a ball is pushed clear of a cell rather than left overlapping it', () => {
    const game = newGame();
    const ball = placeBall(true, 300, 300, config.speed, config.speed / 2);
    game.balls = [ball];

    // Every cell matches, so the ball collides on the very first frame.
    for (let y = 0; y < config.gridHeight; y++) {
        for (let x = 0; x < config.gridWidth; x++) {
            game.grid.getCell(x, y).isDay = true;
        }
    }

    game.handleCollisions();
    // The cells it touched are flipped, so nothing it still overlaps may match.
    assert.strictEqual(game.findCollidingCells(ball).length, 0);
});

test('the grid is built with real theme colors, never blank', () => {
    // The world used to be constructed before the theme was applied, so every
    // cell was born with an empty color string.
    const game = newGame();
    for (let y = 0; y < config.gridHeight; y++) {
        for (let x = 0; x < config.gridWidth; x++) {
            const cell = game.grid.getCell(x, y);
            assert.strictEqual(cell.color, cell.isDay ? config.dayColor : config.nightColor);
            assert.notStrictEqual(cell.color, '');
        }
    }
});

test('every theme defines both colors', () => {
    for (const [name, theme] of Object.entries(themes)) {
        assert.match(theme.dayColor, /^rgb\(/, `${name} has a bad dayColor`);
        assert.match(theme.nightColor, /^rgb\(/, `${name} has a bad nightColor`);
        assert.notStrictEqual(theme.dayColor, theme.nightColor, `${name} uses one color for both`);
    }
});
