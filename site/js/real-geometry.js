const MARGIN_FACTOR = 1 / 8;
const DEGENERATE_MARGIN = 5;
const RESOLUTION = 256;

function squareRange(points) {
  const finite = points.filter(Boolean);
  const xs = finite.map(([x]) => x);
  const ys = finite.map(([, y]) => y);
  const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let xMargin = MARGIN_FACTOR * (xMax - xMin);
  let yMargin = MARGIN_FACTOR * (yMax - yMin);
  if (xMargin > yMargin) yMargin = ((xMax - xMin) - (yMax - yMin)) / 2 + xMargin;
  else xMargin = ((yMax - yMin) - (xMax - xMin)) / 2 + yMargin;
  if (xMargin === 0) {
    xMargin = DEGENERATE_MARGIN;
    yMargin = DEGENERATE_MARGIN;
  }
  return { xMin: xMin - xMargin, xMax: xMax + xMargin, yMin: yMin - yMargin, yMax: yMax + yMargin };
}

export function realPlotRange(curve, points = []) {
  const roots = curve.roots();
  const stationary = curve.stationaryPoints();
  const interesting = [...points, ...roots.map((x) => [x, 0]), ...stationary.flatMap(([x, y]) => [[x, y], [x, -y]])];
  if (roots.length === 1 && stationary.length === 0) interesting.push([1, 0]);
  return squareRange(interesting);
}

function branch(curve, xMin, xMax, step, closed) {
  const upper = [];
  for (let x = xMax; x > xMin; x -= step) {
    const y = curve.y(x);
    upper.push([x, Number.isNaN(y) ? 0 : y]);
  }
  const y = curve.y(xMin);
  upper.push([xMin, Number.isNaN(y) ? 0 : y]);
  const lower = upper.slice(0, -1).reverse().map(([px, py]) => [px, -py]);
  const points = [...upper, ...lower];
  return closed ? [...points, points[0]] : points;
}

export function realCurvePolyline(curve, range) {
  const roots = curve.roots();
  const step = (range.xMax - range.xMin) / RESOLUTION;
  if (roots.length < 3) return branch(curve, roots[0], range.xMax, step, false);
  return [...branch(curve, roots[0], roots[1], step, true), null, ...branch(curve, roots[2], range.xMax, step, false)];
}

export function realLine(trace, first, range) {
  if (trace.lambda === undefined || !Number.isFinite(trace.lambda)) {
    return [[first[0], range.yMin], [first[0], range.yMax]];
  }
  const at = (x) => [x, trace.lambda * (x - first[0]) + first[1]];
  return [at(range.xMin), at(range.xMax)];
}
