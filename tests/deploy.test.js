import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the site is published as a gateway page, not as its own container", () => {
  for (const legacy of ["deploy/Dockerfile", "deploy/docker-compose.yml", "deploy/nginx.conf"]) {
    assert.equal(existsSync(new URL(`../${legacy}`, import.meta.url)), false, `${legacy} belongs to the old port-8083 container, which was removed`);
  }
  assert.match(read("deploy/deploy.sh"), /TARGET="\/opt\/gateway\/users\/admin\/sites\/\$SLUG"/, "pages live in /opt/gateway/users/admin/sites/<slug>/ (PUBLISHING.md §1)");
});

test("publishing commits only our own folder and never touches the gateway core or container", () => {
  const script = read("deploy/deploy.sh");
  assert.match(script, /git add 'users\/admin\/sites\/\$SLUG'/, "only our folder is staged: other agents work in the same repository");
  assert.doesNotMatch(script, /git add -A|git add \.|--no-verify|GATEWAY_CORE_APPROVED|docker (compose|restart|stop|rm)/, "no core changes, no hook bypass, no container restarts (AGENTS.md)");
  assert.match(script, /! -name files/, "the files/ folder is outside git and must survive a redeploy (PUBLISHING.md §7)");
});

test("publishing runs the checks of PUBLISHING.md §5", () => {
  const script = read("deploy/deploy.sh");
  assert.match(script, /npm test/, "red tests are never published");
  assert.match(script, /http:\/\/127\.0\.0\.1:8082\/u\/admin\/\$SLUG\//, "the page answers 200");
  assert.match(script, /docker logs gateway --since 5m 2>&1 \| grep 'admin\/\$SLUG'/, "the gateway log has no complaint about the page");
});
