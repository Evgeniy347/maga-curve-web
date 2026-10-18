import { test } from "node:test";
import assert from "node:assert/strict";
import { montgomery, weierstrass } from "../site/js/curve.js";
import { additionStages, additionSteps, reduction, stepText } from "../site/js/steps.js";

const curve = montgomery({ A: 6, B: 1, p: 29 });

test("reduction is written as in the manual run: quotient form above p, + k·p below zero", () => {
  assert.equal(reduction(5, 29), "5", "a residue already in [0, p) is printed as is");
  assert.equal(reduction(136, 29), "136 = 4·29 + 20 → 20", "positive overflow shows the division with remainder");
  assert.equal(reduction(-3, 29), "−3 + 29 = 26", "one wrap shows + 29");
  assert.equal(reduction(-49, 29), "−49 + 2·29 = 9", "two wraps show + 2·29");
});

test("P + Q = (2, 11) + (7, 8) is narrated line for line like п. 1.6.2", () => {
  assert.deepEqual(additionSteps(curve, [2, 11], [7, 8]), [
    "y₂ − y₁ = 8 − 11 = −3 + 29 = 26",
    "x₂ − x₁ = 7 − 2 = 5",
    "5⁻¹ = 6",
    "λ = 26·6 = 156 = 5·29 + 11 → 11",
    "λ² = 11² = 121 = 4·29 + 5 → 5",
    "x₃ = λ² − A − x₁ − x₂ = 5 − 6 − 2 − 7 = −10 + 29 = 19",
    "x₁ − x₃ = 2 − 19 = −17 + 29 = 12",
    "λ·(x₁ − x₃) = 11·12 = 132 = 4·29 + 16 → 16",
    "y₃ = 16 − 11 = 5",
  ], "the panel must reproduce the hand computation so students can check it step by step");
});

test("[2]G = 2·(9, 8) is narrated like п. 1.6.3", () => {
  assert.deepEqual(additionSteps(curve, [9, 8], [9, 8]), [
    "3x² = 3·9² = 3·81 = 243 = 8·29 + 11 → 11",
    "2Ax = 2·6·9 = 108 = 3·29 + 21 → 21",
    "числитель = 3x² + 2Ax + 1 = 11 + 21 + 1 = 33 = 1·29 + 4 → 4",
    "знаменатель = 2y = 2·8 = 16",
    "16⁻¹ = 20",
    "λ = 4·20 = 80 = 2·29 + 22 → 22",
    "λ² = 22² = 484 = 16·29 + 20 → 20",
    "x₃ = λ² − A − x₁ − x₂ = 20 − 6 − 9 − 9 = −4 + 29 = 25",
    "x₁ − x₃ = 9 − 25 = −16 + 29 = 13",
    "λ·(x₁ − x₃) = 22·13 = 286 = 9·29 + 25 → 25",
    "y₃ = 25 − 8 = 17",
  ], "doubling uses the tangent slope (3x² + 2Ax + 1)/(2By)");
});

test("[3]G = (25, 17) + (9, 8) is narrated like п. 1.6.4, including a double wrap", () => {
  const steps = additionSteps(curve, [25, 17], [9, 8]);
  assert.equal(steps[5], "x₃ = λ² − A − x₁ − x₂ = 7 − 6 − 25 − 9 = −33 + 2·29 = 25", "−33 needs + 2·29");
  assert.equal(steps.at(-1), "y₃ = 0 − 17 = −17 + 29 = 12", "[3]G = (25, 12)");
});

test("B ≠ 1 shows up in the formulas instead of being silently dropped", () => {
  const scaled = montgomery({ A: 6, B: 2, p: 29 });
  const [point] = scaled.points().filter(([, y]) => y !== 0);
  const steps = additionSteps(scaled, point, point);
  assert.match(steps[3], /^знаменатель = 2By = 2·2·/, "tangent denominator is 2By");
  assert.match(steps[7], /^x₃ = B·λ² − A − x₁ − x₂ = 2·/, "x₃ = B·λ² − A − x₁ − x₂");
});

test("P + (−P) ends with infinity in one line", () => {
  assert.deepEqual(
    additionSteps(curve, [9, 8], [9, 21]), ["x₁ = x₂ = 9, y₁ = −y₂ → прямая вертикальна, P + Q = ∞"],
    "opposite points give a vertical line and no third intersection",
  );
});

test("stages group the narration as slope → x₃ → y₃ and end with a check that R is on the curve", () => {
  const { stages, check } = additionStages(curve, [2, 11], [7, 8]);
  assert.deepEqual(
    stages.map((stage) => stage.title), ["Наклон секущей λ", "Абсцисса x₃", "Ордината y₃"],
    "the steps panel shows three stages, each ending with the value it defines",
  );
  assert.deepEqual(stages.map((stage) => stage.steps.at(-1).value), [11, 19, 5], "λ = 11, x₃ = 19, y₃ = 5");
  assert.equal(stepText(check.left, 29), "y₃² = 5² = 25", "left side of the curve equation at R = (19, 5)");
  assert.equal(
    stepText(check.right, 29), "x₃³ + 6x₃² + x₃ = 19³ + 6·19² + 19 = 9044 = 311·29 + 25 → 25",
    "right side x³ + 6x² + x at x₃ = 19 must also reduce to 25",
  );
  assert.equal(check.holds, true, "R = (19, 5) satisfies y² = x³ + 6x² + x over F_29");
});

test("a doubling is narrated as a tangent stage", () => {
  const { stages } = additionStages(curve, [9, 8], [9, 8]);
  assert.equal(stages[0].title, "Наклон касательной λ", "P = Q uses the tangent slope");
  assert.equal(stages[0].formula, "λ = (3x² + 2Ax + 1)·(2y)⁻¹", "Montgomery tangent: (3x² + 2Ax + 1)/(2By) with B = 1");
});

test("Weierstrass narration has no phantom A = 0 terms and names coefficients a, b", () => {
  const names = { A: "A", B: "B", C: "a", D: "b" };
  const W = weierstrass({ a: 18, b: 14, p: 29 });
  const chord = additionStages(W, [4, 11], [9, 8], names);
  assert.equal(chord.stages[1].formula, "x₃ = λ² − x₁ − x₂", "y² = x³ + ax + b has A = 0, so x₃ = λ² − x₁ − x₂");
  assert.deepEqual(chord.trace.result, [21, 5], "the isomorphic image of (19, 5)");
  assert.equal(stepText(chord.check.right, 29).split(" = ")[0], "x₃³ + 18x₃ + 14", "right side uses the actual a = 18, b = 14");
  const tangent = additionStages(W, [4, 11], [4, 11], names);
  assert.equal(tangent.stages[0].formula, "λ = (3x² + a)·(2y)⁻¹", "Weierstrass tangent slope is (3x² + a)/(2y)");
  assert.ok(
    tangent.stages[0].steps.every((item) => !item.label.includes("2Ax")),
    "no 2Ax step when A = 0: it would show a meaningless 2·0·x",
  );
});
