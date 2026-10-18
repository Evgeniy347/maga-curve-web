import { test } from "node:test";
import assert from "node:assert/strict";
import { cubicRoots, montgomery, realWeierstrass, weierstrass } from "../site/js/curve.js";
import { isPrime, largestPrimeFactor, mod, squareRoots } from "../site/js/field.js";
import { MONTGOMERY_FORM } from "../site/js/forms.js";
import { formatCoordinate, formatPoint, isValidModulus, isValidScalar, lineEquation, queryValues } from "../site/js/page.js";
import { Plot, plotRange, tickSize, ticks } from "../site/js/plot.js";
import { realLineEquation } from "../site/js/reals-page.js";
import { realAdditionStages, realMultiplicationStages } from "../site/js/real-steps.js";
import { snapToCurve, snapToRealCurve } from "../site/js/snap.js";
import { additionStages, multiplicationStages, reduction, reductionTail, stepText } from "../site/js/steps.js";

function hasRepeatedRoot(f, df, p) {
  for (let x = 0; x < p; x += 1) if (mod(f(x), p) === 0 && mod(df(x), p) === 0) return true;
  return false;
}

test("isSingular agrees with the definition «the cubic has a repeated root» for every Weierstrass and Montgomery curve over small fields", () => {
  for (const p of [5, 7, 11, 13]) {
    for (let a = 0; a < p; a += 1) {
      for (let b = 0; b < p; b += 1) {
        const expected = hasRepeatedRoot((x) => x ** 3 + a * x + b, (x) => 3 * x * x + a, p);
        assert.equal(weierstrass({ a, b, p }).isSingular(), expected, `y² = x³ + ${a}x + ${b} over F_${p}: 4a³ + 27b² ≡ 0 exactly when x³ + ax + b has a double root`);
      }
      const expected = hasRepeatedRoot((x) => x ** 3 + a * x * x + x, (x) => 3 * x * x + 2 * a * x + 1, p);
      assert.equal(montgomery({ A: a, p }).isSingular(), expected, `y² = x³ + ${a}x² + x over F_${p}: singular exactly when A² ≡ 4`);
    }
  }
});

test("equals treats ∞ as a point of its own and compares both coordinates", () => {
  const curve = montgomery({ A: 6, p: 29 });
  assert.equal(curve.equals(null, null), true, "∞ = ∞");
  assert.equal(curve.equals([9, 8], null), false, "a finite point is not ∞");
  assert.equal(curve.equals(null, [9, 8]), false, "∞ is not a finite point");
  assert.equal(curve.equals([9, 8], [9, 21]), false, "same x, different y: G ≠ −G");
  assert.equal(curve.equals([9, 8], [25, 8]), false, "same y, different x");
  assert.equal(curve.equals([9, 8], [9, 8]), true, "identical points");
});

test("cyclicSubgroup lists exactly the finite multiples of the point", () => {
  const curve = montgomery({ A: 6, p: 29 });
  assert.deepEqual(curve.cyclicSubgroup([9, 8]), [[9, 8], [25, 17], [25, 12], [9, 21]], "⟨G⟩ = {G, 2G, 3G, 4G} ∪ {∞}, ord G = 5");
  assert.equal(curve.cyclicSubgroup([19, 5]).length, 39, "a point of order 40 generates all 39 finite points");
  assert.deepEqual(curve.cyclicSubgroup([0, 0]), [[0, 0]], "(0, 0) has order 2");
});

test("isPrime rejects odd squares and largestPrimeFactor finds the subgroup order", () => {
  assert.deepEqual([9, 25, 49, 121, 169].map(isPrime), [false, false, false, false, false], "the trial bound is m·m ≤ n, inclusive: squares of primes are composite");
  assert.deepEqual([40, 49, 9, 20, 2, 97, 1].map(largestPrimeFactor), [5, 7, 3, 5, 2, 97, 1], "#E = 40 → ℓ = 5; prime squares and primes are handled");
});

test("squareRoots maps each residue to both square roots", () => {
  const roots = squareRoots(29);
  assert.deepEqual(roots.get(6), [8, 21], "8² = 64 ≡ 6 and 21² = 441 ≡ 6 (manual run, table 1.2)");
  assert.deepEqual(roots.get(0), [0], "0 has a single root");
  assert.equal(roots.has(2), false, "2 is a non-residue mod 29");
});

test("real roots and singularity", () => {
  for (const [a, b] of [[-4, 1], [-7, 6], [-3, 1]]) {
    const roots = cubicRoots(a, b);
    assert.equal(roots.length, 3, `x³ + ${a}x + ${b} has three real roots`);
    for (const x of roots) assert.ok(Math.abs(x ** 3 + a * x + b) < 1e-9, `${x} must be a root of x³ + ${a}x + ${b}`);
  }
  assert.equal(realWeierstrass({ a: -3, b: 2 }).isSingular(), true, "4·(−27) + 27·4 = 0: cusp-free node at x = 1");
  assert.equal(realWeierstrass({ a: -7, b: 10 }).isSingular(), false, "the default real curve is smooth");
});

test("form equation shows B only when it is not 1", () => {
  assert.match(MONTGOMERY_FORM.equation({ a: 6, b: 1 }), /^<em>y<\/em>/, "B = 1 is not written");
  assert.match(MONTGOMERY_FORM.equation({ a: 6, b: 2 }), /^2<em>y<\/em>/, "B = 2 is written as 2y²");
  assert.match(MONTGOMERY_FORM.equation({ a: 6, b: -1 }), /^−<em>y<\/em>/, "B = −1 is written as −y²");
});

test("page helpers: query parsing, point text, line equation and input limits", () => {
  assert.deepEqual([...queryValues("?a=6&px=x&B=2&p=-7&qy")], [["a", "6"], ["p", "-7"]], "only lowercase names with numeric values are applied");
  assert.equal(formatPoint(null), "∞", "the point at infinity");
  assert.equal(formatPoint(undefined), "не определено", "composite p: the sum does not exist");
  assert.equal(formatPoint([2, 11]), "(2, 11)", "a finite point");
  const curve = montgomery({ A: 6, p: 29 });
  assert.equal(lineEquation(curve.addTrace([2, 11], [7, 8]), [2, 11], 29), "y ≡ 11x + 18 (mod 29)", "11·2 + 18 = 40 ≡ 11");
  assert.equal(lineEquation(curve.addTrace([7, 8], [7, 8]), [7, 8], 29), "y ≡ 8 (mod 29)", "λ = 0: horizontal tangent at (7, 8)");
  assert.equal(lineEquation(curve.addTrace([9, 8], [9, 21]), [9, 8], 29), "x = 9", "vertical line");
  const sloped = { lambda: { value: 3 } };
  assert.equal(lineEquation(sloped, [1, 3], 29), "y ≡ 3x (mod 29)", "zero intercept is not written");
  assert.deepEqual([1, 2, 29, 4999, 5000, 2.5, -7].map(isValidModulus), [false, true, true, true, false, false, false], "p is an integer in [2, 4999]");
  assert.deepEqual([0, -538, 2 ** 31 - 1, 2 ** 31, 1.5].map(isValidScalar), [true, true, true, false, false], "|n| ≤ 2³¹ − 1, integer");
});

test("tick steps switch exactly at flot's thresholds", () => {
  const pixels = 100;
  assert.equal(tickSize(0, 4.5, pixels), 2, "norm = 1.5 → step 2");
  assert.equal(tickSize(0, 4.4, pixels), 1, "norm < 1.5 → step 1");
  assert.equal(tickSize(0, 7.5, pixels), 2.5, "norm = 2.5 → step 2.5");
  assert.equal(tickSize(0, 22.5, pixels), 10, "norm = 7.5 → step 10");
  assert.equal(tickSize(0, 22.4, pixels), 5, "norm < 7.5 → step 5");
});

test("plot maps the padded field square onto the 496 px plot area", () => {
  assert.deepEqual(plotRange(29), { xMin: -0.6, xMax: 28.6, yMin: -0.6, yMax: 28.6 }, "0.6 margin keeps edge points and badges inside");
  const plot = new Plot(null);
  plot.range = plotRange(29);
  assert.deepEqual(plot.toPixel([-0.6, 28.6]), [44, 16], "top-left corner of the plot area");
  assert.deepEqual(plot.toPixel([28.6, -0.6]), [540, 512], "bottom-right corner");
  assert.deepEqual(plot.toPixel([0, 0]), [54.2, 501.8], "origin, as in the design mockup");
});

test("Fp narration: boundaries of reduction, the full right side for Weierstrass, chain operands and numbering", () => {
  assert.equal(reduction(29, 29), "29 = 1·29 + 0 → 0", "p itself reduces to 0");
  assert.equal(reduction(0, 29), "0", "0 is already reduced");
  assert.deepEqual(reductionTail(29, 29), ["29", "1·29 + 0"], "tail for raw = p");
  assert.deepEqual(reductionTail(-58, 29), ["−58 + 2·29"], "two wraps");
  assert.deepEqual(reductionTail(28, 29), [], "no tail inside [0, p)");
  const W = weierstrass({ a: 18, b: 14, p: 29 });
  const { check } = additionStages(W, [4, 11], [9, 8], { A: "A", B: "B", C: "a", D: "b" });
  assert.equal(stepText(check.right, 29), "x₃³ + 18x₃ + 14 = 21³ + 18·21 + 14 = 9653 = 332·29 + 25 → 25", "a·x with a ≠ 1 is written as 18·21");
  const curve = montgomery({ A: 6, p: 29 });
  const { links } = multiplicationStages(curve, 5, [9, 8]);
  assert.equal(links[0].step, 1, "steps are numbered from 1");
  assert.deepEqual(links[1].operands, [[9, 8], [9, 8]], "a doubling adds the previous point to itself");
  assert.deepEqual(links[3].operands, [[9, 21], [9, 8]], "an addition adds the base point");
});

test("snapping: ties, exact candidates after a curve change, and the real half-planes", () => {
  const curve = weierstrass({ a: 2, b: 3, p: 97 });
  assert.deepEqual(snapToCurve(curve, [18, 10], [18, 10]), [17, 10], "unchanged off-curve input after a curve change → nearest point overall");
  assert.deepEqual(snapToCurve(montgomery({ A: 6, p: 29 }), [1, 0], [1, 0]), [0, 0], "(1, 0) is not on the curve; the nearest point overall is (0, 0)");
  assert.deepEqual(snapToCurve(curve, [17, 11], [17, 10]), [11, 17], "y went up from 10: among points with y > 10 the nearest to (17, 11) is (11, 17)");
  const real = realWeierstrass({ a: -7, b: 10 });
  assert.deepEqual(snapToRealCurve(real, [2, 0], [1, 2]), [2, -2], "x changed and y typed as 0 while previous y > 0: take the lower half");
  assert.deepEqual(snapToRealCurve(real, [Number.NaN, 2], [1, 2]), [1, 2], "NaN keeps the previous point");
  assert.deepEqual(snapToRealCurve(real, [1, 4], [1, 2]), [-1, 4], "x unchanged, y = 4: x³ − 7x − 6 = 0 has roots −2, −1, 3; −1 and 3 are both 2 away from x = 1, the leftmost wins as in the original");
  const oval = realWeierstrass({ a: -4, b: 1 });
  assert.deepEqual(snapToRealCurve(oval, [3, 1], [2, 1]), [3, 4], "beyond the last root x is valid: y = √(27 − 12 + 1) = 4");
});

test("real narration: vertical messages, chain forms and line equations", () => {
  const curve = realWeierstrass({ a: -4, b: 0 });
  assert.match(realAdditionStages(curve, [2, 0], [2, 0]).message, /^касательная/, "tangent at a root is vertical");
  assert.match(realAdditionStages(curve, [-1, Math.sqrt(3)], [-1, -Math.sqrt(3)]).message, /^x₁ = x₂/, "opposite points");
  const { stages } = realMultiplicationStages(realWeierstrass({ a: -7, b: 10 }), 5, [1, 2]);
  assert.deepEqual(stages[0].steps.map((s) => s.forms[0]), ["P", "2·[1]P (бит 0)", "2·[2]P (бит 1)", "[4]P + P"], "each link says how it was obtained");
  const real = realWeierstrass({ a: -7, b: 10 });
  assert.equal(realLineEquation(real.addTrace([1, 2], [3, 4]), [1, 2]), "y = 1x + 1", "through (1, 2) and (3, 4)");
  assert.equal(realLineEquation(real.addTrace([1, 2], [3, -4]), [1, 2]), "y = −3x + 5", "negative slope");
  assert.equal(realLineEquation(real.addTrace([1, 2], [2, 2]), [1, 2]), "y = 0x + 2", "horizontal line");
  assert.equal(realLineEquation(real.addTrace([3, -4], [1, 2]), [3, -4]), "y = −3x + 5", "the same line from the other point");
  assert.equal(realLineEquation({ lambda: 2 }, [0, -1]), "y = 2x − 1", "negative intercept uses the minus sign");
  assert.equal(realLineEquation({ lambda: undefined }, [2, 0]), "x = 2", "vertical line");
});

test("leftover mutants: boundaries that the main tests did not pin down", () => {
  assert.equal(formatCoordinate(null, 0), "∞", "R = ∞ is shown as ∞ in the readonly field");
  assert.equal(formatCoordinate(undefined, 1), "—", "an undefined sum is shown as a dash");
  assert.equal(formatCoordinate([19, 5], 1), "5", "a finite coordinate is printed as is");
  assert.deepEqual(reductionTail(0, 29), [], "0 needs no reduction");
  assert.equal(tickSize(0, 75, 100), 25, "norm = 2.5 with magnitude 10 → step 25");
  assert.deepEqual(ticks(3, 28, 100), [10, 20], "range 25 over 100 px gives step 10; ticks start at the first multiple of 10 above min = 3");
  assert.equal(realLineEquation({ lambda: 1 }, [1, 1]), "y = 1x + 0", "a zero intercept keeps the plus sign");
});
