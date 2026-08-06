# day-night

Day / Night ball bouncing AI demo

## Running it

Open `src/index.html` in a browser. There is no build step.

## Running the tests

Requires [Node.js](https://nodejs.org) (v18 or newer). From the project root:

```sh
npm test
```

No dependencies to install — the tests use Node's built-in test runner.

Each test pins down a bug that was found in the simulation, so if one comes back
the test fails instead of the demo quietly misbehaving.

## Layout

| File | What's in it |
| --- | --- |
| `src/engine.js` | The simulation: grid, balls, collisions. No DOM, so the tests can load it. |
| `src/app.js` | Drawing to the page and wiring up the theme picker. |
| `src/index.html` | The page. Loads `engine.js` before `app.js`. |
| `src/style.css` | Styling. |
| `test/engine.test.js` | The tests. |
