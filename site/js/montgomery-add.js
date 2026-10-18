import { montgomery } from "./curve.js";
import { AdditionPage, term } from "./page.js";
import { additionSteps } from "./steps.js";

function leading(B) {
  if (B === 1) return "";
  if (B === -1) return "−";
  return String(B);
}

export const MONTGOMERY_FORM = {
  coefficients: ["a", "b"],
  create: ({ a, b, p }) => montgomery({ A: a, B: b, p }),
  equation: ({ a, b }) => `${leading(b)}<em>y</em><sup>2</sup> = <em>x</em><sup>3</sup>${term(a, "<em>x</em><sup>2</sup>")} + <em>x</em>`,
};

function describeOrder(curve, point) {
  if (point === null) return "1 (это ∞)";
  if (point === undefined) return "—";
  return String(curve.pointOrder(point) ?? "—");
}

export function renderDetails(root, { curve, P, Q, trace }) {
  root.querySelector(".point-order-p").textContent = describeOrder(curve, P);
  root.querySelector(".point-order-q").textContent = describeOrder(curve, Q);
  root.querySelector(".point-order-r").textContent = describeOrder(curve, trace.result);
  const list = root.querySelector("#steps ol");
  list.replaceChildren(...additionSteps(curve, P, Q).map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  }));
}

if (typeof document !== "undefined") {
  const page = new AdditionPage(document.body, MONTGOMERY_FORM);
  page.onUpdate((state) => renderDetails(document.body, state));
  page.update();
}
