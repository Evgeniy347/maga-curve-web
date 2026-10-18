export function centeredResidue(value, p) {
  const r = ((value % p) + p) % p;
  return r > p - r ? r - p : r;
}

export function verticalLine(x, range) {
  return [[x, range.yMin], [x, range.yMax]];
}

export function wrappedLine(slope, through, p, range) {
  const m = centeredResidue(slope, p);
  if (m === 0) return [[range.xMin, through[1]], [range.xMax, through[1]]];
  let q = (((through[1] - m * through[0]) % p) + p) % p;
  const points = [[range.xMin, m * range.xMin + q]];
  let x;
  do {
    const y = m > 0 ? p : 0;
    x = (y - q) / m;
    points.push([x, y], null, [x, y ? 0 : p]);
    q += m > 0 ? -p : p;
  } while (x < p);
  points.push([range.xMax, m * range.xMax + q]);
  return points;
}

export function lineThrough(trace, first, p, range) {
  if (trace.lambda === undefined) return verticalLine(first[0], range);
  return wrappedLine(trace.lambda.value, first, p, range);
}
