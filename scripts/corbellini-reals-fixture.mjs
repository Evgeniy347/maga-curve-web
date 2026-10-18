import { writeFile } from "node:fs/promises";
import vm from "node:vm";

const SOURCE = "https://andrea.corbellini.name/ecc/interactive/ec.js";
const OUTPUT = new URL("../tests/fixtures/corbellini-reals.json", import.meta.url);
const CURVES = [[-7, 10], [-3, 3], [0, 7], [2, 3], [-4, 0], [-1, 1], [1, 0]];
const ADD_CASES = [
  { a: -7, b: 10, p: [1, 2], q: [3, 4] },
  { a: -7, b: 10, p: [1, 2], q: [1, 2] },
  { a: -7, b: 10, p: [1, 2], q: [1, -2] },
  { a: -3, b: 3, p: [-1, 2.2360679775], q: [2, 2.2360679775] },
  { a: 0, b: 7, p: [-1.9129311828, 0], q: [2, 3.8729833462] },
];
const MUL_CASES = [
  { a: -7, b: 10, n: 2, p: [1, 2] },
  { a: -7, b: 10, n: 5, p: [1, 2] },
  { a: -7, b: 10, n: -3, p: [1, 2] },
  { a: -3, b: 3, n: 7, p: [2, 2.2360679775] },
];

const code = await (await fetch(SOURCE)).text();
const jquery = () => ({});
vm.runInNewContext(code, { jQuery: jquery, window: {}, Math });
const { reals } = jquery.ec;
const round = (point) => point && point.map((v) => Math.round(v * 1e9) / 1e9);

function base(a, b, prototype = reals.Base.prototype) {
  const curve = Object.assign(Object.create(prototype), { a, b, marginFactor: 1 / 8, plotResolution: 256 });
  curve.roots = curve.getRoots();
  curve.stationaryPoints = curve.getStationaryPoints();
  return curve;
}

const curves = CURVES.map(([a, b]) => {
  const curve = base(a, b);
  curve.plotRange = curve.getPlotRange();
  return {
    a, b,
    roots: curve.roots,
    stationary: curve.stationaryPoints,
    range: curve.plotRange,
    polyline: curve.getCurvePoints().map(round),
  };
});

const additions = ADD_CASES.map(({ a, b, p, q }) => {
  const curve = base(a, b, reals.PointAddition.prototype);
  Object.assign(curve, { p, q, r: curve.addPoints(p, q) });
  curve.plotRange = curve.getPlotRange();
  return { a, b, p, q, r: round(curve.r), range: curve.plotRange, line: curve.getLinePoints(p, q).map(round) };
});

const multiplications = MUL_CASES.map(({ a, b, n, p }) => {
  const curve = base(a, b, reals.ScalarMultiplication.prototype);
  Object.assign(curve, { p, n, q: curve.mulPoint(n, p) });
  curve.plotRange = curve.getPlotRange();
  return { a, b, n, p, q: round(curve.q), range: curve.plotRange };
});

await writeFile(OUTPUT, `${JSON.stringify({ source: SOURCE, curves, additions, multiplications })}\n`);
console.log(`reals fixture: ${curves.length} curves, ${additions.length} sums, ${multiplications.length} products`);
