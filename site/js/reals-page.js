import { FormPage, PointInput, pointBadges } from "./page.js";
import { Plot } from "./plot.js";
import { realCurvePolyline, realLine, realPlotRange } from "./real-geometry.js";
import { formatReal, formatRealPoint, realAdditionStages, realMultiplicationStages } from "./real-steps.js";
import { snapToRealCurve } from "./snap.js";
import { renderStages } from "./steps-view.js";

const LINE_KINDS = { tangent: "касательная", vertical: "вертикаль" };

export function realLineEquation(trace, [x1, y1]) {
  if (trace.lambda === undefined) return `x = ${formatReal(x1)}`;
  const intercept = y1 - trace.lambda * x1;
  const sign = intercept < 0 ? "−" : "+";
  return `y = ${formatReal(trace.lambda)}x ${sign} ${formatReal(Math.abs(intercept))}`;
}

function coordinateText(point, index) {
  return point === null ? "∞" : formatReal(point[index]);
}

class RealPage extends FormPage {
  constructor(root, form) {
    super(root);
    this.form = form;
    this.pInput = new PointInput(root, "p", snapToRealCurve);
    this.plot = new Plot(root.querySelector("#plot"));
  }

  curve() {
    const a = this.checked("a", Number.isFinite, "a — конечное число; оставлено прежнее значение.");
    const b = this.form.positiveB
      ? this.checked("b", (value) => Number.isFinite(value) && value > 0, "B > 0: при B ≤ 0 над ℝ получается другая кривая; оставлено прежнее значение.")
      : this.checked("b", Number.isFinite, "b — конечное число; оставлено прежнее значение.");
    this.coefficients = { a, b };
    return this.form.create({ a, b });
  }

  renderCurve(curve, range, scene) {
    this.plot.render({
      range,
      curveLines: [realCurvePolyline(curve, range)],
      caption: "График: кривая над ℝ",
      ...scene,
    });
    this.html(".curve-equation", this.form.equation(this.coefficients));
    this.toggle(".curve-singular-warning", curve.isSingular());
    this.markPreset();
  }
}

export class RealAdditionPage extends RealPage {
  constructor(root, form) {
    super(root, form);
    this.qInput = new PointInput(root, "q", snapToRealCurve);
  }

  refresh() {
    const curve = this.curve();
    const P = this.pInput.snap(curve, this.changed);
    const Q = this.qInput.snap(curve, this.changed);
    const trace = curve.addTrace(P, Q);
    const R = trace.result;
    const third = curve.neg(R);
    const range = realPlotRange(curve, [P, Q, R, third]);
    const line = `${LINE_KINDS[trace.kind] ?? "прямая"} ${realLineEquation(trace, P)}`;
    this.renderCurve(curve, range, {
      chord: realLine(trace, P, range),
      badges: pointBadges(P, Q, R),
      R,
      third,
      description: `Кривая над ℝ; ${line} через P = ${formatRealPoint(P)} и Q = ${formatRealPoint(Q)}; R = ${formatRealPoint(R)}.`,
    });
    this.input("rx").value = coordinateText(R, 0);
    this.input("ry").value = coordinateText(R, 1);
    this.text(".legend-line", line);
    this.text(".sum-p", formatRealPoint(P));
    this.text(".sum-q", formatRealPoint(Q));
    this.text(".sum-r", formatRealPoint(R));
    this.toggle(".legend-third", R !== null && R[1] !== 0);
    renderStages(this.root.querySelector("#steps ol"), realAdditionStages(curve, P, Q, this.form.names));
    this.emit({ curve, P, Q, trace });
  }
}

export class RealMultiplicationPage extends RealPage {
  refresh() {
    const curve = this.curve();
    const n = this.scalar();
    const P = this.pInput.snap(curve, this.changed);
    const result = realMultiplicationStages(curve, n, P);
    const Q = result.chain.at(-1).point;
    const range = realPlotRange(curve, [P, Q]);
    this.renderCurve(curve, range, {
      badges: [{ name: "P", role: "is-p", point: P }, { name: "Q", role: "is-r", point: Q }],
      description: `Кривая над ℝ; P = ${formatRealPoint(P)}, Q = ${n}·P = ${formatRealPoint(Q)}.`,
    });
    this.input("qx").value = coordinateText(Q, 0);
    this.input("qy").value = coordinateText(Q, 1);
    this.text(".sum-n", n);
    this.text(".sum-p", formatRealPoint(P));
    this.text(".sum-r", formatRealPoint(Q));
    renderStages(this.root.querySelector("#steps ol"), result);
    this.emit({ curve, n, P, Q });
  }
}
