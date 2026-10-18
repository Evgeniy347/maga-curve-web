import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
const PAGES = ["index.html", "montgomery-add.html", "modk-add.html", "reals-add.html", "reals-mul.html"];
const FIELD_PAGES = ["montgomery-add.html", "modk-add.html"];
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
    for (const { src } of scriptsOf(read(page))) {
      assert.doesNotThrow(
        () => readFileSync(join(SITE, src)),
        `${page} references ${src}, which is missing from site/: the page would render without its controller`,
      );
    }
  }
});

test("every page in site/ is listed, so the checks below cover all of them", () => {
  assert.deepEqual(
    filesUnder(SITE, ".html").map((file) => file.slice(SITE.length)).sort(), [...PAGES].sort(),
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
  const required = { "reals-add.html": ["a", "b", "px", "py", "qx", "qy", "rx", "ry"], "reals-mul.html": ["a", "b", "n", "px", "py", "qx", "qy"] };
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

test("every page is Russian, mobile-ready and shares one navigation that covers 𝔽p and ℝ", () => {
  const navOf = (html) => html.match(/<nav[\s\S]*?<\/nav>/)[0].replace(/ aria-current="page"/g, "");
  const reference = navOf(read("index.html"));
  for (const href of ["index.html", "montgomery-add.html", "modk-add.html", "reals-add.html", "reals-mul.html"]) {
    assert.match(reference, new RegExp(`href="${href}"`), `the menu must link to ${href}`);
  }
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<html lang="ru">/, `${page}: the site is Russian-only`);
    assert.match(html, /name="viewport"/, `${page}: without a viewport meta phones render the desktop layout at ~0.5 scale`);
    assert.match(html, /data-theme-toggle/, `${page}: dark theme is switched by a toggle in the top bar`);
    assert.equal(navOf(html), reference, `${page}: navigation differs from index.html`);
    assert.match(html, new RegExp(`href="${page}" aria-current="page"`), `${page}: its own menu item must be marked as current`);
    assert.doesNotMatch(html, /corbellini\.name\/ecc\/interactive\/(reals|modk-mul)/, `${page}: the menu leads to our own ℝ pages, not Corbellini's`);
  }
});

test("the landing page has no call-to-action buttons and no «без регистрации» line", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /class="actions"|btn-primary/, "hero buttons were removed: the tool cards below are the entry points");
  assert.doesNotMatch(html, /регистрац/i, "«без регистрации и установки» reads like an ad, not an academic page");
  assert.doesNotMatch(html, /О кривой диссертации/, "the «О кривой диссертации» block was removed");
});
