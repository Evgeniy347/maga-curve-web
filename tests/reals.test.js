import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RealCurve, doubleAndAdd } from "../site/js/curve.js";
import { realCurvePolyline, realLine, realPlotRange } from "../site/js/real-geometry.js";
import { formatRealPoint, plural, realAdditionStages, realMultiplicationStages } from "../site/js/real-steps.js";
import { round5, snapToRealCurve } from "../site/js/snap.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/corbellini-reals.json", import.meta.url), "utf8"));
const EPS = 1e-6;

function assertClose(actual, expected, message) {
  if (expected === null || actual === null) {
    assert.equal(actual, expected, message);
    return;
  }
  if (Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, `${message}: length ${actual.length} ≠ ${expected.length}`);
    expected.forEach((value, i) => assertClose(actual[i], value, `${message} [${i}]`));
    return;
  }
  if (typeof expected === "object") {
    for (const key of Object.keys(expected)) assertClose(actual[key], expected[key], `${message}.${key}`);
    return;
  }
  assert.ok(Math.abs(actual - expected) <= EPS * Math.max(1, Math.abs(expected)), `${message}: ${actual} ≠ ${expected}`);
}

test("roots, stationary points, plot range and curve outline match the original reals page", () => {
  for (const { a, b, roots, stationary, range, polyline } of fixture.curves) {
    const curve = new RealCurve({ a, b });
    const label = `y² = x³ + ${a}x + ${b}`;
    assertClose(curve.roots(), roots, `${label}: real roots of x³ + ax + b (Cardano / trigonometric form)`);
    assertClose(curve.stationaryPoints(), stationary, `${label}: points with 3x² + a = 0 above the axis`);
    assertClose(realPlotRange(curve), range, `${label}: square plot range with 1/8 margins around roots and extrema`);
    assertClose(
      realCurvePolyline(curve, range), polyline,
      `${label}: outline traced right-to-left on top, mirrored below, closed oval when there are three roots`,
    );
  }
});

test("addition, the drawn line and the plot range match the original reals-add page", () => {
  for (const { a, b, p, q, r, range, line } of fixture.additions) {
    const curve = new RealCurve({ a, b });
    const trace = curve.addTrace(p, q);
    const label = `${JSON.stringify(p)} + ${JSON.stringify(q)} on y² = x³ + ${a}x + ${b}`;
    assertClose(trace.result, r, `${label}: R`);
    const third = curve.neg(trace.result);
    const ownRange = realPlotRange(curve, [p, q, trace.result, third]);
    assertClose(ownRange, range, `${label}: plot range must include P, Q, R and −R`);
    assertClose(realLine(trace, p, ownRange), line, `${label}: line through P and Q across the whole plot`);
  }
});

test("scalar multiplication matches the original reals-mul page", () => {
  for (const { a, b, n, p, q, range } of fixture.multiplications) {
    const curve = new RealCurve({ a, b });
    const product = curve.multiply(n, p);
    assertClose(product, q, `${n}·${JSON.stringify(p)} on y² = x³ + ${a}x + ${b}`);
    assertClose(realPlotRange(curve, [p, product]), range, `${n}·P: plot range must include P and Q`);
  }
});

test("default sum P + Q = (1, 2) + (3, 4) = (−3, 2) is narrated in three stages and checked on the curve", () => {
  const curve = new RealCurve({ a: -7, b: 10 });
  const { stages, check } = realAdditionStages(curve, [1, 2], [3, 4]);
  assert.deepEqual(stages.map((stage) => stage.steps.at(-1).value), ["1", "−3", "2"], "λ = (4 − 2)/(3 − 1) = 1, x₃ = 1 − 1 − 3 = −3, y₃ = 1·(1 + 3) − 2 = 2");
  assert.equal(check.holds, true, "(−3, 2): 4 = −27 + 21 + 10");
  assert.equal(formatRealPoint(curve.add([1, 2], [3, 4])), "(−3, 2)", "minus sign is the typographic −, not a hyphen");
});

test("binary method for n = 5 = 101₂ is two doublings and one addition, like the manual run for d = 538", () => {
  const curve = new RealCurve({ a: -7, b: 10 });
  const chain = doubleAndAdd(curve, 5, [1, 2]);
  assert.deepEqual(chain.map((link) => [link.action, link.multiplier]), [["start", 1], ["double", 2], ["double", 4], ["add", 5]], "1 → 2 → 4 → 5");
  const { stages } = realMultiplicationStages(curve, 5, [1, 2]);
  assert.equal(stages[0].title, "Бинарный метод: |n| = 5 = 101₂", "the stage title shows n in binary");
  assert.equal(stages[0].formula, "2 удвоения + 1 сложение", "cost of the chain, with Russian plural forms");
  assert.deepEqual(stages[0].steps.map((s) => s.label), ["[1]P", "[2]P", "[4]P", "[5]P"], "every link names the multiple it holds");
});

test("negative n walks the chain on −P", () => {
  const curve = new RealCurve({ a: -7, b: 10 });
  const product = curve.multiply(-3, [1, 2]);
  assertClose(product, curve.neg(curve.multiply(3, [1, 2])), "(−3)·P = −(3·P)");
  assert.equal(realMultiplicationStages(curve, 0, [1, 2]).message, "n = 0 или P = ∞ → n·P = ∞", "0·P is the point at infinity");
});

test("snapping keeps points on the real curve the way the original page does", () => {
  const curve = new RealCurve({ a: -7, b: 10 });
  assert.deepEqual(snapToRealCurve(curve, [1, 2], [1, 2]), [1, 2], "a valid point is kept");
  assert.deepEqual(snapToRealCurve(curve, [2, 2], [1, 2]), [2, 2], "x = 2: y = √(8 − 14 + 10) = 2 on the upper half");
  assert.deepEqual(snapToRealCurve(curve, [-10, 2], [1, 2]), [round5(curve.roots()[0]), 0], "left of the only root there is no point: jump to the root");
  const oval = new RealCurve({ a: -4, b: 1 });
  const [, r1, r2] = oval.roots();
  assert.deepEqual(snapToRealCurve(oval, [1, 1], [0, 1]), [round5(r2), 0], `moving right into the gap (${r1}, ${r2}) between the oval and the branch jumps to the far root`);
});

test("Russian plural forms: 1 удвоение, 2 удвоения, 5 удвоений, 11 удвоений, 21 удвоение", () => {
  const forms = ["удвоение", "удвоения", "удвоений"];
  assert.deepEqual(
    [1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => plural(n, forms)),
    ["1 удвоение", "2 удвоения", "5 удвоений", "11 удвоений", "12 удвоений", "21 удвоение", "22 удвоения", "25 удвоений", "111 удвоений"],
    "11–14 always take the genitive plural; otherwise the last digit decides",
  );
});
