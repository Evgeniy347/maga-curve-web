import { INFINITY } from "./curve.js";
import { lineThrough } from "./chord.js";
import { COLORS, Plot } from "./plot.js";
import { snapToCurve } from "./snap.js";

const QUERY_NAME = /^[a-z]+$/;
const QUERY_VALUE = /^[-.0-9]+$/;

export function queryValues(search) {
  const values = new Map();
  for (const item of search.replace(/^\?/, "").split("&")) {
    const parts = item.split("=");
    if (parts.length !== 2) continue;
    const [name, value] = parts;
    if (QUERY_NAME.test(name) && QUERY_VALUE.test(value)) values.set(name, value);
  }
  return values;
}

export function term(value, suffix) {
  if (value > 0) return ` + ${value}${suffix}`;
  if (value < 0) return ` − ${-value}${suffix}`;
  return "";
}

export function formatCoordinate(point, index) {
  if (point === INFINITY) return "Inf";
  if (point === undefined) return "NaN";
  return String(point[index]);
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
    const p = curve.p;
    const range = { xMin: 0, xMax: p - 1, yMin: 0, yMax: p - 1 };
    const series = [{ color: COLORS.blue, data: curve.points(), points: { radius: 3 } }];
    if (R) {
      series.push({ color: COLORS.red, data: [R, [R[0], p - R[1]]], lines: true });
      series.push({ color: COLORS.red, data: [R], points: { radius: 5 } });
    }
    series.push({ color: COLORS.yellow, data: lineThrough(trace, P, p, range), lines: true });
    series.push({ color: COLORS.yellow, data: [P, Q], points: { radius: 5 } });
    this.plot.draw(range, series);
    this.plot.setLabel("P", COLORS.yellow, P);
    this.plot.setLabel("Q", COLORS.yellow, Q);
    this.plot.setLabel("R", COLORS.red, R);
    this.rx.value = formatCoordinate(R, 0);
    this.ry.value = formatCoordinate(R, 1);
    this.root.querySelector(".curve-equation").innerHTML = this.form.equation(coefficients);
    this.root.querySelector(".field-order").textContent = p;
    this.root.querySelector(".curve-order").textContent = curve.order();
    this.toggle(".curve-singular-warning", curve.isSingular());
    this.toggle(".composite-warning", !curve.isFieldPrime());
  }

  toggle(selector, visible) {
    this.root.querySelector(selector).style.display = visible ? "block" : "none";
  }
}
