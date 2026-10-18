import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("compose project has its own name so it never shares a project with other stacks on the host", () => {
  assert.match(
    read("deploy/docker-compose.yml"), /^name: maga-curve-web$/m,
    "without an explicit name compose uses the directory name 'deploy', which another stack (tk76-db) on the server already uses",
  );
});

test("deploy script never removes orphans: they may belong to another project", () => {
  const script = read("deploy/deploy.sh");
  assert.doesNotMatch(script, /--remove-orphans/, "--remove-orphans once deleted the foreign container tk76-db");
  assert.match(script, /docker compose -p maga-curve-web /, "every compose call must pin the project name");
});

test("the site is published on host port 8083", () => {
  assert.match(read("deploy/docker-compose.yml"), /"8083:80"/, "port 8083 is forwarded to 217.114.238.97:8083 on the router");
});
