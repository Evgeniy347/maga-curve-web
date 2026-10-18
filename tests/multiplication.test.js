import { test } from "node:test";
import assert from "node:assert/strict";
import { montgomery } from "../site/js/curve.js";
import { multipleName, multiplicationStages } from "../site/js/steps.js";

const curve = montgomery({ A: 6, B: 1, p: 29 });
const G = [9, 8];

test("d = 538 = 1000011010₂ walks exactly the table of п. 1.7: 9 doublings + 3 additions = 12 operations", () => {
  const { links, doublings, additions } = multiplicationStages(curve, 538, G);
  assert.deepEqual(
    links.map((link) => link.multiplier), [1, 2, 4, 8, 16, 32, 33, 66, 67, 134, 268, 269, 538],
    "left-to-right binary method: double on every bit, add G on every 1",
  );
  assert.deepEqual(
    links.map((link) => link.residue), [1, 2, 4, 3, 1, 2, 3, 1, 2, 4, 3, 4, 3],
    "column «множитель mod 5»: G has order 5, so only k mod 5 matters",
  );
  assert.deepEqual(links.map((link) => link.action), [
    "start", "double", "double", "double", "double", "double", "add", "double", "add", "double", "double", "add", "double",
  ], "bits 0 0 0 0 1 1 0 1 0 after the leading 1");
  assert.equal(doublings, 9, "9 удвоений");
  assert.equal(additions, 3, "3 сложения");
});

test("every multiple in the chain equals the point computed by hand", () => {
  const { links, result } = multiplicationStages(curve, 538, G);
  const byHand = {
    1: [9, 8], 2: [25, 17], 4: [9, 21], 8: [25, 12], 16: [9, 8], 32: [25, 17], 33: [25, 12],
    66: [9, 8], 67: [25, 17], 134: [9, 21], 268: [25, 12], 269: [9, 21], 538: [25, 12],
  };
  for (const link of links) {
    assert.deepEqual(link.point, byHand[link.multiplier], `[${link.multiplier}]G must be ${JSON.stringify(byHand[link.multiplier])} as in п. 1.7`);
  }
  assert.deepEqual(result, [25, 12], "Q = [538]G = (25, 12)");
});

test("repeated operations point back to the first time they were done, like «то же, что …» in the manual run", () => {
  const { links } = multiplicationStages(curve, 538, G);
  const byMultiplier = Object.fromEntries(links.map((link) => [link.multiplier, link]));
  assert.equal(byMultiplier[32].sameAs, byMultiplier[2].step, "[32]G = 2·(9, 8) is the same doubling as [2]G");
  assert.equal(byMultiplier[66].sameAs, byMultiplier[16].step, "[66]G = 2·(25, 12) repeats [16]G");
  assert.equal(byMultiplier[67].sameAs, byMultiplier[2].step, "[67]G = (9, 8) + (9, 8) is again the doubling of G");
  assert.equal(byMultiplier[538].sameAs, byMultiplier[8].step, "[538]G = 2·(9, 21) repeats [8]G");
  assert.equal(byMultiplier[33].sameAs, undefined, "[33]G = (25, 17) + (9, 8) is new inside the chain");
  assert.ok(byMultiplier[33].detail.stages.length === 3, "a new operation carries its own λ → x₃ → y₃ narration");
  assert.equal(byMultiplier[67].action, "add", "[67]G is the «+ G» step of bit 1");
  assert.equal(
    byMultiplier[2].detail.stages[0].title, "Наклон касательной λ",
    "[67]G = [66]G + G with [66]G = G is a doubling, so the referenced narration uses the tangent (п. 1.7 remark)",
  );
});

test("[5]G = ∞ and the chain continues through infinity", () => {
  const { links, result, order } = multiplicationStages(curve, 5, G);
  assert.equal(order, 5, "ord G = 5");
  assert.equal(result, null, "[5]G = [4]G + G = −G + G = ∞");
  assert.deepEqual(links.at(-2).point, [9, 21], "[4]G = −G");
});

test("negative multipliers and zero", () => {
  assert.deepEqual(multiplicationStages(curve, -3, G).result, curve.neg([25, 12]), "[−3]G = −[3]G");
  assert.equal(multiplicationStages(curve, 0, G).result, null, "[0]G = ∞");
  assert.equal(multipleName(-3, "G"), "[−3]G", "typographic minus in labels");
});
