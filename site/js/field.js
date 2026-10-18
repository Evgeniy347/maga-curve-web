export function mod(value, p) {
  return ((value % p) + p) % p;
}

export function inverse(value, p) {
  let [oldR, r] = [mod(value, p), p];
  let [oldS, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return oldR === 1 ? mod(oldS, p) : null;
}

export function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let m = 3; m * m <= n; m += 2) {
    if (n % m === 0) return false;
  }
  return true;
}

export function squareRoots(p) {
  const roots = new Map();
  for (let y = 0; y < p; y += 1) {
    const square = (y * y) % p;
    if (!roots.has(square)) roots.set(square, []);
    roots.get(square).push(y);
  }
  return roots;
}

export function largestPrimeFactor(n) {
  let remaining = n;
  let largest = 1;
  for (let d = 2; d * d <= remaining; d += 1) {
    while (remaining % d === 0) {
      largest = d;
      remaining /= d;
    }
  }
  return remaining > 1 ? remaining : largest;
}
