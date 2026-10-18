import { mod } from "./field.js";
import { formatPoint } from "./page.js";
import { additionStages, multipleName, plural, reductionTail } from "./steps.js";

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

function stageNodes({ stages, check, message }, p) {
  const items = [];
  let number = 1;
  stages.forEach((stage, index) => {
    items.push(stageItem(stage, index, number, p));
    number += stage.steps.length;
  });
  if (message) items.push(node("li", "stage", [node("p", "step-message", [message])]));
  if (check) items.push(checkItem(check, p));
  return items;
}

export function renderStages(list, result, p) {
  list.replaceChildren(...stageNodes(result, p));
}

export function renderSteps(list, curve, first, second, names) {
  renderStages(list, additionStages(curve, first, second, names), curve.p);
}

function chainForms(link, previous, symbol, scalar) {
  if (link.action === "start") return [scalar < 0 ? `−${symbol}` : symbol];
  if (link.action === "double") return [`2·${multipleName(previous.multiplier, symbol)} (бит ${link.bit})`];
  return [`${multipleName(previous.multiplier, symbol)} ${scalar < 0 ? "−" : "+"} ${symbol}`];
}

function chainLabel(link, order, symbol) {
  const name = multipleName(link.multiplier, symbol);
  if (!order || link.residue === link.multiplier) return name;
  return `${name} ≡ ${multipleName(link.residue, symbol)}`;
}

function detailItem(link, p) {
  if (link.sameAs !== undefined) {
    return node("li", "step-detail", [node("p", "step-same", [`то же вычисление, что в шаге ${link.sameAs}`])]);
  }
  const nested = node("ol", "steps-list nested");
  nested.append(...stageNodes(link.detail, p));
  return node("li", "step-detail", [node("details", "", [node("summary", "", [`λ, x₃, y₃ для шага ${link.step}`]), nested])]);
}

function reductionCheck(curve, result, scalar, point, symbol) {
  const { order } = result;
  const residue = mod(scalar, order);
  const quotient = (scalar - residue) / order;
  const direct = curve.multiply(residue, point);
  const holds = curve.equals(direct, result.result);
  return node("li", "stage stage-check", [
    node("div", "stage-head", [
      node("span", holds ? "stage-no ok" : "stage-no", [holds ? "✓" : "✗"]),
      node("h3", "", [`Проверка: порядок ${symbol} равен ${order}`]),
    ]),
    node("div", holds ? "check mono" : "check mono fails", [
      node("p", "check-side", [`${scalar} = ${quotient}·${order} + ${residue} → ${multipleName(scalar, symbol)} = ${multipleName(residue, symbol)} = ${formatPoint(direct)}`]),
      node("p", "check-verdict", [node("b", "", [holds ? "✓ совпадает с результатом цепочки" : "✗ не совпадает"])]),
    ]),
  ]);
}

export function renderChain(list, curve, scalar, point, result, symbol = "P") {
  const { links, order, doublings, additions } = result;
  if (links[0].action === "zero") {
    list.replaceChildren(node("li", "stage", [node("p", "step-message", [`n = 0 или ${symbol} = ∞ → n·${symbol} = ∞`])]));
    return;
  }
  const rows = [];
  links.forEach((link, i) => {
    const item = { label: chainLabel(link, order, symbol), forms: chainForms(link, links[i - 1], symbol, scalar), raw: null, value: formatPoint(link.point) };
    rows.push(stepItem(item, link.step, undefined, i === links.length - 1));
    if (link.action !== "start") rows.push(detailItem(link, curve.p));
  });
  const cost = `${plural(doublings, ["удвоение", "удвоения", "удвоений"])} + ${plural(additions, ["сложение", "сложения", "сложений"])} = ${plural(doublings + additions, ["операция", "операции", "операций"])}`;
  const items = [node("li", "stage", [
    node("div", "stage-head", [
      node("span", "stage-no", ["1"]),
      node("h3", "", [`Бинарный метод: |n| = ${Math.abs(scalar)} = ${Math.abs(scalar).toString(2)}₂`]),
      node("code", "formula", [cost]),
    ]),
    node("ol", "stage-steps", rows),
  ])];
  if (order && result.result !== undefined) items.push(reductionCheck(curve, result, scalar, point, symbol));
  list.replaceChildren(...items);
}
