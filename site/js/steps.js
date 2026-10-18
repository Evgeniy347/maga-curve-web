import { INFINITY, doubleAndAdd } from "./curve.js";
import { mod } from "./field.js";

const MINUS = "−";
const DEFAULT_NAMES = { A: "A", B: "B", C: "C", D: "D" };

function signed(value) {
  return value < 0 ? `${MINUS}${-value}` : String(value);
}

function difference(...terms) {
  return terms.join(` ${MINUS} `);
}

function sum(...terms) {
  return terms.join(" + ");
}

export function reduction(raw, p) {
  const value = mod(raw, p);
  if (raw >= 0 && raw < p) return String(raw);
  if (raw >= p) return `${raw} = ${Math.floor(raw / p)}·${p} + ${value} → ${value}`;
  const wraps = (value - raw) / p;
  return `${signed(raw)} + ${wraps === 1 ? "" : `${wraps}·`}${p} = ${value}`;
}

export function reductionTail(raw, p) {
  const value = mod(raw, p);
  if (raw >= 0 && raw < p) return [];
  if (raw >= p) return [String(raw), `${Math.floor(raw / p)}·${p} + ${value}`];
  const wraps = (value - raw) / p;
  return [`${signed(raw)} + ${wraps === 1 ? "" : `${wraps}·`}${p}`];
}

function step(label, forms, raw, p) {
  return { label, forms, raw, value: mod(raw, p) };
}

export function stepText(item, p) {
  return [item.label, ...item.forms, reduction(item.raw, p)].join(" = ");
}

function cubicLabel(curve, variable) {
  const { A, C, D } = curve;
  const terms = [`${variable}³`];
  if (A !== 0) terms.push(`${A === 1 ? "" : A}${variable}²`);
  if (C !== 0) terms.push(`${C === 1 ? "" : C}${variable}`);
  if (D !== 0) terms.push(String(D));
  return sum(...terms);
}

function cubicNumbers(curve, x) {
  const terms = [`${x}³`];
  if (curve.A !== 0) terms.push(`${curve.A}·${x}²`);
  if (curve.C === 1) terms.push(String(x));
  else if (curve.C !== 0) terms.push(`${curve.C}·${x}`);
  if (curve.D !== 0) terms.push(String(curve.D));
  return sum(...terms);
}

function chordStage(trace, [x1, y1], [x2, y2], p) {
  return {
    title: "Наклон секущей λ",
    formula: `λ = (y₂ ${MINUS} y₁)·(x₂ ${MINUS} x₁)⁻¹`,
    steps: [
      step(`y₂ ${MINUS} y₁`, [difference(y2, y1)], trace.numerator.raw, p),
      step(`x₂ ${MINUS} x₁`, [difference(x2, x1)], trace.denominator.raw, p),
    ],
  };
}

function tangentStage(curve, trace, [x, y], names) {
  const { p, A, B, C } = curve;
  const numeratorLabel = ["3x²", A === 0 ? null : `2${names.A}x`, C === 0 ? null : C === 1 ? "1" : names.C].filter(Boolean);
  const numeratorValues = [trace.threeXSquared.value, A === 0 ? null : trace.twoAX.value, C === 0 ? null : C].filter((v) => v !== null);
  const doubled = B === 1 ? ["2y", `2·${y}`] : [`2${names.B}y`, `2·${B}·${y}`];
  const steps = [step("3x²", [`3·${x}²`, `3·${x * x}`], trace.threeXSquared.raw, p)];
  if (A !== 0) steps.push(step(`2${names.A}x`, [`2·${A}·${x}`], trace.twoAX.raw, p));
  steps.push(
    step("числитель", [sum(...numeratorLabel), sum(...numeratorValues)], trace.numerator.raw, p),
    step("знаменатель", doubled, trace.denominator.raw, p),
  );
  return {
    title: "Наклон касательной λ",
    formula: `λ = (${sum(...numeratorLabel)})·(${doubled[0]})⁻¹`,
    steps,
  };
}

function x3Stage(curve, trace, [x1], [x2], names) {
  const { p, A, B } = curve;
  const square = B === 1 ? ["λ²", String(trace.lambdaSquared.value)] : [`${names.B}·λ²`, `${B}·${trace.lambdaSquared.value}`];
  const symbols = [square[0], A === 0 ? null : names.A, "x₁", "x₂"].filter(Boolean);
  const numbers = [square[1], A === 0 ? null : A, x1, x2].filter((v) => v !== null);
  const formula = difference(...symbols);
  return {
    title: "Абсцисса x₃",
    formula: `x₃ = ${formula}`,
    steps: [
      step("λ²", [`${trace.lambda.value}²`], trace.lambdaSquared.raw, p),
      step("x₃", [formula, difference(...numbers)], trace.x3.raw, p),
    ],
  };
}

function y3Stage(trace, [x1, y1], p) {
  return {
    title: "Ордината y₃",
    formula: `y₃ = λ·(x₁ ${MINUS} x₃) ${MINUS} y₁`,
    steps: [
      step(`x₁ ${MINUS} x₃`, [difference(x1, trace.x3.value)], trace.xDifference.raw, p),
      step(`λ·(x₁ ${MINUS} x₃)`, [`${trace.lambda.value}·${trace.xDifference.value}`], trace.product.raw, p),
      step("y₃", [difference(trace.product.value, y1)], trace.y3.raw, p),
    ],
  };
}

function checkStage(curve, [x3, y3], names) {
  const { p, A, B, C, D } = curve;
  const leftLabel = B === 1 ? "y₃²" : `${names.B}·y₃²`;
  const leftForm = B === 1 ? `${y3}²` : `${B}·${y3}²`;
  const rightRaw = x3 ** 3 + A * x3 * x3 + C * x3 + D;
  return {
    left: step(leftLabel, [leftForm], B * y3 * y3, p),
    right: step(cubicLabel(curve, "x₃"), [cubicNumbers(curve, x3)], rightRaw, p),
    holds: curve.contains([x3, y3]),
  };
}

function verticalMessage(first, second) {
  const [x1, y1] = first;
  if (y1 === second[1]) return `касательная в точке (${x1}, ${y1}) вертикальна → P + Q = 2P = ∞`;
  return `x₁ = x₂ = ${x1}, y₁ = ${MINUS}y₂ → прямая вертикальна, P + Q = ∞`;
}

export function additionStages(curve, first, second, names = DEFAULT_NAMES) {
  const trace = curve.addTrace(first, second);
  const p = curve.p;
  if (trace.kind === "identity") return { trace, stages: [], message: "одно из слагаемых — ∞, сумма равна другому слагаемому" };
  if (trace.kind === "vertical") return { trace, stages: [], message: verticalMessage(first, second) };
  const opening = trace.kind === "tangent" ? tangentStage(curve, trace, first, names) : chordStage(trace, first, second, p);
  if (trace.kind === "non-invertible") {
    return { trace, stages: [opening], message: `${trace.denominator.value} не обратим по модулю ${p} (p составное) → сумма не определена` };
  }
  opening.steps.push(
    step(`${trace.denominator.value}⁻¹`, [], trace.inverse, p),
    step("λ", [`${trace.numerator.value}·${trace.inverse}`], trace.lambda.raw, p),
  );
  return {
    trace,
    stages: [opening, x3Stage(curve, trace, first, second, names), y3Stage(trace, first, p)],
    check: checkStage(curve, trace.result, names),
  };
}

export function additionSteps(curve, first, second, names = DEFAULT_NAMES) {
  const { stages, message } = additionStages(curve, first, second, names);
  const lines = stages.flatMap((stage) => stage.steps.map((item) => stepText(item, curve.p)));
  return message ? [...lines, message] : lines;
}

export function plural(count, [one, few, many]) {
  const tens = count % 100;
  const units = count % 10;
  if (tens >= 11 && tens <= 14) return `${count} ${many}`;
  if (units === 1) return `${count} ${one}`;
  if (units >= 2 && units <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}

export function multipleName(multiplier, symbol = "P") {
  return `[${multiplier < 0 ? MINUS : ""}${Math.abs(multiplier)}]${symbol}`;
}

function operandsOf(chain, index, base) {
  const previous = chain[index - 1].point;
  return chain[index].action === "double" ? [previous, previous] : [previous, base];
}

export function multiplicationStages(curve, scalar, point, names = DEFAULT_NAMES) {
  const chain = doubleAndAdd(curve, scalar, point);
  const order = point === INFINITY ? 1 : curve.pointOrder(point);
  const base = scalar < 0 ? curve.neg(point) : point;
  const seen = new Map();
  const links = chain.map((link, i) => {
    const residue = order ? mod(link.multiplier, order) : null;
    if (link.action === "zero" || link.action === "start") return { ...link, step: i + 1, residue };
    const operands = operandsOf(chain, i, base);
    const key = JSON.stringify(operands);
    const sameAs = seen.get(key);
    if (sameAs === undefined) seen.set(key, i + 1);
    const detail = sameAs === undefined ? additionStages(curve, operands[0], operands[1], names) : null;
    return { ...link, step: i + 1, residue, operands, sameAs, detail };
  });
  return {
    links,
    order,
    result: chain.at(-1).point,
    doublings: chain.filter((link) => link.action === "double").length,
    additions: chain.filter((link) => link.action === "add").length,
  };
}
