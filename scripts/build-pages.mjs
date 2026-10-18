import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = new URL("../site/", import.meta.url);
const SITE_TITLE = "Точки эллиптических кривых";
const GITHUB = "https://github.com/Evgeniy347/maga-curve-web";
const ORIGINAL = "https://andrea.corbellini.name/ecc/interactive/modk-add.html";
const F = '<span class="bb">𝔽</span><sub>p</sub>';
const m = (symbol) => `<span class="m">${symbol}</span>`;
const mono = (text) => `<span class="mono">${text}</span>`;

export const FORMS = {
  montgomery: { name: "Форма Монтгомери", equation: "By² = x³ + Ax² + x", coefficients: ["A", "B"] },
  weierstrass: { name: "Форма Вейерштрасса", equation: "y² = x³ + ax + b", coefficients: ["a", "b"] },
};

export const OPERATIONS = {
  add: { tab: "Сложение над 𝔽<sub>p</sub>", title: "Сложение точек над 𝔽p", heading: `Сложение точек над ${F}` },
  mul: { tab: "Умножение над 𝔽<sub>p</sub>", title: "Умножение точки на число над 𝔽p", heading: `Умножение точки на число над ${F}` },
  "reals-add": { tab: "Сложение над ℝ", title: "Сложение точек над ℝ", heading: "Сложение точек над ℝ" },
  "reals-mul": { tab: "Умножение над ℝ", title: "Умножение точки на число над ℝ", heading: "Умножение точки на число над ℝ" },
};

export const pageFile = (form, op) => `${form}-${op}.html`;

const shiftX = (values) => values.map(([k, v]) => [k, ["px", "qx"].includes(k) ? (v + 2) % 29 : v]);
const asWeierstrass = (values) => [["a", 18], ["b", 14], ...shiftX(values.filter(([k]) => !["a", "b"].includes(k)))];
const preset = (label, values) => ({ label, values });

const FIELD_SUM = [
  preset("P + Q", [["a", 6], ["b", 1], ["p", 29], ["px", 2], ["py", 11], ["qx", 7], ["qy", 8]]),
  preset("[2]G", [["a", 6], ["b", 1], ["p", 29], ["px", 9], ["py", 8], ["qx", 9], ["qy", 8]]),
  preset("[3]G = [2]G + G", [["a", 6], ["b", 1], ["p", 29], ["px", 25], ["py", 17], ["qx", 9], ["qy", 8]]),
  preset("−G + G = ∞", [["a", 6], ["b", 1], ["p", 29], ["px", 9], ["py", 21], ["qx", 9], ["qy", 8]]),
];
const FIELD_PRODUCT = [
  preset("d = 538", [["a", 6], ["b", 1], ["p", 29], ["n", 538], ["px", 9], ["py", 8]]),
  preset("[3]G", [["a", 6], ["b", 1], ["p", 29], ["n", 3], ["px", 9], ["py", 8]]),
  preset("[5]G = ∞", [["a", 6], ["b", 1], ["p", 29], ["n", 5], ["px", 9], ["py", 8]]),
  preset("[−1]G", [["a", 6], ["b", 1], ["p", 29], ["n", -1], ["px", 9], ["py", 8]]),
  preset("Точка порядка 40", [["a", 6], ["b", 1], ["p", 29], ["n", 13], ["px", 19], ["py", 5]]),
];
const shifted = (presets) => presets.map(({ label, values }) => preset(label, asWeierstrass(values)));

const SETTINGS = {
  montgomery: {
    add: {
      lead: `Кривая из диссертации — та же форма и тот же кофактор 8, что у X25519. Выберите ${m("P")} и ${m("Q")}: секущая «наматывается» на квадрат ${m("p")}×${m("p")}, третья точка пересечения отражается в ${m("R")}.`,
      defaults: { a: 6, b: 1, p: 29, px: 2, py: 11, qx: 7, qy: 8 },
      presets: FIELD_SUM,
      callout: `<b>Та же кривая в форме Вейерштрасса.</b> Замена ${mono("X = x + 2")} переводит её в ${mono("Y² = X³ + 18X + 14")}; λ и ${m("y")} совпадают, ${m("x")} сдвигаются на 2. <a href="weierstrass-add.html">Сравнить шаги →</a>`,
    },
    mul: {
      lead: `Так владелец ключа считает открытый ключ ${m("Q")} = [${m("d")}]${m("G")}: по битам ${m("d")} слева направо удвоить и, если бит равен 1, прибавить ${m("G")}. По умолчанию — ключ ${mono("d = 538")} из ручного прогона на кривой диссертации.`,
      defaults: { a: 6, b: 1, p: 29, n: 538, px: 9, py: 8 },
      presets: FIELD_PRODUCT,
      base: "(9, 8)",
      callout: `<b>Каждое звено цепочки — обычное сложение точек.</b> Раскройте шаг, чтобы увидеть λ, ${m("x")}₃, ${m("y")}₃; повторяющиеся вычисления отмечены ссылкой на первое, как «то же, что …» в ручном прогоне. <a href="montgomery-add.html">Сложение точек →</a>`,
    },
    "reals-add": {
      lead: `Кривая диссертации над ℝ: ${mono("y² = x³ + 6x² + x")} имеет три вещественных корня (0 и −3 ± 2√2), поэтому состоит из овала и ветви. Прямая через ${m("P")} и ${m("Q")} пересекает кривую в третьей точке −${m("R")}, её отражение — ${m("R")} = ${m("P")} + ${m("Q")}.`,
      defaults: { a: 6, b: 1, px: -1, py: 2, qx: 3, qy: 9.16515 },
      presets: [
        preset("P + Q", [["a", 6], ["b", 1], ["px", -1], ["py", 2], ["qx", 3], ["qy", 9.16515]]),
        preset("2P", [["a", 6], ["b", 1], ["px", -1], ["py", 2], ["qx", -1], ["qy", 2]]),
        preset("P + (−P) = ∞", [["a", 6], ["b", 1], ["px", -1], ["py", 2], ["qx", -1], ["qy", -2]]),
        preset("P, Q на овале", [["a", 6], ["b", 1], ["px", -3], ["py", 4.89898], ["qx", -1], ["qy", 2]]),
        preset("B = 4", [["a", 6], ["b", 4], ["px", -1], ["py", 1], ["qx", -1], ["qy", 1]]),
      ],
      callout: `<b>Над конечным полем — те же формулы.</b> Деление заменяется умножением на обратный по модулю ${m("p")}, а прямая «наматывается» на квадрат ${m("p")}×${m("p")}. <a href="montgomery-add.html">Сложение над ${F} →</a>`,
    },
    "reals-mul": {
      lead: `${m("Q")} = ${m("n")}·${m("P")} на кривой диссертации над ℝ. Вместо ${m("n")} − 1 сложений — бинарный метод: по битам ${m("n")} слева направо удвоить и, если бит равен 1, прибавить ${m("P")}.`,
      defaults: { a: 6, b: 1, n: 5, px: -1, py: 2 },
      presets: [2, 5, -3, 13].map((n) => preset(`n = ${n < 0 ? `−${-n}` : n}`, [["a", 6], ["b", 1], ["n", n], ["px", -1], ["py", 2]])),
      callout: `<b>Над конечным полем — та же цепочка.</b> В ручном прогоне ключ ${mono("d = 538 = 1000011010₂")} даёт 9 удвоений и 3 сложения. <a href="montgomery-mul.html">Умножение над ${F} →</a>`,
    },
  },
  weierstrass: {
    add: {
      lead: `Та же кривая диссертации в классической форме: замена ${mono("X = x + 2")} переводит ${mono("y² = x³ + 6x² + x")} в ${mono("y² = x³ + 18x + 14")}. Шаги можно сравнить с формой Монтгомери.`,
      defaults: { a: 18, b: 14, p: 29, px: 4, py: 11, qx: 9, qy: 8 },
      presets: shifted(FIELD_SUM),
      callout: `<b>Изоморфна кривой Монтгомери из диссертации.</b> ${mono("x = X − 2")}: ${m("P")} = (4, 11) ↔ (2, 11), ${m("Q")} = (9, 8) ↔ (7, 8), ${m("R")} = (21, 5) ↔ (19, 5). <a href="montgomery-add.html">Открыть форму Монтгомери →</a>`,
    },
    mul: {
      lead: `Ключ ${mono("d = 538")} на той же кривой в форме Вейерштрасса: ${m("G")} = (11, 8) — образ ${m("G")} = (9, 8) при ${mono("X = x + 2")}. Цепочка удвоений и сложений та же, у точек сдвигается только ${m("x")}.`,
      defaults: { a: 18, b: 14, p: 29, n: 538, px: 11, py: 8 },
      presets: shifted(FIELD_PRODUCT),
      base: "(11, 8)",
      callout: `<b>Сравните с формой Монтгомери.</b> Множители и биты те же, точки отличаются сдвигом ${mono("x = X − 2")}: [538]${m("G")} = (27, 12) ↔ (25, 12). <a href="montgomery-mul.html">Открыть форму Монтгомери →</a>`,
    },
    "reals-add": {
      lead: `Над вещественными числами кривая — гладкая линия, и закон сложения виден буквально: прямая через ${m("P")} и ${m("Q")} пересекает кривую в третьей точке −${m("R")}, её отражение относительно оси ${m("x")} — это ${m("R")} = ${m("P")} + ${m("Q")}.`,
      defaults: { a: -7, b: 10, px: 1, py: 2, qx: 3, qy: 4 },
      presets: [
        preset("P + Q", [["a", -7], ["b", 10], ["px", 1], ["py", 2], ["qx", 3], ["qy", 4]]),
        preset("2P", [["a", -7], ["b", 10], ["px", 1], ["py", 2], ["qx", 1], ["qy", 2]]),
        preset("P + (−P) = ∞", [["a", -7], ["b", 10], ["px", 1], ["py", 2], ["qx", 1], ["qy", -2]]),
        preset("Две компоненты", [["a", -4], ["b", 1], ["px", 0], ["py", 1], ["qx", 2], ["qy", 1]]),
      ],
      callout: `<b>Над конечным полем — те же формулы.</b> Деление заменяется умножением на обратный по модулю ${m("p")}, а прямая «наматывается» на квадрат ${m("p")}×${m("p")}. <a href="weierstrass-add.html">Сложение над ${F} →</a>`,
    },
    "reals-mul": {
      lead: `${m("Q")} = ${m("n")}·${m("P")} = ${m("P")} + … + ${m("P")}. Вместо ${m("n")} − 1 сложений — бинарный метод: по битам ${m("n")} слева направо удвоить и, если бит равен 1, прибавить ${m("P")}. Так же владелец ключа X25519 считает [${m("d")}]${m("G")}.`,
      defaults: { a: -7, b: 10, n: 2, px: 1, py: 2 },
      presets: [
        preset("n = 2", [["a", -7], ["b", 10], ["n", 2], ["px", 1], ["py", 2]]),
        preset("n = 5", [["a", -7], ["b", 10], ["n", 5], ["px", 1], ["py", 2]]),
        preset("n = −3", [["a", -7], ["b", 10], ["n", -3], ["px", 1], ["py", 2]]),
        preset("n = 13", [["a", -3], ["b", 3], ["n", 13], ["px", 2], ["py", 2.23607]]),
      ],
      callout: `<b>Над конечным полем — та же цепочка.</b> В ручном прогоне ключ ${mono("d = 538 = 1000011010₂")} даёт 9 удвоений и 3 сложения. <a href="weierstrass-mul.html">Умножение над ${F} →</a>`,
    },
  },
};

const SINGULAR = {
  montgomery: { field: `${m("B")}(${m("A")}<sup>2</sup> − 4) ≡ 0 (mod ${m("p")}).`, real: `${m("B")}(${m("A")}<sup>2</sup> − 4) = 0.` },
  weierstrass: { field: `4${m("a")}<sup>3</sup> + 27${m("b")}<sup>2</sup> ≡ 0 (mod ${m("p")}).`, real: `4${m("a")}<sup>3</sup> + 27${m("b")}<sup>2</sup> = 0.` },
};

function head(title, description, module) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="/core/gateway.css">
<script src="/core/gateway.js"></script>
<link rel="stylesheet" href="css/site.css">
<script type="module" src="js/${module}"></script>
</head>
<body>
`;
}

const FOOT = `  <section class="gw-section page-note">
    <p>Учебный инструмент к магистерской диссертации «Анализ стойкости алгоритмов на основе Curve25519 к атакам на ДЛОГ» (УрФУ). <a href="${GITHUB}">Исходный код на GitHub</a> · лицензия MIT · страницы формы Вейерштрасса основаны на интерактиве <a href="https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/">Andrea Corbellini</a>.</p>
  </section>
</main>
</body>
</html>
`;

function crumbs(items) {
  const links = items.map(([label, href]) => (href ? `      <li><a href="${href}">${label}</a></li>` : `      <li><span aria-current="page">${label}</span></li>`));
  return `    <nav class="gw-crumbs" aria-label="Путь"><ol>
      <li><a href="/">Новости</a></li>
${links.join("\n")}
    </ol></nav>
`;
}

export function sectionHead(currentForm, currentOp) {
  const trail = currentForm
    ? [[SITE_TITLE, "index.html"], [FORMS[currentForm].name, pageFile(currentForm, "add")], [OPERATIONS[currentOp].tab, null]]
    : [[SITE_TITLE, null]];
  return `  <section class="gw-page-head">
${crumbs(trail)}    <p class="gw-eyebrow">Учебный интерактив · магистерская диссертация</p>
    <h1>${SITE_TITLE}</h1>
  </section>
`;
}

export function siteTabs(currentForm, currentOp) {
  const overview = `    <a class="gw-tab" href="index.html"${currentForm ? "" : ' aria-current="page"'}>Обзор</a>`;
  const forms = Object.entries(FORMS).map(([key, form]) => {
    const current = key === currentForm ? ' aria-current="true"' : "";
    return `    <a class="gw-tab" href="${pageFile(key, currentOp ?? "add")}"${current}>${form.name}</a>`;
  });
  const formTabs = `  <nav class="gw-tabs form-tabs" aria-label="Форма кривой">
${[overview, ...forms].join("\n")}
  </nav>
`;
  if (!currentForm) return formTabs;
  const ops = Object.entries(OPERATIONS).map(([key, op]) => `    <a class="gw-tab" href="${pageFile(currentForm, key)}"${key === currentOp ? ' aria-current="page"' : ""}>${op.tab}</a>`);
  return formTabs + `  <nav class="gw-tabs op-tabs" aria-label="Операция">
${ops.join("\n")}
  </nav>
`;
}

function chips(file, presets) {
  return presets.map(({ label, values }) => {
    const query = values.map(([k, v]) => `${k}=${v}`).join("&amp;");
    return `<a class="gw-chip" href="${file}?${query}">${label}</a>`;
  }).join("");
}

function field(name, label, value, role = "", readonly = false, decimal = false) {
  const attributes = readonly ? ' readonly aria-readonly="true"' : ` value="${value}" type="number" step="${decimal ? "any" : "1"}" inputmode="${decimal ? "decimal" : "numeric"}"`;
  const id = { a: "coefficient-a", b: "coefficient-b", p: "coefficient-p", n: "multiplier-n" }[name] ?? `point-${name[0]}-${name[1]}`;
  return `<div class="field${role ? ` ${role}` : ""}"><label for="${id}">${label}</label><input id="${id}" name="${name}"${attributes}></div>`;
}

function pointFieldset(prefix, role, legend, defaults, { readonly = false, decimal = false, hint = "" } = {}) {
  return `          <fieldset><legend><span class="dot" style="background:var(--${role.slice(3)})"></span>${legend}${hint}</legend><div class="row two">
            ${field(`${prefix}x`, "x", defaults[`${prefix}x`], role, readonly, decimal)}
            ${field(`${prefix}y`, "y", defaults[`${prefix}y`], role, readonly, decimal)}</div></fieldset>
`;
}

const SNAP_HINT_FIELD = '          <p class="hint">Если введённая точка не лежит на кривой, она сдвигается к ближайшей точке кривой.</p>\n';
const SNAP_HINT_REAL = '          <p class="hint">Точка всегда остаётся на кривой: при изменении x пересчитывается y, при изменении y — ближайший x.</p>\n';
const order = (prefix) => ` <span class="hint">· порядок <b class="mono point-order-${prefix}"></b></span>`;

function formFields(formKey, op, d) {
  const [na, nb] = FORMS[formKey].coefficients;
  const real = op.startsWith("reals");
  const coefficients = real
    ? `          <fieldset><legend>Коэффициенты${formKey === "montgomery" ? ' <span class="hint">· B &gt; 0</span>' : ""}</legend><div class="row two">${field("a", na, d.a, "", false, true)}${field("b", nb, d.b, "", false, true)}</div></fieldset>\n`
    : `          <fieldset><legend>Коэффициенты и поле</legend><div class="row">${field("a", na, d.a)}${field("b", nb, d.b)}${field("p", "p", d.p)}</div></fieldset>\n`;
  const multiplier = (legend) => `          <fieldset><legend>${legend}</legend><div class="row two">${field("n", "n", d.n)}</div></fieldset>\n`;
  if (op === "add") {
    return coefficients
      + pointFieldset("p", "is-p", `Точка ${m("P")}`, d, { hint: order("p") })
      + pointFieldset("q", "is-q", `Точка ${m("Q")}`, d, { hint: order("q") })
      + SNAP_HINT_FIELD
      + pointFieldset("r", "is-r", `Сумма ${m("R")} = ${m("P")} + ${m("Q")}`, d, { readonly: true, hint: order("r") });
  }
  if (op === "mul") {
    const base = SETTINGS[formKey].mul.base;
    return coefficients + multiplier("Множитель (ключ)")
      + pointFieldset("p", "is-p", `Точка ${m("P")}`, d, { hint: ` <span class="hint">· по умолчанию ${m("G")} = ${base}</span>` })
      + SNAP_HINT_FIELD
      + pointFieldset("q", "is-r", `Результат ${m("Q")} = [${m("n")}]${m("P")}`, d, { readonly: true });
  }
  if (op === "reals-add") {
    return coefficients
      + pointFieldset("p", "is-p", `Точка ${m("P")}`, d, { decimal: true })
      + pointFieldset("q", "is-q", `Точка ${m("Q")}`, d, { decimal: true })
      + SNAP_HINT_REAL
      + pointFieldset("r", "is-r", `Сумма ${m("R")} = ${m("P")} + ${m("Q")}`, d, { readonly: true });
  }
  return coefficients + multiplier("Множитель")
    + pointFieldset("p", "is-p", `Точка ${m("P")}`, d, { decimal: true })
    + SNAP_HINT_REAL
    + pointFieldset("q", "is-r", `Результат ${m("Q")} = ${m("n")}·${m("P")}`, d, { readonly: true });
}

const LEGEND = {
  points: '        <li><svg viewBox="0 0 22 14" aria-hidden="true"><circle cx="11" cy="7" r="3.6" fill="var(--curve)"/></svg><span class="legend-points">точки кривой</span></li>\n',
  curve: '        <li><svg viewBox="0 0 22 14" aria-hidden="true"><path d="M2 12 C 8 2, 14 2, 20 12" fill="none" stroke="var(--curve)" stroke-width="2"/></svg>кривая над ℝ</li>\n',
  line: '        <li><svg viewBox="0 0 22 14" aria-hidden="true"><path d="M2 12 20 2" stroke="var(--chord)" stroke-width="2"/></svg><span class="legend-line mono"></span></li>\n',
  third: '        <li class="legend-third"><svg viewBox="0 0 22 14" aria-hidden="true"><circle cx="11" cy="7" r="5" fill="none" stroke="var(--r)" stroke-width="2" stroke-dasharray="3 3"/></svg>третья точка −R, отражение −R → R</li>\n',
  subgroup: '        <li><svg viewBox="0 0 22 14" aria-hidden="true"><circle cx="11" cy="7" r="6" fill="none" stroke="var(--p)" stroke-width="1.5"/></svg><span class="legend-subgroup"></span></li>\n',
};

const SUM_LINE = {
  add: '<span class="sum-p" style="color:var(--p)"></span> + <span class="sum-q" style="color:var(--q)"></span> = <b class="sum-r"></b>',
  mul: '[<b class="sum-n"></b>]<span class="sum-p" style="color:var(--p)"></span> = <b class="sum-r"></b>',
  "reals-add": '<span class="sum-p" style="color:var(--p)"></span> + <span class="sum-q" style="color:var(--q)"></span> = <b class="sum-r"></b>',
  "reals-mul": '<b class="sum-n"></b>·<span class="sum-p" style="color:var(--p)"></span> = <b class="sum-r"></b>',
};

function curvePanel(formKey, op) {
  const real = op.startsWith("reals");
  const facts = {
    add: `        <dl class="facts">
          <div class="fact"><dt>Точек #${m("E")}</dt><dd><span class="curve-order"></span> <small class="curve-order-factor"></small></dd></div>
          <div class="fact"><dt>Подгруппа ℓ</dt><dd class="subgroup-order"></dd></div>
          <div class="fact"><dt>Кофактор ${m("h")}</dt><dd class="cofactor"></dd></div>
        </dl>
`,
    mul: `        <dl class="facts four">
          <div class="fact"><dt>Точек #${m("E")}</dt><dd><span class="curve-order"></span> <small class="curve-order-factor"></small></dd></div>
          <div class="fact"><dt>Порядок ${m("P")}</dt><dd class="point-order-p"></dd></div>
          <div class="fact"><dt>${m("n")} mod ord ${m("P")}</dt><dd class="residue"></dd></div>
          <div class="fact"><dt>Операций</dt><dd><span class="operations"></span> <small>вместо <span class="naive-operations"></span></small></dd></div>
        </dl>
`,
  }[op] ?? "";
  const field = real ? " над ℝ" : ` над <span class="bb">𝔽</span><sub class="field-order"></sub>`;
  const composite = real ? "" : `        <p class="alert composite-warning" role="alert">⚠ <span>${m("p")} не простое: в 𝔽<sub>p</sub> есть необратимые элементы, сумма может быть не определена.</span></p>\n`;
  return `      <section class="card panel" aria-labelledby="curve-h">
        <h2 id="curve-h">${op === "mul" ? "Кривая и цена" : "Кривая"}</h2>
        <p class="equation"><span class="curve-equation"></span>${field}</p>
${facts}        <p class="alert input-warning" role="alert"></p>
        <p class="alert curve-singular-warning" role="alert">⚠ Кривая сингулярна: ${SINGULAR[formKey][real ? "real" : "field"]}</p>
${composite}      </section>
`;
}

export function toolPage(formKey, op) {
  const form = FORMS[formKey];
  const operation = OPERATIONS[op];
  const settings = SETTINGS[formKey][op];
  const file = pageFile(formKey, op);
  const legend = {
    add: LEGEND.points + LEGEND.line + LEGEND.third,
    mul: LEGEND.points + LEGEND.subgroup,
    "reals-add": LEGEND.curve + LEGEND.line + LEGEND.third,
    "reals-mul": LEGEND.curve,
  }[op];
  const stepsTitle = op.startsWith("reals") ? "Ход вычисления" : 'Ход вычисления · по модулю <span class="steps-modulus"></span>';
  const description = `${operation.title}: ${form.name.toLowerCase()} ${form.equation}, график, ход вычисления по шагам.`;
  return head(`${operation.title} · ${form.name}`, description, "app.js") + `<main id="main" class="gw-wrap" data-form="${formKey}" data-op="${op}">
${sectionHead(formKey, op)}${siteTabs(formKey, op)}  <div class="tool-head">
    <p class="tool-form mono">${form.equation}</p>
    <h2>${operation.heading}</h2>
    <p class="gw-lead">${settings.lead}</p>
  </div>
  <div class="tool">
    <section class="card plot-card" aria-label="График">
      <div class="plot-toolbar"><span class="gw-eyebrow">Примеры</span>${chips(file, settings.presets)}</div>
      <div id="plot"></div>
      <ul class="legend" aria-label="Легенда графика">
${legend}      </ul>
      <p class="sum-line mono" aria-live="polite">${SUM_LINE[op]}</p>
    </section>
    <div class="side">
${curvePanel(formKey, op)}      <section class="card panel" aria-labelledby="points-h">
        <h2 id="points-h">Параметры и точки</h2>
        <form id="form" onsubmit="return false">
${formFields(formKey, op, settings.defaults)}        </form>
      </section>
      <section class="card panel" id="steps" aria-labelledby="steps-h">
        <h2 id="steps-h">${stepsTitle}</h2>
        <ol class="steps-list"></ol>
      </section>
      <div class="callout"><span aria-hidden="true">⇄</span><p>${settings.callout}</p></div>
    </div>
  </div>
${FOOT}`;
}

function toolLinks(formKey) {
  return Object.entries(OPERATIONS).map(([op, operation]) => `<li><a href="${pageFile(formKey, op)}">${operation.tab}</a></li>`).join("");
}

export function landingPage() {
  const formCards = Object.entries(FORMS).map(([key, form]) => `      <section class="card form-card">
        <p class="gw-eyebrow">${key === "montgomery" ? "Кривая диссертации · как X25519" : "Классическая форма · Corbellini"}</p>
        <h3>${form.name}</h3>
        <p class="eqline">${form.equation}</p>
        <p>${key === "montgomery"
    ? `${mono("y² = x³ + 6x² + x")} над ${F} при ${m("p")} = 29: #${m("E")} = 40 = 8·5, ${m("G")} = (9, 8) порядка 5. Над ℝ — овал и ветвь.`
    : `Та же кривая после замены ${mono("X = x + 2")}: ${mono("y² = x³ + 18x + 14")}. Шаги сравниваются с формой Монтгомери.`}</p>
        <ul class="tool-links">${toolLinks(key)}</ul>
      </section>`).join("\n");
  return head(`${SITE_TITLE} — сложение и умножение`, "Учебный интерактив к магистерской диссертации о Curve25519: сложение и умножение точек эллиптической кривой над 𝔽p и ℝ в формах Монтгомери и Вейерштрасса.", "landing.js") + `<main id="main" class="gw-wrap">
${sectionHead(null, null)}${siteTabs(null, null)}  <section class="hero">
    <div>
      <h2>Сложение и умножение точек над ${F} и ℝ</h2>
      <p class="gw-lead">Две формы кривой — Монтгомери и Вейерштрасса — и в каждой четыре операции. Над ${F} секущая «наматывается» на квадрат ${m("p")}×${m("p")}, и каждое действие с λ, ${m("x")}₃ и ${m("y")}₃ разобрано по модулю — на той же кривой, что в ручном прогоне диссертации.</p>
      <p class="meta"><a href="${GITHUB}" rel="noopener">Исходный код на GitHub ↗</a> · <a href="${ORIGINAL}" rel="noopener">Оригинальный интерактив ↗</a></p>
    </div>
    <figure class="card hero-plot" style="margin:0"><div id="hero-plot"></div><figcaption><span class="mono">(2, 11) + (7, 8) = (19, 5)</span> на <span class="mono">y² = x³ + 6x² + x</span> над <span class="bb">𝔽</span><sub>29</sub></figcaption></figure>
  </section>
  <section class="block" aria-labelledby="tools">
    <div class="block-head"><p class="gw-eyebrow">Инструменты</p><h2 id="tools">Две формы — четыре операции</h2><p>Каждая форма открывается на кривой диссертации: сложение и умножение над ${F} и над ℝ.</p></div>
    <div class="form-cards">
${formCards}
    </div>
  </section>
  <section class="block" aria-labelledby="how-h">
    <div class="block-head"><p class="gw-eyebrow">Как пользоваться</p><h2 id="how-h">Три шага</h2></div>
    <ol class="how">
<li><b>Выберите форму и операцию.</b> Вкладки под заголовком: форма Монтгомери или Вейерштрасса, под ними — сложение или умножение над ${F} или ℝ.</li>
<li><b>Задайте точки.</b> Введите координаты или нажмите готовый пример — неверная точка сама притянется к кривой.</li>
<li><b>Проверьте арифметику.</b> Каждый шаг λ, ${m("x")}₃, ${m("y")}₃ показан с вычислением — как при ручном прогоне.</li>
</ol>
  </section>
${FOOT}`;
}

export function buildPages() {
  const pages = { "index.html": landingPage() };
  for (const form of Object.keys(FORMS)) {
    for (const op of Object.keys(OPERATIONS)) pages[pageFile(form, op)] = toolPage(form, op);
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [file, html] of Object.entries(buildPages())) writeFileSync(new URL(file, SITE), html);
  console.log(`built ${Object.keys(buildPages()).length} pages into site/`);
}
