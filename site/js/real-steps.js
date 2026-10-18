import { INFINITY, doubleAndAdd } from "./curve.js";
import { round5 } from "./snap.js";
import { plural } from "./steps.js";

const MINUS = "−";
const TOLERANCE = 1e-4;

export function formatReal(value) {
  const rounded = round5(value) || 0;
  return rounded < 0 ? `${MINUS}${-rounded}` : String(rounded);
}

function wrapped(value) {
  return value < 0 ? `(${formatReal(value)})` : formatReal(value);
}

export function formatRealPoint(point) {
  if (point === INFINITY) return "∞";
  return `(${formatReal(point[0])}, ${formatReal(point[1])})`;
}

function step(label, forms, value) {
  const shown = typeof value === "number" ? formatReal(value) : value;
  return { label, forms, raw: shown, value: shown };
}

const DEFAULT_NAMES = { A: "A", B: "B", C: "a", D: "b" };

function tangentParts(curve, names, [x, y]) {
  const { A, B, C } = curve;
  const symbols = ["3x²"];
  const numbers = [`3·${wrapped(x)}²`];
  if (A !== 0) {
    symbols.push(`2${names.A}x`);
    numbers.push(`2·${wrapped(A)}·${wrapped(x)}`);
  }
  if (C !== 0) {
    symbols.push(C === 1 && names.C === "C" ? "1" : names.C);
    numbers.push(wrapped(C));
  }
  const denominator = B === 1 ? ["2y", `2·${wrapped(y)}`] : [`2${names.B}y`, `2·${wrapped(B)}·${wrapped(y)}`];
  return { symbols: symbols.join(" + "), numbers: numbers.join(" + "), denominator };
}

function slopeStage(curve, trace, [x1, y1], [x2, y2], names) {
  if (trace.kind === "tangent") {
    const { symbols, numbers, denominator } = tangentParts(curve, names, [x1, y1]);
    return {
      title: "Наклон касательной λ",
      formula: `λ = (${symbols}) / (${denominator[0]})`,
      steps: [step("λ", [`(${numbers}) / (${denominator[1]})`], trace.lambda)],
    };
  }
  return {
    title: "Наклон прямой λ",
    formula: `λ = (y₂ ${MINUS} y₁) / (x₂ ${MINUS} x₁)`,
    steps: [step("λ", [`(${formatReal(y2)} ${MINUS} ${wrapped(y1)}) / (${formatReal(x2)} ${MINUS} ${wrapped(x1)})`], trace.lambda)],
  };
}

function x3Stage(curve, trace, [x1], [x2], names) {
  const { A, B } = curve;
  const square = B === 1 ? ["λ²", `${wrapped(trace.lambda)}²`] : [`${names.B}λ²`, `${wrapped(B)}·${wrapped(trace.lambda)}²`];
  const symbols = [square[0], A === 0 ? null : names.A, "x₁", "x₂"].filter(Boolean);
  const numbers = [square[1], A === 0 ? null : wrapped(A), wrapped(x1), wrapped(x2)].filter(Boolean);
  return {
    title: "Абсцисса x₃",
    formula: `x₃ = ${symbols.join(` ${MINUS} `)}`,
    steps: [step("x₃", [numbers.join(` ${MINUS} `)], trace.x3)],
  };
}

function cubicTerms(curve, x, symbolic) {
  const { A, C, D } = curve;
  const variable = symbolic ? "x₃" : wrapped(x);
  const terms = [`${variable}³`];
  const scaled = (coefficient, power) => (coefficient === 1 ? power : `${wrapped(coefficient)}·${power}`);
  if (A !== 0) terms.push(symbolic ? `${A === 1 ? "" : formatReal(A)}x₃²` : scaled(A, `${variable}²`));
  if (C !== 0) terms.push(symbolic ? `${C === 1 ? "" : formatReal(C)}x₃` : scaled(C, variable));
  if (D !== 0) terms.push(symbolic ? formatReal(D) : wrapped(D));
  return terms.join(" + ");
}

function checkStage(curve, [x3, y3], names) {
  const left = curve.B * y3 * y3;
  const right = curve.rhs(x3);
  const leftLabel = curve.B === 1 ? ["y₃²", `${wrapped(y3)}²`] : [`${names.B}y₃²`, `${wrapped(curve.B)}·${wrapped(y3)}²`];
  return {
    left: step(leftLabel[0], [leftLabel[1]], left),
    right: step(cubicTerms(curve, x3, true), [cubicTerms(curve, x3, false)], right),
    holds: Math.abs(left - right) <= TOLERANCE * termScale(curve, x3, y3),
  };
}

function termScale({ A, B, C, D }, x, y) {
  return Math.max(1, Math.abs(B * y * y), Math.abs(x) ** 3, Math.abs(A * x * x), Math.abs(C * x), Math.abs(D));
}

export function realAdditionStages(curve, first, second, names = DEFAULT_NAMES) {
  const trace = curve.addTrace(first, second);
  if (trace.kind === "identity") return { trace, stages: [], message: "одно из слагаемых — ∞, сумма равна другому слагаемому" };
  if (trace.kind === "vertical") {
    const message = first[1] === second[1]
      ? `касательная в точке ${formatRealPoint(first)} вертикальна → P + Q = 2P = ∞`
      : `x₁ = x₂ = ${formatReal(first[0])}, y₁ = ${MINUS}y₂ → прямая вертикальна, P + Q = ∞`;
    return { trace, stages: [], message };
  }
  const [x1, y1] = first;
  const { lambda, x3 } = trace;
  return {
    trace,
    stages: [
      slopeStage(curve, trace, first, second, names),
      x3Stage(curve, trace, first, second, names),
      {
        title: "Ордината y₃",
        formula: `y₃ = λ·(x₁ ${MINUS} x₃) ${MINUS} y₁`,
        steps: [step("y₃", [`${wrapped(lambda)}·(${formatReal(x1)} ${MINUS} ${wrapped(x3)}) ${MINUS} ${wrapped(y1)}`], trace.y3)],
      },
    ],
    check: checkStage(curve, trace.result, names),
  };
}

function scaled(multiplier) {
  return `[${multiplier < 0 ? MINUS : ""}${Math.abs(multiplier)}]P`;
}

export function realMultiplicationStages(curve, scalar, point) {
  const chain = doubleAndAdd(curve, scalar, point);
  if (chain[0].action === "zero") return { chain, stages: [], message: "n = 0 или P = ∞ → n·P = ∞" };
  const sign = scalar < 0 ? MINUS : "+";
  const steps = chain.map((link, i) => {
    const previous = chain[i - 1];
    if (link.action === "start") return step(scaled(link.multiplier), [scalar < 0 ? `${MINUS}P` : "P"], formatRealPoint(link.point));
    if (link.action === "double") {
      return step(scaled(link.multiplier), [`2·${scaled(previous.multiplier)} (бит ${link.bit})`], formatRealPoint(link.point));
    }
    return step(scaled(link.multiplier), [`${scaled(previous.multiplier)} ${sign} P`], formatRealPoint(link.point));
  });
  const binary = Math.abs(scalar).toString(2);
  const doublings = chain.filter((link) => link.action === "double").length;
  const additions = chain.filter((link) => link.action === "add").length;
  return {
    chain,
    stages: [{
      title: `Бинарный метод: |n| = ${Math.abs(scalar)} = ${binary}₂`,
      formula: `${plural(doublings, ["удвоение", "удвоения", "удвоений"])} + ${plural(additions, ["сложение", "сложения", "сложений"])}`,
      steps,
    }],
  };
}
