import { writeFile } from "node:fs/promises";
import vm from "node:vm";

const SOURCE = "https://andrea.corbellini.name/ecc/interactive/ec.js";
const OUTPUT = new URL("../tests/fixtures/corbellini-p97.json", import.meta.url);
const CURVE = { a: 2, b: 3, k: 97 };
const LINE_PAIRS = [[0, 5], [3, 3], [7, 40], [12, 12], [14, 96], [20, 77], [50, 51], [60, 90], [1, 98]];
const ADD_ROWS = 12;

const code = await (await fetch(SOURCE)).text();
const jquery = () => ({});
const sandbox = { jQuery: jquery, window: {}, Math };
vm.runInNewContext(code, sandbox);
const modk = jquery.ec.modk.Base.prototype;
const curve = Object.assign(Object.create(modk), CURVE);
curve.curvePoints = curve.getCurvePoints();
curve.plotRange = { xMin: 0, xMax: CURVE.k - 1, yMin: 0, yMax: CURVE.k - 1 };
const points = curve.curvePoints;
const round = (point) => point && point.map((v) => Math.round(v * 1e9) / 1e9);

const add = [];
for (let i = 0; i < ADD_ROWS; i += 1) {
  for (let j = 0; j < points.length; j += 1) add.push([i, j, curve.addPoints(points[i], points[j])]);
}
const lines = LINE_PAIRS.map(([i, j]) => [i, j, curve.getLinePoints(points[i], points[j]).map(round)]);

await writeFile(OUTPUT, `${JSON.stringify({ source: SOURCE, a: CURVE.a, b: CURVE.b, p: CURVE.k, points, add, lines })}\n`);
console.log(`fixture: ${points.length} points, ${add.length} sums, ${lines.length} lines -> ${OUTPUT.pathname}`);
