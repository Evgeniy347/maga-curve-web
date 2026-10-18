import { montgomery } from "./curve.js";
import { AdditionPage, term } from "./page.js";
import { renderSteps } from "./steps-view.js";

function leading(B) {
  if (B === 1) return "";
  if (B === -1) return "−";
  return String(B);
}

export const MONTGOMERY_FORM = {
  coefficients: ["a", "b"],
  names: { A: "A", B: "B", C: "C", D: "D" },
  create: ({ a, b, p }) => montgomery({ A: a, B: b, p }),
  equation: ({ a, b }) => `${leading(b)}<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em><sup>2</sup>")} + <em>x</em>`,
};

if (typeof document !== "undefined") {
  const page = new AdditionPage(document.body, MONTGOMERY_FORM);
  page.onUpdate(({ curve, P, Q }) => renderSteps(document.querySelector("#steps ol"), curve, P, Q, MONTGOMERY_FORM.names));
  page.update();
}
