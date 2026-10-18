import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
const FORMS = ["montgomery", "weierstrass"];
const OPERATIONS = ["add", "mul", "reals-add", "reals-mul"];
const TOOL_PAGES = FORMS.flatMap((form) => OPERATIONS.map((op) => `${form}-${op}.html`));
const PAGES = ["index.html", ...TOOL_PAGES];
const FIELD_PAGES = FORMS.map((form) => `${form}-add.html`);
const read = (page) => readFileSync(join(SITE, page), "utf8");

function filesUnder(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}

function stripStrings(source) {
  return source.replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

function scriptsOf(html) {
  return [...html.matchAll(/<script([^>]*)src="([^"]+)"/g)].map(([, attributes, src]) => ({ src, module: /type="module"/.test(attributes) }));
}

test("site sources carry no comments: explanations live in tests and docs/", () => {
  const offenders = filesUnder(join(SITE, "js"), ".js").filter((file) => {
    const code = stripStrings(readFileSync(file, "utf8"));
    return /(^|[^:\\])\/\/|\/\*/.test(code);
  });
  assert.deepEqual(offenders, [], `comments found in ${offenders.join(", ")}; see docs/код-и-тесты.md`);
});

test("every page loads only modules that exist", () => {
  for (const page of PAGES) {
    for (const { src } of scriptsOf(read(page)).filter((script) => !script.src.startsWith("/core/"))) {
      assert.doesNotThrow(
        () => readFileSync(join(SITE, src)),
        `${page} references ${src}, which is missing from site/: the page would render without its controller`,
      );
    }
  }
});

test("every page in site/ is listed, so the checks below cover all of them", () => {
  assert.deepEqual(
    filesUnder(SITE, ".html").map((file) => file.slice(SITE.length).replaceAll("\\", "/")).sort(), [...PAGES].sort(),
    "a new page must be added to PAGES to get the navigation, language and GitHub checks",
  );
});

test("finite-field pages have the inputs and slots the addition controller reads", () => {
  for (const page of FIELD_PAGES) {
    const html = read(page);
    for (const name of ["a", "b", "p", "px", "py", "qx", "qy", "rx", "ry"]) {
      assert.match(html, new RegExp(`name="${name}"`), `${page} lacks input name="${name}" required by AdditionPage`);
    }
    for (const cls of ["curve-equation", "field-order", "curve-order", "curve-singular-warning", "composite-warning", "steps-list"]) {
      assert.match(html, new RegExp(`class="[^"]*\\b${cls}\\b`), `${page} lacks .${cls}, AdditionPage.render writes into it`);
    }
  }
});

test("real-field pages have the inputs their controllers read", () => {
  const required = Object.fromEntries(FORMS.flatMap((form) => [[`${form}-reals-add.html`, ["a", "b", "px", "py", "qx", "qy", "rx", "ry"]], [`${form}-reals-mul.html`, ["a", "b", "n", "px", "py", "qx", "qy"]], [`${form}-mul.html`, ["a", "b", "p", "n", "px", "py", "qx", "qy"]]]));
  for (const [page, names] of Object.entries(required)) {
    const html = read(page);
    for (const name of names) {
      assert.match(html, new RegExp(`name="${name}"`), `${page} lacks input name="${name}" required by its RealPage controller`);
    }
    assert.match(html, /class="[^"]*\bcurve-singular-warning\b/, `${page} lacks the singular-curve warning`);
  }
});

test("library modules load outside the browser; only page entry points touch the DOM at top level", async () => {
  const entries = new Set(PAGES.flatMap((page) => scriptsOf(read(page)).filter((s) => s.module).map((s) => s.src.replace(/^js\//, ""))));
  for (const file of filesUnder(join(SITE, "js"), ".js")) {
    const name = file.slice(join(SITE, "js").length + 1);
    if (entries.has(name)) continue;
    await assert.doesNotReject(import(pathToFileURL(file).href), `${file} fails to load: syntax error or top-level DOM access`);
  }
});

test("every page links to the project repository on GitHub", () => {
  for (const page of PAGES) {
    assert.match(read(page), /href="https:\/\/github\.com\/Evgeniy347\/maga-curve-web"/, `${page} must link to the source on GitHub`);
  }
});

test("the word «игрушечная» is gone from every page: the thesis curve is not called a toy", () => {
  for (const page of PAGES) {
    assert.doesNotMatch(read(page), /грушечн/i, `${page} still calls the thesis curve «игрушечная»`);
  }
});

test("every page follows the gateway contract: core CSS/JS in <head>, no own header, footer or theme switch", () => {
  for (const page of PAGES) {
    const html = read(page);
    const head = html.slice(0, html.indexOf("</head>"));
    assert.match(html, /<html lang="ru">/, `${page}: the site is Russian-only`);
    assert.match(html, /name="viewport"/, `${page}: without a viewport meta phones render the desktop layout at ~0.5 scale`);
    assert.match(head, /<link rel="stylesheet" href="\/core\/gateway\.css">/, `${page}: PUBLISHING.md §3 — a page without /core/gateway.css is not published`);
    assert.match(head, /<script src="\/core\/gateway\.js"><\/script>/, `${page}: /core/gateway.js without defer/async, or the theme flickers`);
    assert.ok(head.indexOf("/core/gateway.css") < head.indexOf("css/site.css"), `${page}: our styles load after the core so they can build on its tokens`);
    assert.match(html, /<body>\n<main id="main" class="gw-wrap"[ >]/, `${page}: content lives in main#main.gw-wrap right after <body>, where the server injects its header`);
    assert.doesNotMatch(html, /<header|<footer|data-theme-toggle|fonts\.googleapis/, `${page}: header, footer, theme switch and fonts come from the gateway core`);
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      assert.match(href, /^\/(core\/.*)?$/, `${page}: absolute link ${href} — only /core/… and / are allowed (PUBLISHING.md §3.4)`);
    }
  }
});

test("two-level menu: form tabs on every page, operation tabs of the current form on tool pages", () => {
  const formTabsOf = (html) => html.match(/<div class="form-tabs">[\s\S]*?<\/div>/)[0].replace(/ aria-current="true"/g, "").replace(/-(add|mul|reals-add|reals-mul)\.html/g, "-OP.html");
  const reference = formTabsOf(read("index.html"));
  for (const form of FORMS) assert.match(reference, new RegExp(`href="${form}-OP\.html"`), `the landing page offers the ${form} form`);
  for (const page of PAGES) {
    const html = read(page);
    assert.equal(formTabsOf(html), reference, `${page}: form tabs differ from index.html`);
    assert.doesNotMatch(html, /corbellini\.name\/ecc\/interactive\/(reals|modk-mul)/, `${page}: the menu leads to our own pages, not Corbellini's`);
  }
  for (const form of FORMS) {
    for (const op of OPERATIONS) {
      const page = `${form}-${op}.html`;
      const html = read(page);
      assert.match(html, new RegExp(`<main id="main" class="gw-wrap" data-form="${form}" data-op="${op}">`), `${page}: app.js picks the controller from data-form/data-op`);
      assert.match(html, new RegExp(`class="form-tab" href="${form}-${op}\.html" aria-current="true"`), `${page}: its form tab is current`);
      for (const other of FORMS.filter((f) => f !== form)) {
        assert.match(html, new RegExp(`class="form-tab" href="${other}-${op}\.html"`), `${page}: switching the form keeps the operation`);
      }
      const opTabs = html.match(/<div class="op-tabs">[\s\S]*?<\/div>/)[0];
      assert.deepEqual([...opTabs.matchAll(/href="([^"]+)"/g)].map(([, href]) => href), OPERATIONS.map((o) => `${form}-${o}.html`), `${page}: four operation tabs of the same form`);
      assert.match(opTabs, new RegExp(`href="${page}" aria-current="page"`), `${page}: its operation tab is current`);
    }
  }
});

test("site/ is exactly what the page generator produces", async () => {
  const { buildPages } = await import("../scripts/build-pages.mjs");
  for (const [file, html] of Object.entries(buildPages())) {
    assert.equal(read(file), html, `${file} differs from scripts/build-pages.mjs: edit the generator and run npm run build`);
  }
});

test("the site title covers both fields: no «над 𝔽p» on level 1", () => {
  assert.match(read("index.html"), /<h1>Точки эллиптических кривых<\/h1>/, "the site also has pages over ℝ");
  for (const page of TOOL_PAGES) {
    assert.match(read(page), /<a href="index\.html">Точки эллиптических кривых<\/a>/, `${page}: crumbs name the site`);
  }
});

test("our stylesheet builds on the gateway tokens instead of redefining them", () => {
  const css = readFileSync(join(SITE, "css", "site.css"), "utf8");
  const ownTokens = [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(([, name]) => name);
  const coreTokens = ["--bg", "--surface", "--surface-2", "--text", "--muted", "--faint", "--border", "--border-strong", "--accent", "--accent-soft", "--blue", "--violet", "--red", "--warn", "--ok", "--shadow", "--radius", "--sans", "--serif", "--mono"];
  for (const token of coreTokens) {
    assert.ok(!ownTokens.includes(token), `site.css redefines core token ${token}: light/dark theme of the gateway would break`);
  }
  assert.doesNotMatch(css, /(^|\n|,)\s*\.gw-[a-z-]+[^{]*\{/, "own rules must not define gw- classes (PUBLISHING.md §3.5)");
  assert.doesNotMatch(css, /(^|\n)(body|html|\*,\*::before)[^{]*\{/, "global resets belong to the core stylesheet");
});

test("page.json is a valid gateway manifest with exactly the allowed fields", () => {
  const manifest = JSON.parse(readFileSync(join(SITE, "page.json"), "utf8"));
  const allowed = ["title", "description", "visibility", "created", "tags"];
  assert.deepEqual(Object.keys(manifest).filter((key) => !allowed.includes(key)), [], "an unknown field makes the page invisible (PUBLISHING.md §2)");
  assert.ok(manifest.title.length > 0 && manifest.title.length <= 200, "title: non-empty, ≤ 200 chars");
  assert.ok(manifest.description.length <= 1000, "description ≤ 1000 chars");
  assert.equal(manifest.visibility, "public", "the thesis tool is public, as it was on port 8083");
  assert.match(manifest.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/, "created: date, time and offset of the real first publication (PUBLISHING.md §2), never changed afterwards");
  assert.ok(manifest.tags.length <= 12 && manifest.tags.every((tag) => tag.length <= 40), "≤ 12 tags of ≤ 40 chars");
});

test("the landing page has no call-to-action buttons and no «без регистрации» line", () => {
  assert.match(read("index.html"), /class="card form-card"[\s\S]*class="card form-card"/, "two form cards, each listing its four tools");
  const html = read("index.html");
  assert.doesNotMatch(html, /class="actions"|btn-primary/, "hero buttons were removed: the tool cards below are the entry points");
  assert.doesNotMatch(html, /регистрац/i, "«без регистрации и установки» reads like an ad, not an academic page");
  assert.doesNotMatch(html, /О кривой диссертации/, "the «О кривой диссертации» block was removed");
});
