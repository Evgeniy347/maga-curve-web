import { weierstrass } from "./curve.js";
import { AdditionPage, term } from "./page.js";
import { renderSteps } from "./steps-view.js";

export const WEIERSTRASS_FORM = {
  coefficients: ["a", "b"],
  names: { A: "A", B: "B", C: "a", D: "b" },
  create: weierstrass,
  equation: ({ a, b }) => `<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em>")}${term(b, "")}`,
};

if (typeof document !== "undefined") {
  const page = new AdditionPage(document.body, WEIERSTRASS_FORM);
  page.onUpdate(({ curve, P, Q }) => renderSteps(document.querySelector("#steps ol"), curve, P, Q, WEIERSTRASS_FORM.names));
  page.update();
}
