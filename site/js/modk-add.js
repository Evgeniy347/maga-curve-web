import { weierstrass } from "./curve.js";
import { AdditionPage, term } from "./page.js";

export const WEIERSTRASS_FORM = {
  coefficients: ["a", "b"],
  create: weierstrass,
  equation: ({ a, b }) => `<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em>")}${term(b, "")}`,
};

if (typeof document !== "undefined") {
  new AdditionPage(document.body, WEIERSTRASS_FORM).update();
}
