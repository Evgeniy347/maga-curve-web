import { test } from "node:test";
import assert from "node:assert/strict";
import { montgomery } from "../site/js/curve.js";

const curve = montgomery({ A: 6, B: 1, p: 29 });
const G = [9, 8];

const MANUAL_RUN_POINTS = {
  0: [0], 2: [11, 18], 7: [8, 21], 8: [11, 18], 9: [8, 21], 11: [3, 26], 12: [9, 20], 13: [11, 18],
  15: [10, 19], 16: [14, 15], 17: [9, 20], 18: [14, 15], 19: [5, 24], 20: [3, 26], 21: [3, 26],
  23: [9, 20], 24: [7, 22], 25: [12, 17], 26: [13, 16], 28: [2, 27],
};

test("points of y² = x³ + 6x² + x over F_29 match the table of the manual run (п. 1.3)", () => {
  const expected = Object.entries(MANUAL_RUN_POINTS).flatMap(([x, ys]) => ys.map((y) => [Number(x), y]));
  assert.deepEqual(curve.points(), expected, "every x with f(x) a square gives (x, y) and (x, 29 − y); x = 0 gives only (0, 0)");
  assert.equal(curve.order(), 40, "#E = 38 + 1 + ∞ = 40 = 8·5: cofactor 8 like X25519");
});

test("the toy curve is non-singular and its order lies in the Hasse interval [20, 40]", () => {
  assert.equal(curve.isSingular(), false, "B·(A² − 4) = 32 ≡ 3 ≠ 0 (mod 29)");
  assert.ok(Math.abs(curve.order() - 30) <= 2 * Math.sqrt(29), "|#E − (p + 1)| ≤ 2√p by Hasse");
});

test("G = (9, 8) lies on the curve and generates the subgroup of prime order ℓ = 5", () => {
  assert.ok(curve.contains(G), "f(9) = 9·20 = 180 ≡ 6 and 8² = 64 ≡ 6");
  assert.equal(curve.pointOrder(G), 5, "[4]G = (9, 21) = −G, hence [5]G = ∞ (п. 1.8)");
});

test("P + Q = (2, 11) + (7, 8) = (19, 5) (п. 1.6.2)", () => {
  assert.deepEqual(curve.add([2, 11], [7, 8]), [19, 5], "λ = 26·5⁻¹ = 26·6 ≡ 11, x₃ = 121 − 6 − 2 − 7 ≡ 19, y₃ = 11·12 − 11 ≡ 5");
});

test("doubling and scalar multiples of G match the manual run", () => {
  assert.deepEqual(curve.add(G, G), [25, 17], "[2]G: λ = 4·16⁻¹ = 4·20 ≡ 22 (п. 1.6.3)");
  assert.deepEqual(curve.multiply(3, G), [25, 12], "[3]G = [2]G + G (п. 1.6.4)");
  assert.deepEqual(curve.multiply(4, G), [9, 21], "[4]G = −G (п. 1.7)");
  assert.equal(curve.multiply(5, G), null, "[5]G = ∞");
  assert.deepEqual(curve.multiply(538, G), [25, 12], "Q = [538]G = [538 mod 5]G = [3]G = (25, 12) (п. 1.9)");
});

test("the 2-torsion point (0, 0) doubles to infinity", () => {
  assert.equal(curve.add([0, 0], [0, 0]), null, "tangent at y = 0 is vertical, so 2·(0, 0) = ∞");
});

test("a non-unit B scales the curve: B·y² = x³ + Ax² + x", () => {
  const twisted = montgomery({ A: 6, B: 2, p: 29 });
  for (const point of twisted.points()) {
    assert.ok(twisted.contains(twisted.add(point, point)), `2·${JSON.stringify(point)} must stay on 2y² = x³ + 6x² + x`);
  }
  assert.equal(twisted.order(), 20, "B = 2 is a non-square mod 29, so this is the quadratic twist: #E′ = 2(p + 1) − #E = 20");
});
