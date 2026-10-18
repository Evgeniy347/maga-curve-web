import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the site is published as a gateway page, not as its own container", () => {
  for (const legacy of ["deploy/Dockerfile", "deploy/docker-compose.yml", "deploy/nginx.conf"]) {
    assert.equal(existsSync(new URL(`../${legacy}`, import.meta.url)), false, `${legacy} belongs to the old port-8083 container, which was removed`);
  }
  assert.match(read("deploy/publish.sh"), /FOLDER="users\/admin\/sites\/\$SLUG"\nTARGET="\/opt\/gateway\/\$FOLDER"/, "pages live in /opt/gateway/users/admin/sites/<slug>/ (PUBLISHING.md §1)");
});

test("publishing commits only our own folder and never touches the gateway core or container", () => {
  const script = read("deploy/publish.sh");
  assert.match(script, /git add '\$FOLDER'/, "only our folder is staged: other agents work in the same repository");
  assert.doesNotMatch(script, /git add -A|git add \.|--no-verify|GATEWAY_CORE_APPROVED|docker (compose|restart|stop|rm)/, "no core changes, no hook bypass, no container restarts (AGENTS.md)");
  assert.match(script, /! -name files/, "the files/ folder is outside git and must survive a redeploy (PUBLISHING.md §7)");
});

test("deploy = tests, then the plain publishing script", () => {
  const deploy = read("deploy/deploy.sh");
  assert.ok(deploy.indexOf("npm test") >= 0 && deploy.indexOf("npm test") < deploy.indexOf("deploy/publish.sh"), "red tests are never published");
  assert.doesNotMatch(read("deploy/publish.sh"), /npm test/, "publish.sh only publishes the ready pages: no build, no tests");
});

test("publishing runs the checks of PUBLISHING.md §5", () => {
  const script = read("deploy/publish.sh");
  assert.match(script, /http:\/\/127\.0\.0\.1:8082\/u\/admin\/\$SLUG\//, "the page answers 200");
  assert.match(script, /docker logs gateway --since 5m 2>&1 \| grep 'admin\/\$SLUG'/, "the gateway log has no complaint about the page");
});

test("only production files of the page are published", () => {
  const script = read("deploy/publish.sh");
  assert.match(script, /-name '\*\.html' -o -name '\*\.css' -o -name '\*\.js' -o -name 'page\.json'/, "whitelist: pages, styles, scripts and the manifest");
  assert.match(script, /cd site/, "files come from site/ only: tests, docs, design mockups and fixtures never reach the gateway");
});

test("publish refuses to overwrite foreign commits and checks the layout first", () => {
  const script = read("deploy/publish.sh");
  assert.ok(script.indexOf("node scripts/guard.mjs") < script.indexOf("tar -czf"), "the layout guard runs before anything is copied");
  assert.match(script, /MARKER="Published-From: maga-curve-web"/, "our gateway commits carry a Published-From trailer");
  assert.match(script, /\$MARKER \$SOURCE/, "the trailer names the source commit of this repository");
  assert.match(script, /grep -q '\^\$MARKER'/, "the last commit in the folder must be ours, otherwise someone else edited the page");
  assert.match(script, /--adopt/, "publishing over foreign edits needs an explicit --adopt after merging them into the sources");
  assert.match(read("deploy/deploy.sh"), /bash deploy\/publish\.sh "\$@"/, "deploy.sh forwards --adopt to publish.sh");
});
