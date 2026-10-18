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
