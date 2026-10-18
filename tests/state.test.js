import { test } from "node:test";
import assert from "node:assert/strict";
import { montgomery, realWeierstrass, weierstrass } from "../site/js/curve.js";
import { PointInput } from "../site/js/page.js";
import { snapToRealCurve } from "../site/js/snap.js";

function fakeRoot(values) {
  const inputs = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, { name, value: String(value) }]));
  return { inputs, querySelector: (selector) => inputs[selector.match(/name='(\w+)'/)[1]] };
}

test("changing p to 59 and back to 29 returns P to the point the user chose (no drift)", () => {
  const root = fakeRoot({ px: 2, py: 11 });
  const P = new PointInput(root, "p");
  assert.deepEqual(P.snap(montgomery({ A: 6, p: 29 })), [2, 11], "the default P lies on the thesis curve");
  const moved = P.snap(montgomery({ A: 6, p: 59 }), "p");
  assert.notDeepEqual(moved, [2, 11], "on p = 59 the point has to move: (2, 11) is not on that curve");
  assert.deepEqual(
    P.snap(montgomery({ A: 6, p: 29 }), "p"), [2, 11],
    "back on p = 29 the point must return to (2, 11): curve changes snap from the user's point, not from the last snapped one",
  );
});

test("two points that met on another curve separate again when the curve is restored", () => {
  const root = fakeRoot({ px: 2, py: 11, qx: 7, qy: 8 });
  const P = new PointInput(root, "p");
  const Q = new PointInput(root, "q");
  for (const p of [29, 3, 5, 59, 29]) {
    P.snap(montgomery({ A: 6, p }), "p");
    Q.snap(montgomery({ A: 6, p }), "p");
  }
  assert.deepEqual([P.previous, Q.previous], [[2, 11], [7, 8]], "the bug report: after p = 59 → 29 both points collapsed into (7, 8)");
});

test("editing a coordinate makes the snapped result the new intended point", () => {
  const root = fakeRoot({ px: 17, py: 10 });
  const P = new PointInput(root, "p");
  const curve = weierstrass({ a: 2, b: 3, p: 97 });
  P.snap(curve);
  root.inputs.px.value = "18";
  assert.deepEqual(P.snap(curve, "px"), [22, 5], "x went up from 17: nearest point to the right is (22, 5)");
  assert.deepEqual(P.snap(weierstrass({ a: 2, b: 3, p: 97 }), "a"), [22, 5], "a later curve change keeps the edited point");
});

test("over ℝ a curve change and its undo also restore the point", () => {
  const root = fakeRoot({ px: 1, py: 2 });
  const P = new PointInput(root, "p", snapToRealCurve);
  P.snap(realWeierstrass({ a: -7, b: 10 }));
  P.snap(realWeierstrass({ a: 3, b: 10 }), "a");
  assert.deepEqual(P.snap(realWeierstrass({ a: -7, b: 10 }), "a"), [1, 2], "a = −7 → 3 → −7 must bring P back to (1, 2)");
});
