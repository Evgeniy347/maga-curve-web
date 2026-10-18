import { INFINITY, doubleAndAdd } from "./curve.js";
import { round5 } from "./snap.js";

const MINUS = "−";
const TOLERANCE = 1e-6;

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

function slopeStage(curve, trace, [x1, y1], [x2, y2]) {
  if (trace.kind === "tangent") {
    return {
      title: "Наклон касательной λ",
      formula: "λ = (3x² + a) / (2y)",
      steps: [step("λ", [`(3·${wrapped(x1)}² + ${wrapped(curve.a)}) / (2·${wrapped(y1)})`], trace.lambda)],
    };
  }
  return {
    title: "Наклон прямой λ",
    formula: `λ = (y₂ ${MINUS} y₁) / (x₂ ${MINUS} x₁)`,
    steps: [step("λ", [`(${formatReal(y2)} ${MINUS} ${wrapped(y1)}) / (${formatReal(x2)} ${MINUS} ${wrapped(x1)})`], trace.lambda)],
  };
}

function checkStage(curve, [x3, y3]) {
  const left = y3 * y3;
  const right = curve.rhs(x3);
  return {
    left: step("y₃²", [`${wrapped(y3)}²`], left),
    right: step("x₃³ + ax₃ + b", [`${wrapped(x3)}³ + ${wrapped(curve.a)}·${wrapped(x3)} + ${wrapped(curve.b)}`], right),
    holds: Math.abs(left - right) <= TOLERANCE * Math.max(1, Math.abs(right)),
  };
}

export function realAdditionStages(curve, first, second) {
  const trace = curve.addTrace(first, second);
  if (trace.kind === "identity") return { trace, stages: [], message: "одно из слагаемых — ∞, сумма равна другому слагаемому" };
  if (trace.kind === "vertical") {
    const message = first[1] === second[1]
      ? `касательная в точке ${formatRealPoint(first)} вертикальна → P + Q = 2P = ∞`
      : `x₁ = x₂ = ${formatReal(first[0])}, y₁ = ${MINUS}y₂ → прямая вертикальна, P + Q = ∞`;
    return { trace, stages: [], message };
  }
  const [x1, y1] = first;
  const [x2] = second;
  const { lambda, x3 } = trace;
  return {
    trace,
    stages: [
      slopeStage(curve, trace, first, second),
      {
        title: "Абсцисса x₃",
        formula: `x₃ = λ² ${MINUS} x₁ ${MINUS} x₂`,
        steps: [step("x₃", [`${wrapped(lambda)}² ${MINUS} ${wrapped(x1)} ${MINUS} ${wrapped(x2)}`], x3)],
      },
      {
        title: "Ордината y₃",
        formula: `y₃ = λ·(x₁ ${MINUS} x₃) ${MINUS} y₁`,
        steps: [step("y₃", [`${wrapped(lambda)}·(${formatReal(x1)} ${MINUS} ${wrapped(x3)}) ${MINUS} ${wrapped(y1)}`], trace.y3)],
      },
    ],
    check: checkStage(curve, trace.result),
  };
}

export function plural(count, [one, few, many]) {
  const tens = count % 100;
  const units = count % 10;
  if (tens >= 11 && tens <= 14) return `${count} ${many}`;
  if (units === 1) return `${count} ${one}`;
  if (units >= 2 && units <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
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
