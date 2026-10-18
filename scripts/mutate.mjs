import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const WORK = join(ROOT, "tmp", "mutation");
const LIMIT = Number(process.env.MUTANTS ?? 120);
const ENTRY_POINTS = new Set(["landing.js", "modk-add.js", "montgomery-add.js", "montgomery-mul.js", "reals-add.js", "reals-mul.js"]);
const OPERATORS = [
  [" + ", " - "], [" - ", " + "], [" * ", " / "], [" < ", " <= "], [" <= ", " < "], [" > ", " >= "], [" >= ", " > "],
  [" === ", " !== "], [" !== ", " === "], [" && ", " || "], [" || ", " && "], ["% p", "% (p + 1)"], ["return true", "return false"],
];

function maskStrings(line) {
  return line.replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/[^/\n]+\/[gimsuy]*(?=[.,)\s;])/g, (m) => " ".repeat(m.length));
}

function mutantsOf(file, source) {
  const result = [];
  source.split("\n").forEach((line, index) => {
    const masked = maskStrings(line);
    for (const [from, to] of OPERATORS) {
      let at = masked.indexOf(from);
      while (at !== -1) {
        result.push({ file, line: index + 1, from, to, at, original: line.trim() });
        at = masked.indexOf(from, at + from.length);
      }
    }
  });
  return result;
}

function spread(list, count) {
  if (list.length <= count) return list;
  const step = list.length / count;
  return Array.from({ length: count }, (_, i) => list[Math.floor(i * step)]);
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
for (const part of ["site", "tests", "deploy", "package.json"]) cpSync(join(ROOT, part), join(WORK, part), { recursive: true });

const baseline = spawnSync(process.execPath, ["--test"], { cwd: WORK, timeout: 120000, encoding: "utf8" });
if (baseline.status !== 0) {
  console.error("baseline: tests fail without any mutation, the run would count every mutant as killed");
  console.error(baseline.stdout.split(/\r?\n/).filter((line) => line.includes("✖")).slice(0, 10).join("\n"));
  process.exit(1);
}

const files = readdirSync(join(WORK, "site", "js")).filter((name) => name.endsWith(".js") && !ENTRY_POINTS.has(name));
const all = files.flatMap((name) => mutantsOf(name, readFileSync(join(WORK, "site", "js", name), "utf8")));
const chosen = spread(all, LIMIT);
console.log(`mutants: ${all.length} candidates, running ${chosen.length}`);

const survivors = [];
let killed = 0;
for (const mutant of chosen) {
  const path = join(WORK, "site", "js", mutant.file);
  const source = readFileSync(path, "utf8");
  const lines = source.split("\n");
  const line = lines[mutant.line - 1];
  lines[mutant.line - 1] = line.slice(0, mutant.at) + mutant.to + line.slice(mutant.at + mutant.from.length);
  writeFileSync(path, lines.join("\n"));
  const run = spawnSync(process.execPath, ["--test"], { cwd: WORK, timeout: 60000, encoding: "utf8" });
  writeFileSync(path, source);
  if (run.status === 0) survivors.push(mutant);
  else killed += 1;
  process.stdout.write(run.status === 0 ? "S" : ".");
}

console.log(`\nkilled ${killed}/${chosen.length} (${((100 * killed) / chosen.length).toFixed(1)}%), survived ${survivors.length}`);
for (const s of survivors) console.log(`SURVIVED ${s.file}:${s.line}  "${s.from.trim()}" → "${s.to.trim()}"  | ${s.original}`);
rmSync(WORK, { recursive: true, force: true });
