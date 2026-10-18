import { test } from "node:test";
import assert from "node:assert/strict";
import { ticks } from "../site/js/plot.js";

test("ticks follow flot's 0.3·√pixels rule: step 10 for p = 97 on a 600 px plot", () => {
  assert.deepEqual(ticks(0, 96, 556), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], "original page shows 0..90 every 10 for p = 97");
});

test("step 5 for the toy curve p = 29", () => {
  assert.deepEqual(ticks(0, 28, 556), [0, 5, 10, 15, 20, 25], "28 / (0.3·√556) ≈ 3.96 rounds to the nice step 5");
});
