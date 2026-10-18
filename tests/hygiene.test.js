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
      assert.match(html, new RegExp(`class="${cls}"`), `${page} lacks .${cls}, AdditionPage.render writes into it`);
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
