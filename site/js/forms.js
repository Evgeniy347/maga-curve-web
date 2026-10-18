import { montgomery, weierstrass } from "./curve.js";
import { term } from "./page.js";

function leading(B) {
  if (B === 1) return "";
  if (B === -1) return "−";
  return String(B);
}

export function weierstrassEquation({ a, b }) {
  return `<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em>")}${term(b, "")}`;
}

export const WEIERSTRASS_FORM = {
  coefficients: ["a", "b"],
  names: { A: "A", B: "B", C: "a", D: "b" },
  create: weierstrass,
  equation: weierstrassEquation,
};

export const MONTGOMERY_FORM = {
  coefficients: ["a", "b"],
  names: { A: "A", B: "B", C: "C", D: "D" },
  create: ({ a, b, p }) => montgomery({ A: a, B: b, p }),
  equation: ({ a, b }) => `${leading(b)}<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em><sup>2</sup>")} + <em>x</em>`,
};

export const THESIS_CURVE = { A: 6, B: 1, p: 29 };
export const THESIS_SUM = { P: [2, 11], Q: [7, 8] };
