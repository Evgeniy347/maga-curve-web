import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
const VOID = new Set(["meta", "link", "br", "img", "input", "hr", "source", "path", "circle", "rect", "line"]);

function attribute(attributes, name) {
  return attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function classes(attributes) {
  return (attribute(attributes, "class") ?? "").split(/\s+/).filter(Boolean);
}

function textOf(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function children(html) {
  const result = [];
  let depth = 0;
  let current = null;
  for (const match of html.matchAll(TAG)) {
    const [whole, closing, tag, attributes, selfClosing] = match;
    if (closing) {
      depth -= 1;
      if (depth === 0 && current) {
        current.inner = html.slice(current.innerStart, match.index);
        result.push(current);
        current = null;
      }
      continue;
    }
    if (selfClosing || VOID.has(tag.toLowerCase())) {
      if (depth === 0) result.push({ tag, attributes, inner: "" });
      continue;
    }
    if (depth === 0) current = { tag, attributes, innerStart: match.index + whole.length };
    depth += 1;
  }
  return result;
}

function mainOf(html) {
  const open = html.match(/<main\b([^>]*)>/);
  if (!open) return null;
  const start = open.index + open[0].length;
  return { attributes: open[1], inner: html.slice(start, html.lastIndexOf("</main>")) };
}

export function checkPage(name, html) {
  const problems = [];
  const fail = (message) => problems.push(`${name}: ${message}`);
  if (!/<body>\n<main\b/.test(html)) fail("<main> must follow <body> directly: the server injects the site header after <body>");
  const main = mainOf(html);
  if (!main) return [`${name}: no <main>`];
  if (attribute(main.attributes, "id") !== "main" || !classes(main.attributes).includes("gw-wrap")) fail('main must be <main id="main" class="gw-wrap">');
  const blocks = children(main.inner);
  const [head, ...rest] = blocks;
  if (!head || head.tag !== "section" || !classes(head.attributes).includes("gw-page-head")) {
    fail(`the first element of main must be section.gw-page-head (crumbs + section title), found <${head?.tag} class="${attribute(head?.attributes ?? "", "class")}">`);
    return problems;
  }
  const [crumbs, ...headRest] = children(head.inner);
  if (!crumbs || crumbs.tag !== "nav" || !classes(crumbs.attributes).includes("gw-crumbs")) {
    fail("breadcrumbs nav.gw-crumbs must be the first line of gw-page-head — nothing above the crumbs");
  } else {
    if (attribute(crumbs.attributes, "aria-label") !== "Путь") fail('crumbs need aria-label="Путь"');
    const items = [...crumbs.inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, item]) => item);
    if (!/^<a href="\/">Новости<\/a>$/.test(items[0] ?? "")) fail('the first crumb must be <a href="/">Новости</a>');
    if (!/^<span aria-current="page">/.test(items.at(-1) ?? "")) fail('the last crumb must be the current page: <span aria-current="page">');
    if (items.slice(0, -1).some((item) => !/^<a href="[^"]+">/.test(item))) fail("every crumb except the last must be a link");
    if ((crumbs.inner.match(/aria-current/g) ?? []).length !== 1) fail("exactly one crumb is current");
  }
  if (!headRest.some((block) => block.tag === "h1")) fail("gw-page-head must contain the section title <h1>");
  const tabs = [];
  for (const block of rest) {
    if (block.tag === "nav" && classes(block.attributes).includes("gw-tabs")) tabs.push(block);
    else break;
  }
  if (rest.slice(tabs.length).some((block) => block.tag === "nav" && classes(block.attributes).includes("gw-tabs"))) {
    fail("tabs must come right after gw-page-head, before any content");
  }
  for (const nav of tabs) {
    const links = [...nav.inner.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => attributes);
    if (links.length < 2) fail(`tab row «${attribute(nav.attributes, "aria-label")}» needs at least two tabs`);
    if (links.some((attributes) => !classes(attributes).includes("gw-tab"))) fail("every tab link needs class gw-tab");
    const current = links.filter((attributes) => /aria-current="(page|true)"/.test(attributes));
    if (current.length !== 1) fail(`tab row «${attribute(nav.attributes, "aria-label")}» must mark exactly one current tab, found ${current.length}`);
    if (!attribute(nav.attributes, "aria-label")) fail("every tab row needs an aria-label");
  }
  if (tabs.length) {
    const lastCrumb = textOf(crumbs?.inner.match(/<span aria-current="page">([\s\S]*?)<\/span>/)?.[1] ?? "");
    const lastTabs = tabs.at(-1).inner.match(/<a\b[^>]*aria-current="(?:page|true)"[^>]*>([\s\S]*?)<\/a>/)?.[1];
    const title = textOf(headRest.find((block) => block.tag === "h1")?.inner ?? "");
    if (lastTabs !== undefined && textOf(lastTabs) !== lastCrumb && title !== lastCrumb) {
      fail(`the last crumb «${lastCrumb}» must name the current page «${title}» or the open tab «${textOf(lastTabs)}»`);
    }
  }
  if (/class="chip"|class="chip /.test(html)) fail("example buttons use the core chip class gw-chip");
  if (/class="(subnav|sitenav|form-tab)\b/.test(html)) fail("own navigation classes are not allowed: use gw-tabs/gw-tab");
  return problems;
}

export function checkSite(dir = SITE) {
  return readdirSync(dir).filter((file) => file.endsWith(".html")).flatMap((file) => checkPage(file, readFileSync(join(dir, file), "utf8")));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkSite();
  if (problems.length) {
    console.error(`guard: ${problems.length} нарушени(й) правил шапки gateway (PUBLISHING.md §3):`);
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    process.exit(1);
  }
  console.log("guard: шапка всех страниц по правилам gateway — крошки → заголовок раздела → вкладки → содержимое");
}
