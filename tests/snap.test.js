import { test } from "node:test";
import assert from "node:assert/strict";
import { weierstrass } from "../site/js/curve.js";
import { snapToCurve } from "../site/js/snap.js";

const curve = weierstrass({ a: 2, b: 3, p: 97 });

test("a point already on the curve is kept as typed", () => {
  assert.deepEqual(snapToCurve(curve, [17, 10], [95, 31]), [17, 10], "(17, 10) lies on y² = x³ + 2x + 3 mod 97");
});

test("increasing x jumps to the nearest curve point to the right, like the spinner on the original page", () => {
  assert.deepEqual(
    snapToCurve(curve, [18, 10], [17, 10]), [22, 5],
    "x = 18, 19 have no points; among points with x > 17 the closest to (18, 10) is (22, 5) at distance² 41",
  );
});

test("decreasing y jumps to the nearest point below the previous ordinate", () => {
  assert.deepEqual(
    snapToCurve(curve, [17, 9], [17, 10]), [22, 5],
    "only points with y < 10 qualify; (22, 5) at distance² 41 beats (12, 3) at 61",
  );
});

test("garbage input keeps the previous point", () => {
  assert.deepEqual(snapToCurve(curve, [Number.NaN, 4], [17, 10]), [17, 10], "NaN coordinates must not move the point");
});

test("when the curve changes the old point is replaced by the nearest valid one", () => {
  const other = weierstrass({ a: 2, b: 4, p: 97 });
  const snapped = snapToCurve(other, [17, 10], [17, 10]);
  assert.ok(other.contains(snapped), `after b changes the point must be moved onto the new curve, got ${JSON.stringify(snapped)}`);
});
