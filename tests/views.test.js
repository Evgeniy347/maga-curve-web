import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeDocument } from "./fake-dom.js";
import { montgomery } from "../site/js/curve.js";
import { buildScene } from "../site/js/page.js";
import { Plot } from "../site/js/plot.js";
import { renderChain, renderStages, renderSteps } from "../site/js/steps-view.js";
import { additionStages, multiplicationStages } from "../site/js/steps.js";
import { realAdditionStages } from "../site/js/real-steps.js";
import { realWeierstrass } from "../site/js/curve.js";

const create = installFakeDocument();
const curve = montgomery({ A: 6, p: 29 });

test("the steps panel numbers stages 1..3 and steps 1..9 continuously, marking the last step of each stage", () => {
  const list = create();
  renderSteps(list, curve, [2, 11], [7, 8]);
  assert.deepEqual(list.byClass("stage-no").map((n) => n.textContent), ["1", "2", "3", "✓"], "stage badges count from 1, the check is ✓");
  assert.deepEqual(list.byClass("n").map((n) => n.textContent), ["1", "2", "3", "4", "5", "6", "7", "8", "9"], "steps are numbered across stages like in the manual run");
  assert.deepEqual(list.byClass("is-final").map((n) => n.byClass("lhs")[0].textContent), ["λ", "x₃", "y₃"], "each stage ends with the value it defines");
  assert.equal(list.byClass("val").at(-1).textContent, "5", "y₃ = 5");
  assert.equal(list.byClass("calc")[0].textContent, "8 − 11 = −3 + 29", "reduction tail is shown after the arithmetic");
  assert.equal(list.byClass("eq")[0].textContent, " ≡ ", "over F_p the result is a residue");
});

test("the check line is written as one equation per side", () => {
  const list = create();
  renderSteps(list, curve, [2, 11], [7, 8]);
  assert.deepEqual(
    list.byClass("check-side").map((n) => n.textContent),
    ["y₃² = 5² = 25", "x₃³ + 6x₃² + x₃ = 19³ + 6·19² + 19 = 9044 = 311·29 + 25 ≡ 25"],
    "already-reduced sides use =, reduced ones end with ≡ value",
  );
  assert.match(list.byClass("check-verdict")[0].textContent, /совпадает/, "R is on the curve");
});

test("over ℝ there is no reduction and the result follows =", () => {
  const list = create();
  renderStages(list, realAdditionStages(realWeierstrass({ a: -7, b: 10 }), [1, 2], [3, 4]));
  assert.equal(list.byClass("eq")[0].textContent, " = ", "real numbers are not residues");
  assert.equal(list.byClass("val")[0].textContent, "1", "λ = 1");
});

test("a vertical sum renders the message and no check", () => {
  const list = create();
  renderStages(list, additionStages(curve, [9, 8], [9, 21]), 29);
  assert.equal(list.byClass("step-message")[0].textContent, "x₁ = x₂ = 9, y₁ = −y₂ → прямая вертикальна, P + Q = ∞", "P + (−P) = ∞");
  assert.equal(list.byClass("stage-check").length, 0, "nothing to check for ∞");
});

test("the multiplication chain shows residues, references repeats and checks n = q·ord + r", () => {
  const list = create();
  renderChain(list, curve, 538, [9, 8], multiplicationStages(curve, 538, [9, 8]));
  const labels = list.byClass("lhs").filter((n) => n.textContent.startsWith("[")).map((n) => n.textContent);
  assert.deepEqual(labels.slice(0, 5), ["[1]P", "[2]P", "[4]P", "[8]P ≡ [3]P", "[16]P ≡ [1]P"], "multiples ≥ ord P show their residue");
  assert.equal(list.byClass("step-same")[0].textContent, "то же вычисление, что в шаге 2", "[32]P repeats the doubling of step 2");
  assert.equal(list.byClass("is-final").length, 1 + 6 * 3, "the last chain row plus λ, x₃, y₃ of the 6 new operations (steps 2, 3, 4, 5, 7, 12)");
  assert.match(list.children.at(-1).byClass("check-side")[0].textContent, /^538 = 107·5 \+ 3 → \[538\]P = \[3\]P = \(25, 12\)$/, "п. 1.9 of the manual run");
  assert.equal(list.byClass("formula")[0].textContent, "9 удвоений + 3 сложения = 12 операций", "cost of d = 538");
});

test("multiplication by 0 shows ∞ and no check; a chain ending in ∞ still checks", () => {
  const zero = create();
  renderChain(zero, curve, 0, [9, 8], multiplicationStages(curve, 0, [9, 8]));
  const topChecks = (list) => list.children.filter((n) => n.className.includes("stage-check")).length;
  assert.equal(topChecks(zero), 0, "0·P = ∞ needs no check");
  const five = create();
  renderChain(five, curve, 5, [9, 8], multiplicationStages(curve, 5, [9, 8]));
  assert.equal(topChecks(five), 1, "[5]G = ∞ is checked against 5 mod 5 = 0");
  assert.match(five.children.at(-1).byClass("check-side")[0].textContent, /5 = 1·5 \+ 0 → \[5\]P = \[0\]P = ∞/, "q = (n − r)/ord");
});

test("the plot draws −R and the reflection only when R and −R differ", () => {
  const container = create("div");
  const plot = new Plot(container);
  plot.render(buildScene(curve, [2, 11], [7, 8]).scene);
  const svg = container.children[0];
  assert.equal(svg.byClass("plot-reflect").length, 1, "R = (19, 5) and −R = (19, 24) are joined");
  assert.equal(svg.byClass("plot-third").length, 1, "−R is marked");
  plot.render(buildScene(curve, [9, 8], [9, 21]).scene);
  const infinite = container.children[0];
  assert.equal(infinite.byClass("plot-third").length + infinite.byClass("plot-reflect").length, 0, "R = ∞: nothing to reflect");
  plot.render({ range: { xMin: -0.6, xMax: 28.6, yMin: -0.6, yMax: 28.6 }, R: [0, 0], third: [0, 0], caption: "", description: "" });
  const twoTorsion = container.children[0];
  assert.equal(twoTorsion.byClass("plot-third").length + twoTorsion.byClass("plot-reflect").length, 0, "R = −R (y = 0): no separate third point");
});

test("tick labels sit under the x axis and left of the y axis", () => {
  const container = create("div");
  new Plot(container).render(buildScene(curve, [2, 11], [7, 8]).scene);
  const labels = container.children[0].byClass("plot-ticks")[0].children;
  const xLabels = labels.filter((n) => n.attributes["text-anchor"] === "middle");
  const yLabels = labels.filter((n) => n.attributes["text-anchor"] === "end");
  assert.ok(xLabels.every((n) => n.attributes.y === "534"), "x labels at top + size + gap = 16 + 496 + 22");
  assert.ok(yLabels.every((n) => n.attributes.x === "34"), "y labels at left − gap = 44 − 10");
  assert.equal(Number(yLabels[0].attributes.y), 501.8 + 4, "baseline nudged 4 px below the grid line");
});
