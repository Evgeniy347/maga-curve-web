import { mod } from "./field.js";

const MINUS = "−";

function signed(value) {
  return value < 0 ? `${MINUS}${-value}` : String(value);
}

function difference(...terms) {
  return terms.join(` ${MINUS} `);
}

export function reduction(raw, p) {
  const value = mod(raw, p);
  if (raw >= 0 && raw < p) return String(raw);
  if (raw >= p) return `${raw} = ${Math.floor(raw / p)}·${p} + ${value} → ${value}`;
  const wraps = (value - raw) / p;
  return `${signed(raw)} + ${wraps === 1 ? "" : `${wraps}·`}${p} = ${value}`;
}

function chordSteps(trace, [x1, y1], [x2, y2], p) {
  return [
    `y₂ ${MINUS} y₁ = ${difference(y2, y1)} = ${reduction(trace.numerator.raw, p)}`,
    `x₂ ${MINUS} x₁ = ${difference(x2, x1)} = ${reduction(trace.denominator.raw, p)}`,
  ];
}

function tangentSteps(curve, trace, [x, y]) {
  const { p, A, B, C } = curve;
  const free = C === 1 ? "1" : "C";
  const doubled = B === 1 ? ["2y", `2·${y}`] : ["2By", `2·${B}·${y}`];
  return [
    `3x² = 3·${x}² = 3·${x * x} = ${reduction(trace.threeXSquared.raw, p)}`,
    `2Ax = 2·${A}·${x} = ${reduction(trace.twoAX.raw, p)}`,
    `числитель = 3x² + 2Ax + ${free} = ${trace.threeXSquared.value} + ${trace.twoAX.value} + ${C} = ${reduction(trace.numerator.raw, p)}`,
    `знаменатель = ${doubled[0]} = ${doubled[1]} = ${reduction(trace.denominator.raw, p)}`,
  ];
}

function slopeSteps(curve, trace, [x1, y1], [x2]) {
  const { p, A, B } = curve;
  const lambda = trace.lambda.value;
  const scaledSquare = B === 1 ? ["λ²", `${trace.lambdaSquared.value}`] : ["B·λ²", `${B}·${trace.lambdaSquared.value}`];
  return [
    `${trace.denominator.value}⁻¹ = ${trace.inverse}`,
    `λ = ${trace.numerator.value}·${trace.inverse} = ${reduction(trace.lambda.raw, p)}`,
    `λ² = ${lambda}² = ${reduction(trace.lambdaSquared.raw, p)}`,
    `x₃ = ${difference(scaledSquare[0], "A", "x₁", "x₂")} = ${difference(scaledSquare[1], A, x1, x2)} = ${reduction(trace.x3.raw, p)}`,
    `x₁ ${MINUS} x₃ = ${difference(x1, trace.x3.value)} = ${reduction(trace.xDifference.raw, p)}`,
    `λ·(x₁ ${MINUS} x₃) = ${lambda}·${trace.xDifference.value} = ${reduction(trace.product.raw, p)}`,
    `y₃ = ${difference(trace.product.value, y1)} = ${reduction(trace.y3.raw, p)}`,
  ];
}

function verticalStep(first, second) {
  const [x1, y1] = first;
  if (y1 === second[1]) return [`касательная в точке (${x1}, ${y1}) вертикальна → P + Q = 2P = ∞`];
  return [`x₁ = x₂ = ${x1}, y₁ = ${MINUS}y₂ → прямая вертикальна, P + Q = ∞`];
}

export function additionSteps(curve, first, second) {
  const trace = curve.addTrace(first, second);
  if (trace.kind === "identity") return ["одно из слагаемых — ∞, сумма равна другому слагаемому"];
  if (trace.kind === "vertical") return verticalStep(first, second);
  const opening = trace.kind === "tangent" ? tangentSteps(curve, trace, first) : chordSteps(trace, first, second, curve.p);
  if (trace.kind === "non-invertible") {
    return [...opening, `${trace.denominator.value} не обратим по модулю ${curve.p} (p составное) → сумма не определена`];
  }
  return [...opening, ...slopeSteps(curve, trace, first, second)];
}
