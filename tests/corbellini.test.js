import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weierstrass } from "../site/js/curve.js";
import { lineThrough, verticalLine, wrappedLine } from "../site/js/chord.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/corbellini-p97.json", import.meta.url), "utf8"));
const curve = weierstrass({ a: fixture.a, b: fixture.b, p: fixture.p });
const range = { xMin: 0, xMax: fixture.p - 1, yMin: 0, yMax: fixture.p - 1 };

test("point enumeration matches the original page point for point and in the same order", () => {
  assert.deepEqual(
    curve.points(), fixture.points,
    "points() must list (x, y) by ascending x then y exactly like Corbellini's getCurvePoints: "
      + "the plot and the nearest-point snapping both depend on that order",
  );
  assert.equal(curve.order(), 100, "y² = x³ + 2x + 3 over F_97 has 100 points with ∞, the original page prints 100");
});

test("addition agrees with the original addPoints on every sampled pair", () => {
  for (const [i, j, expected] of fixture.add) {
    const P = fixture.points[i];
    const Q = fixture.points[j];
    assert.deepEqual(
      curve.add(P, Q), expected,
      `${JSON.stringify(P)} + ${JSON.stringify(Q)}: original gives ${JSON.stringify(expected)}; `
        + "null is the point at infinity (vertical chord P + (−P) or tangent at y = 0)",
    );
  }
});

test("default page state reproduces R = (1, 54) shown by the original", () => {
  assert.deepEqual(curve.add([17, 10], [95, 31]), [1, 54], "P = (17, 10), Q = (95, 31) on the original page give R = (1, 54)");
});

test("wrapped chord geometry equals the original getLinePoints", () => {
  for (const [i, j, expected] of fixture.lines) {
    const P = fixture.points[i];
    const Q = fixture.points[j];
    const trace = curve.addTrace(P, Q);
    const actual = lineThrough(trace, P, fixture.p, range).map((point) => point && point.map((v) => Math.round(v * 1e9) / 1e9));
    assert.deepEqual(
      actual, expected,
      `line through ${JSON.stringify(P)} and ${JSON.stringify(Q)} differs from the original: the chord y = λx + c `
        + "is cut into segments every time it leaves [0, p) and re-enters from the opposite edge",
    );
  }
});

test("a zero slope is drawn as one horizontal segment, not a wrapped family", () => {
  assert.deepEqual(wrappedLine(0, [3, 6], 97, range), [[0, 6], [96, 6]], "λ = 0 means y is constant, nothing to wrap");
});

test("tangent at a point with y = 0 is drawn as a vertical line (the original drew nothing there)", () => {
  const P = [30, 0];
  const trace = curve.addTrace(P, P);
  assert.equal(trace.result, null, "2·(30, 0) = ∞: the tangent at a 2-torsion point is vertical");
  assert.deepEqual(
    lineThrough(trace, P, fixture.p, range), verticalLine(30, range),
    "original getLinePoints returns NaN coordinates here because 0 has no inverse; we draw the true vertical tangent",
  );
});
