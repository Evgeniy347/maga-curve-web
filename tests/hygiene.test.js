import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));

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

test("site sources carry no comments: explanations live in tests and docs/", () => {
  const offenders = filesUnder(join(SITE, "js"), ".js").filter((file) => {
    const code = stripStrings(readFileSync(file, "utf8"));
    return /(^|[^:\\])\/\/|\/\*/.test(code);
  });
  assert.deepEqual(offenders, [], `comments found in ${offenders.join(", ")}; see docs/код-и-тесты.md`);
});

test("every page loads only modules that exist", () => {
  for (const page of filesUnder(SITE, ".html")) {
    const html = readFileSync(page, "utf8");
    for (const [, src] of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
      if (/^https?:/.test(src)) continue;
      assert.doesNotThrow(
        () => readFileSync(join(SITE, src)),
        `${page} references ${src}, which is missing from site/: the page would render without its controller`,
      );
    }
  }
});

test("every page has the inputs the addition controller reads", () => {
  for (const page of filesUnder(SITE, "-add.html")) {
    const html = readFileSync(page, "utf8");
    for (const name of ["p", "px", "py", "qx", "qy", "rx", "ry"]) {
      assert.match(html, new RegExp(`name="${name}"`), `${page} lacks input name="${name}" required by AdditionPage`);
    }
    for (const cls of ["curve-equation", "field-order", "curve-order", "curve-singular-warning", "composite-warning"]) {
      assert.match(html, new RegExp(`class="[^"]*\\b${cls}\\b`), `${page} lacks .${cls}, AdditionPage.render writes into it`);
    }
  }
});

test("every site module parses and loads outside the browser", async () => {
  for (const file of filesUnder(join(SITE, "js"), ".js")) {
    await assert.doesNotReject(import(pathToFileURL(file).href), `${file} fails to load: syntax error or top-level DOM access`);
  }
});

test("every page links to the project repository on GitHub", () => {
  for (const page of filesUnder(SITE, "-add.html")) {
    assert.match(
      readFileSync(page, "utf8"), /href="https:\/\/github\.com\/Evgeniy347\/maga-curve-web"/,
      `${page} must link to github.com/Evgeniy347/maga-curve-web so readers find the source`,
    );
  }
});

const PAGES = ["index.html", "montgomery-add.html", "modk-add.html"];

test("the word «игрушечная» is gone from every page: the thesis curve is not called a toy", () => {
  for (const page of PAGES) {
    assert.doesNotMatch(readFileSync(join(SITE, page), "utf8"), /грушечн/i, `${page} still calls the thesis curve «игрушечная»`);
  }
});

test("every page is Russian, mobile-ready and shares one navigation", () => {
  const navOf = (html) => [...html.matchAll(/<nav[\s\S]*?<\/nav>/g)][0][0].replace(/ aria-current="page"/g, "");
  const reference = navOf(readFileSync(join(SITE, PAGES[0]), "utf8"));
  for (const page of PAGES) {
    const html = readFileSync(join(SITE, page), "utf8");
    assert.match(html, /<html lang="ru">/, `${page}: the site is Russian-only`);
    assert.match(html, /name="viewport"/, `${page}: without a viewport meta phones render the desktop layout at ~0.5 scale`);
    assert.match(html, /data-theme-toggle/, `${page}: dark theme is switched by a toggle in the top bar`);
    assert.equal(navOf(html), reference, `${page}: navigation differs from index.html`);
    assert.doesNotMatch(html, /reals-add|reals-mul|modk-mul/, `${page}: links to Corbellini's ℝ and multiplication pages were removed from the menu`);
  }
});
