import { inverse, isPrime, mod } from "./field.js";

export const INFINITY = null;

export class CubicCurve {
  constructor({ p, A = 0, B = 1, C = 0, D = 0 }) {
    this.p = p;
    this.A = mod(A, p);
    this.B = mod(B, p);
    this.C = mod(C, p);
    this.D = mod(D, p);
    this.cachedPoints = null;
  }

  reduce(raw) {
    return { raw, value: mod(raw, this.p) };
  }

  rhs(x) {
    const { p, A, C, D } = this;
    return mod(mod(mod(x * x, p) * x, p) + mod(A * mod(x * x, p), p) + C * x + D, p);
  }

  isFieldPrime() {
    return isPrime(this.p);
  }

  isSingular() {
    const { p, A, B, C, D } = this;
    const discriminant =
      mod(A * A * C * C, p) - mod(4 * C * C * C, p) - mod(4 * A * A * A * D, p)
      - mod(27 * D * D, p) + mod(18 * mod(A * C, p) * D, p);
    return B === 0 || mod(discriminant, p) === 0;
  }

  contains(point) {
    if (point === INFINITY) return true;
    const [x, y] = point;
    return mod(this.B * y * y - this.rhs(x), this.p) === 0;
  }

  points() {
    if (this.cachedPoints === null) this.cachedPoints = this.enumeratePoints();
    return this.cachedPoints;
  }

  enumeratePoints() {
    const { p, B } = this;
    const byLeftSide = new Map();
    for (let y = 0; y < p; y += 1) {
      const left = mod(B * y * y, p);
      if (!byLeftSide.has(left)) byLeftSide.set(left, []);
      byLeftSide.get(left).push(y);
    }
    const points = [];
    for (let x = 0; x < p; x += 1) {
      for (const y of byLeftSide.get(this.rhs(x)) ?? []) points.push([x, y]);
    }
    return points;
  }

  order() {
    return this.points().length + 1;
  }

  neg(point) {
    if (point === INFINITY) return INFINITY;
    return [point[0], mod(-point[1], this.p)];
  }

  equals(first, second) {
    if (first === INFINITY || second === INFINITY) return first === second;
    return first[0] === second[0] && first[1] === second[1];
  }

  slopeTrace(first, second) {
    const [x1, y1] = first;
    const [x2, y2] = second;
    if (x1 !== x2) {
      return {
        kind: "chord",
        numerator: this.reduce(y2 - y1),
        denominator: this.reduce(x2 - x1),
      };
    }
    if (y1 !== y2 || y1 === 0) return { kind: "vertical" };
    const threeXSquared = this.reduce(3 * x1 * x1);
    const twoAX = this.reduce(2 * this.A * x1);
    return {
      kind: "tangent",
      threeXSquared,
      twoAX,
      numerator: this.reduce(threeXSquared.value + twoAX.value + this.C),
      denominator: this.reduce(2 * this.B * y1),
    };
  }

  addTrace(first, second) {
    if (first === INFINITY) return { kind: "identity", result: second };
    if (second === INFINITY) return { kind: "identity", result: first };
    const slope = this.slopeTrace(first, second);
    if (slope.kind === "vertical") return { ...slope, result: INFINITY };
    const inv = inverse(slope.denominator.value, this.p);
    if (inv === null) return { ...slope, kind: "non-invertible", result: undefined };
    const [x1, y1] = first;
    const [x2] = second;
    const lambda = this.reduce(slope.numerator.value * inv);
    const lambdaSquared = this.reduce(lambda.value * lambda.value);
    const x3 = this.reduce(this.B * lambdaSquared.value - this.A - x1 - x2);
    const xDifference = this.reduce(x1 - x3.value);
    const product = this.reduce(lambda.value * xDifference.value);
    const y3 = this.reduce(product.value - y1);
    return {
      ...slope,
      inverse: inv,
      lambda,
      lambdaSquared,
      x3,
      xDifference,
      product,
      y3,
      result: [x3.value, y3.value],
    };
  }

  add(first, second) {
    return this.addTrace(first, second).result;
  }

  multiply(scalar, point) {
    let result = INFINITY;
    let addend = scalar < 0 ? this.neg(point) : point;
    let remaining = Math.abs(scalar);
    while (remaining > 0) {
      if (remaining % 2 === 1) result = this.add(result, addend);
      addend = this.add(addend, addend);
      remaining = Math.floor(remaining / 2);
    }
    return result;
  }

  cyclicSubgroup(point) {
    const members = [];
    let current = point;
    while (current !== INFINITY && current !== undefined && members.length < this.order()) {
      members.push(current);
      current = this.add(current, point);
    }
    return members;
  }

  pointOrder(point) {
    let current = point;
    for (let n = 1; n <= this.order(); n += 1) {
      if (current === INFINITY) return n;
      current = this.add(current, point);
      if (current === undefined) return null;
    }
    return null;
  }
}

export function weierstrass({ a, b, p }) {
  return new CubicCurve({ p, C: a, D: b });
}

export function montgomery({ A, B = 1, p }) {
  return new CubicCurve({ p, A, B, C: 1 });
}

function sortedUnique(values) {
  return [...new Set([...values].sort((x, y) => x - y))];
}

export function cubicRoots(a, b) {
  const q = a / 3;
  const r = -b / 2;
  const delta = q * q * q + r * r;
  if (delta > 0) {
    return sortedUnique([Math.cbrt(r + Math.sqrt(delta)) + Math.cbrt(r - Math.sqrt(delta))]);
  }
  if (delta < 0) {
    const s = Math.acos(r / Math.sqrt(-q * q * q));
    const t = 2 * Math.sqrt(-q);
    return sortedUnique([0, 2, 4].map((k) => t * Math.cos((s + k * Math.PI) / 3)));
  }
  return sortedUnique([2 * Math.cbrt(r), Math.cbrt(-r)]);
}

export class RealCurve {
  constructor({ a, b }) {
    this.a = a;
    this.b = b;
  }

  rhs(x) {
    return x * (x * x + this.a) + this.b;
  }

  y(x) {
    return Math.sqrt(this.rhs(x));
  }

  roots() {
    return cubicRoots(this.a, this.b);
  }

  xsAt(y) {
    return cubicRoots(this.a, this.b - y * y);
  }

  stationaryPoints() {
    const x0 = -Math.sqrt(-this.a / 3);
    const x1 = -x0;
    const y0 = Math.sqrt(this.b - 2 * x0 * x0 * x0);
    const y1 = Math.sqrt(this.b - 2 * x1 * x1 * x1);
    if (Number.isNaN(x0) || Number.isNaN(y0)) return [];
    if (x0 === 0 || Number.isNaN(y1)) return [[x0, y0]];
    return [[x0, y0], [x1, y1]];
  }

  isSingular() {
    return 4 * this.a ** 3 + 27 * this.b ** 2 === 0;
  }

  neg(point) {
    if (point === INFINITY) return INFINITY;
    return [point[0], -point[1]];
  }

  addTrace(first, second) {
    if (first === INFINITY) return { kind: "identity", result: second };
    if (second === INFINITY) return { kind: "identity", result: first };
    const [x1, y1] = first;
    const [x2, y2] = second;
    let kind = "chord";
    let lambda = (y1 - y2) / (x1 - x2);
    if (x1 === x2) {
      if (y1 !== y2 || y1 === 0) return { kind: "vertical", result: INFINITY };
      kind = "tangent";
      lambda = (3 * x1 * x1 + this.a) / y1 / 2;
    }
    const x3 = lambda * lambda - x1 - x2;
    const y3 = lambda * (x1 - x3) - y1;
    return { kind, lambda, x3, y3, result: [x3, y3] };
  }

  add(first, second) {
    return this.addTrace(first, second).result;
  }

  multiply(scalar, point) {
    return doubleAndAdd(this, scalar, point).at(-1).point;
  }
}

export function doubleAndAdd(curve, scalar, point) {
  const base = scalar < 0 ? curve.neg(point) : point;
  const bits = Math.abs(scalar).toString(2);
  if (scalar === 0 || point === INFINITY) return [{ action: "zero", multiplier: 0, point: INFINITY }];
  const chain = [{ action: "start", bit: 1, multiplier: 1, point: base }];
  for (const bit of bits.slice(1)) {
    const last = chain.at(-1);
    if (last.point === undefined) break;
    chain.push({ action: "double", bit: Number(bit), multiplier: 2 * last.multiplier, point: curve.add(last.point, last.point) });
    const doubled = chain.at(-1);
    if (bit === "1" && doubled.point !== undefined) {
      chain.push({ action: "add", multiplier: doubled.multiplier + 1, point: curve.add(doubled.point, base) });
    }
  }
  return chain.map((step) => ({ ...step, multiplier: Math.sign(scalar) * step.multiplier }));
}
