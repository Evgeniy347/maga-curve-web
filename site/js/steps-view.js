import { additionStages, reductionTail } from "./steps.js";

function node(tag, className, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.append(...children);
  return element;
}

function tailOf(item, p) {
  return p === undefined ? [] : reductionTail(item.raw, p);
}

function stepItem(item, number, p, isFinal) {
  const calculation = [...item.forms, ...tailOf(item, p)];
  const rhs = node("span", "rhs");
  if (calculation.length > 0) {
    rhs.append(node("span", "calc", [calculation.join(" = ")]), node("span", "eq", [p === undefined ? " = " : " ≡ "]));
  }
  rhs.append(node("span", "val", [String(item.value)]));
  return node("li", isFinal ? "step is-final" : "step", [
    node("span", "n", [String(number)]),
    node("span", "lhs", [item.label]),
    rhs,
  ]);
}

function stageItem(stage, index, firstNumber, p) {
  const steps = stage.steps.map((item, i) => stepItem(item, firstNumber + i, p, i === stage.steps.length - 1));
  return node("li", "stage", [
    node("div", "stage-head", [
      node("span", "stage-no", [String(index + 1)]),
      node("h3", "", [stage.title]),
      node("code", "formula", [stage.formula]),
    ]),
    node("ol", "stage-steps", steps),
  ]);
}

function sideText(side, p) {
  const tail = tailOf(side, p);
  const chain = [side.label, ...side.forms, ...tail];
  if (tail.length === 0 && side.raw === side.value) return [...chain, String(side.value)].join(" = ");
  return `${chain.join(" = ")} ≡ ${side.value}`;
}

function checkItem(check, p) {
  const verdict = check.holds ? "✓ совпадает" : "✗ не совпадает";
  return node("li", "stage stage-check", [
    node("div", "stage-head", [
      node("span", check.holds ? "stage-no ok" : "stage-no", [check.holds ? "✓" : "✗"]),
      node("h3", "", ["Проверка: R лежит на кривой"]),
    ]),
    node("div", check.holds ? "check mono" : "check mono fails", [
      node("p", "check-side", [sideText(check.left, p)]),
      node("p", "check-side", [sideText(check.right, p)]),
      node("p", "check-verdict", [node("b", "", [verdict])]),
    ]),
  ]);
}

export function renderStages(list, { stages, check, message }, p) {
  const items = [];
  let number = 1;
  stages.forEach((stage, index) => {
    items.push(stageItem(stage, index, number, p));
    number += stage.steps.length;
  });
  if (message) items.push(node("li", "stage", [node("p", "step-message", [message])]));
  if (check) items.push(checkItem(check, p));
  list.replaceChildren(...items);
}

export function renderSteps(list, curve, first, second, names) {
  renderStages(list, additionStages(curve, first, second, names), curve.p);
}
