function directionFilter(wanted, previous) {
  const [x, y] = wanted;
  const [prevX, prevY] = previous;
  if (x > prevX) return (point) => point[0] > prevX;
  if (x < prevX) return (point) => point[0] < prevX;
  if (y > prevY) return (point) => point[1] > prevY;
  if (y < prevY) return (point) => point[1] < prevY;
  return () => true;
}

function nearest(candidates, [x, y]) {
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const point of candidates) {
    const distance = (x - point[0]) ** 2 + (y - point[1]) ** 2;
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

export function snapToCurve(curve, wanted, previous) {
  if (wanted.some(Number.isNaN)) return previous;
  const has = ([x, y]) => curve.points().some((point) => point[0] === x && point[1] === y);
  if (has(wanted)) return wanted;
  let candidates = curve.points().filter(directionFilter(wanted, previous));
  if (candidates.length === 0) {
    if (has(previous)) return previous;
    candidates = curve.points();
    if (candidates.length === 0) return previous;
  }
  return nearest(candidates, wanted);
}

const DECIMALS = 5;

export function round5(value) {
  const [mantissa, exponent = "0"] = String(value).split("e");
  const shifted = Math.round(Number(`${mantissa}e${Number(exponent) + DECIMALS}`));
  const [m, e = "0"] = String(shifted).split("e");
  return Number(`${m}e${Number(e) - DECIMALS}`);
}

function signedOrdinate(curve, x, y, previousY) {
  if (y > 0) return curve.y(x);
  if (y < 0) return -curve.y(x);
  return y >= previousY ? curve.y(x) : -curve.y(x);
}

export function snapToRealCurve(curve, wanted, previous) {
  let [x, y] = wanted;
  const [prevX, prevY] = previous;
  if (Number.isNaN(x) || Number.isNaN(y)) return previous;
  if (x === prevX && y === prevY) {
    const valid = round5(curve.y(x));
    if (y === (y < 0 ? -valid : valid)) return [x, y];
  }
  const roots = curve.roots();
  if (x !== prevX) {
    if (x < roots[0]) {
      [x, y] = [roots[0], 0];
    } else if (roots.length > 2 && roots[1] < x && x < roots[2]) {
      [x, y] = [roots[x > prevX ? 2 : 1], 0];
    } else {
      y = signedOrdinate(curve, x, y, prevY);
    }
  } else {
    const candidates = curve.xsAt(y);
    const distances = candidates.map((candidate) => Math.abs(candidate - prevX));
    x = candidates[distances.indexOf(Math.min(...distances))];
  }
  return [round5(x), round5(y)];
}
