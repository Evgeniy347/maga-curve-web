import { test } from "node:test";
import assert from "node:assert/strict";
import { realMontgomery, realWeierstrass } from "../site/js/curve.js";
import { realCurvePolyline, realPlotRange } from "../site/js/real-geometry.js";
import { realAdditionStages, realMultiplicationStages } from "../site/js/real-steps.js";
import { snapToRealCurve } from "../site/js/snap.js";

const EPS = 1e-9;
const A = 6;
const montgomery = realMontgomery({ A });
const weierstrass = realWeierstrass({ a: 1 - A * A / 3, b: 2 * A ** 3 / 27 - A / 3 });
const shift = A / 3;
const toW = (point) => point && [point[0] + shift, point[1]];
const close = (actual, expected, message) => {
  if (expected === null) return assert.equal(actual, null, message);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-7 * Math.max(1, Math.abs(expected[i])), `${message}: ${actual} ≠ ${expected}`));
};

test("the thesis curve over ℝ: y² = x³ + 6x² + x has roots 0 and −3 ± 2√2, an oval and a branch", () => {
  const roots = montgomery.roots();
  const expected = [-3 - 2 * Math.SQRT2, -3 + 2 * Math.SQRT2, 0];
  roots.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < EPS, `root ${i}: ${x} ≠ ${expected[i]}; x(x² + 6x + 1) = 0`));
  assert.equal(montgomery.isSingular(), false, "B(A² − 4) = 32 ≠ 0");
  assert.equal(realMontgomery({ A: 2 }).isSingular(), true, "A² = 4: x(x + 1)² has a double root");
  const polyline = realCurvePolyline(montgomery, realPlotRange(montgomery));
  assert.equal(polyline.filter((p) => p === null).length, 1, "three real roots → closed oval + open branch, split by one gap");
});

test("Montgomery and Weierstrass forms are the same curve: x = X − A/3 maps roots, extrema, sums and multiples", () => {
  montgomery.roots().forEach((x, i) => assert.ok(Math.abs(x + shift - weierstrass.roots()[i]) < EPS, "roots shift by A/3 = 2"));
  montgomery.stationaryPoints().forEach((p, i) => close(toW(p), weierstrass.stationaryPoints()[i], "stationary points shift by 2"));
  const P = [-1, 2];
  const Q = [1, Math.sqrt(8)];
  assert.ok(Math.abs(montgomery.rhs(-1) - 4) < EPS, "(−1, 2) is on the curve: −1 + 6 − 1 = 4");
  close(toW(montgomery.add(P, Q)), weierstrass.add(toW(P), toW(Q)), "P + Q");
  close(toW(montgomery.add(P, P)), weierstrass.add(toW(P), toW(P)), "2P uses the tangent (3x² + 2Ax + 1)/(2y)");
  for (const n of [2, 3, 5, 13, -3]) close(toW(montgomery.multiply(n, P)), weierstrass.multiply(n, toW(P)), `${n}·P`);
  assert.equal(montgomery.add(P, montgomery.neg(P)), null, "P + (−P) = ∞");
});

test("B scales the curve: B·y² = x³ + Ax² + x is y² = (x³ + Ax² + x)/B", () => {
  const scaled = realMontgomery({ A, B: 4 });
  const P = [-1, 1];
  assert.ok(Math.abs(scaled.y(-1) - 1) < EPS, "4·1² = 4 = rhs(−1)");
  const sum = scaled.add(P, P);
  assert.ok(Math.abs(scaled.B * sum[1] ** 2 - scaled.rhs(sum[0])) < 1e-6, "2P stays on B·y² = x³ + Ax² + x");
});

test("narration over ℝ for Montgomery: formulas carry A and B, the check uses the full cubic", () => {
  const { stages, check } = realAdditionStages(montgomery, [-1, 2], [-1, 2], { A: "A", B: "B", C: "C", D: "D" });
  assert.equal(stages[0].formula, "λ = (3x² + 2Ax + 1) / (2y)", "Montgomery tangent slope");
  assert.equal(stages[0].steps[0].forms[0], "(3·(−1)² + 2·6·(−1) + 1) / (2·2)", "numbers substituted into the same terms");
  assert.equal(stages[1].formula, "x₃ = λ² − A − x₁ − x₂", "x₃ subtracts A");
  assert.equal(check.right.label, "x₃³ + 6x₃² + x₃", "right side with the actual A = 6");
  assert.equal(check.holds, true, "2P is on the curve");
  const scaled = realAdditionStages(realMontgomery({ A, B: 4 }), [-1, 1], [-1, 1], { A: "A", B: "B", C: "C", D: "D" });
  assert.equal(scaled.stages[0].formula, "λ = (3x² + 2Ax + 1) / (2By)", "B appears in the tangent");
  assert.equal(scaled.stages[1].formula, "x₃ = Bλ² − A − x₁ − x₂", "and in x₃");
  assert.equal(scaled.check.left.label, "By₃²", "and on the left side of the check");
  const { stages: weierstrassStages } = realAdditionStages(weierstrass, [1, 2], [1, 2]);
  assert.equal(weierstrassStages[0].formula, "λ = (3x² + a) / (2y)", "Weierstrass keeps its own letters");
  assert.equal(weierstrassStages[1].formula, "x₃ = λ² − x₁ − x₂", "no A term when A = 0");
});

test("multiplication chain and snapping work on the Montgomery oval", () => {
  const { stages } = realMultiplicationStages(montgomery, 5, [-1, 2]);
  assert.equal(stages[0].formula, "2 удвоения + 1 сложение", "5 = 101₂");
  assert.deepEqual(snapToRealCurve(montgomery, [-1, 2], [-1, 2]), [-1, 2], "a valid oval point is kept");
  assert.deepEqual(snapToRealCurve(montgomery, [-0.1, 2], [-1, 2]), [0, 0], "moving right into the gap (−0.17, 0) between the oval and the branch jumps across to the branch root 0");
  assert.deepEqual(snapToRealCurve(montgomery, [-0.1, 2], [1, 2]), [-0.17157, 0], "moving left into the gap stops at the oval root −3 + 2√2");
});
