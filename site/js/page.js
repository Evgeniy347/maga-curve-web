import { INFINITY } from "./curve.js";
import { lineThrough } from "./chord.js";
import { largestPrimeFactor, mod } from "./field.js";
import { Plot, plotRange } from "./plot.js";
import { snapToCurve } from "./snap.js";

const LINE_KINDS = { tangent: "касательная", vertical: "вертикаль" };
const QUERY_NAME = /^[a-z]+$/;
const QUERY_VALUE = /^[-.0-9]+$/;

export function queryValues(search) {
  const values = new Map();
  for (const item of search.replace(/^.*\?/, "").split("&")) {
    const parts = item.split("=");
    if (parts.length !== 2) continue;
    const [name, value] = parts;
    if (QUERY_NAME.test(name) && QUERY_VALUE.test(value)) values.set(name, value);
  }
  return values;
}

export function term(value, suffix) {
  if (value > 0) return ` + ${value === 1 && suffix ? "" : value}${suffix}`;
  if (value < 0) return ` − ${value === -1 && suffix ? "" : -value}${suffix}`;
  return "";
}

export function formatCoordinate(point, index) {
  if (point === INFINITY) return "∞";
  if (point === undefined) return "—";
  return String(point[index]);
}

export function formatPoint(point) {
  if (point === INFINITY) return "∞";
  if (point === undefined) return "не определено";
  return `(${point[0]}, ${point[1]})`;
}

export function lineEquation(trace, first, p) {
  if (trace.lambda === undefined) return `x = ${first[0]}`;
  const slope = trace.lambda.value;
  const intercept = mod(first[1] - slope * first[0], p);
  const slopeTerm = slope === 0 ? "" : `${slope === 1 ? "" : slope}x`;
  const parts = [slopeTerm, intercept === 0 && slopeTerm ? "" : String(intercept)].filter(Boolean);
  return `y ≡ ${parts.join(" + ")} (mod ${p})`;
}

export function groupStructure(order) {
  const subgroup = largestPrimeFactor(order);
  return { subgroup, cofactor: order / subgroup };
}

export function buildScene(curve, P, Q, trace = curve.addTrace(P, Q)) {
  const R = trace.result;
  const { p } = curve;
  const third = R ? curve.neg(R) : null;
  const line = lineEquation(trace, P, p);
  const lineKind = LINE_KINDS[trace.kind] ?? "секущая";
  const scene = {
    p,
    points: curve.points(),
    chord: lineThrough(trace, P, p, plotRange(p)),
    P,
    Q,
    R,
    third,
    caption: `График: R = P + Q на кривой над 𝔽${p}`,
    description: `Точки кривой над F_${p}: ${curve.points().length} аффинных точек. ${lineKind} ${line} через P = ${formatPoint(P)} и Q = ${formatPoint(Q)}; R = ${formatPoint(R)}.`,
  };
  return { scene, third, line, lineKind };
}

class PointInput {
  constructor(root, prefix) {
    this.x = root.querySelector(`input[name='${prefix}x']`);
    this.y = root.querySelector(`input[name='${prefix}y']`);
    this.previous = this.read();
  }

  read() {
    return [Number(this.x.value), Number(this.y.value)];
  }

  snap(curve) {
    const point = snapToCurve(curve, this.read(), this.previous);
    [this.x.value, this.y.value] = point;
    this.previous = point;
    return point;
  }
}

export class AdditionPage {
  constructor(root, form) {
    this.root = root;
    this.form = form;
    this.applyQuery(queryValues(window.location.search));
    this.coefficients = form.coefficients.map((name) => root.querySelector(`input[name='${name}']`));
    this.fieldInput = root.querySelector("input[name='p']");
    this.pInput = new PointInput(root, "p");
    this.qInput = new PointInput(root, "q");
    this.rx = root.querySelector("input[name='rx']");
    this.ry = root.querySelector("input[name='ry']");
    this.plot = new Plot(root.querySelector("#plot"));
    this.listeners = [];
    for (const input of root.querySelectorAll("#form input:not([readonly])")) {
      input.addEventListener("change", () => this.update());
    }
  }

  applyQuery(values) {
    for (const [name, value] of values) {
      const input = this.root.querySelector(`input[name='${name}']`);
      if (input) input.value = value;
    }
  }

  onUpdate(listener) {
    this.listeners.push(listener);
  }

  readCoefficients() {
    return Object.fromEntries(this.form.coefficients.map((name, i) => [name, Number(this.coefficients[i].value)]));
  }

  update() {
    const coefficients = this.readCoefficients();
    const p = Number(this.fieldInput.value);
    const curve = this.form.create({ ...coefficients, p });
    const P = this.pInput.snap(curve);
    const Q = this.qInput.snap(curve);
    const trace = curve.addTrace(P, Q);
    const state = { coefficients, curve, P, Q, trace };
    this.render(state);
    for (const listener of this.listeners) listener(state);
  }

  render({ coefficients, curve, P, Q, trace }) {
    const R = trace.result;
    const { p } = curve;
    const { scene, third, line, lineKind } = buildScene(curve, P, Q, trace);
    this.plot.render(scene);
    this.rx.value = formatCoordinate(R, 0);
    this.ry.value = formatCoordinate(R, 1);
    const { subgroup, cofactor } = groupStructure(curve.order());
    this.text(".curve-equation", null).innerHTML = this.form.equation(coefficients);
    this.text(".field-order", p);
    this.text(".curve-order", curve.order());
    this.text(".curve-order-factor", `= ${cofactor}·${subgroup}`);
    this.text(".subgroup-order", subgroup);
    this.text(".cofactor", cofactor);
    this.text(".legend-points", `${curve.points().length} точек кривой (+ ∞)`);
    this.text(".legend-line", `${lineKind} ${line}`);
    this.text(".sum-p", formatPoint(P));
    this.text(".sum-q", formatPoint(Q));
    this.text(".sum-r", formatPoint(R));
    this.text(".steps-modulus", p);
    for (const [selector, point] of [[".point-order-p", P], [".point-order-q", Q], [".point-order-r", R]]) {
      this.text(selector, point === undefined ? "—" : curve.pointOrder(point) ?? "—");
    }
    this.toggle(".legend-third", Boolean(R) && R[1] !== third[1]);
    this.toggle(".curve-singular-warning", curve.isSingular());
    this.toggle(".composite-warning", !curve.isFieldPrime());
    this.markPreset();
  }

  text(selector, value) {
    const node = this.root.querySelector(selector);
    if (node && value !== null) node.textContent = String(value);
    return node;
  }

  toggle(selector, visible) {
    const node = this.root.querySelector(selector);
    if (node) node.style.display = visible ? "" : "none";
    if (node && visible && node.classList.contains("alert")) node.style.display = "flex";
  }

  markPreset() {
    const current = new Map([...this.root.querySelectorAll("#form input:not([readonly])")].map((input) => [input.name, input.value]));
    for (const chip of this.root.querySelectorAll("a.chip[href*='?']")) {
      const preset = queryValues(chip.getAttribute("href"));
      const matches = [...preset].every(([name, value]) => current.get(name) === value);
      chip.setAttribute("aria-current", String(matches));
    }
  }
}
