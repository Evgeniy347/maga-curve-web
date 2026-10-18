import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montgomery, weierstrass } from "../site/js/curve.js";
import { inverse, mod } from "../site/js/field.js";

const read = (page) => readFileSync(new URL(`../site/${page}`, import.meta.url), "utf8");
const defaults = (html) => Object.fromEntries(
  [...html.matchAll(/name="(\w+)" value="(-?\d+)"/g)].map(([, name, value]) => [name, Number(value)]),
);

const montgomeryPage = defaults(read("montgomery-add.html"));
const weierstrassPage = defaults(read("weierstrass-add.html"));

test("Montgomery page opens on the curve of dlog-p29v2.md with P = (2, 11), Q = (7, 8)", () => {
  assert.deepEqual(
    montgomeryPage, { a: 6, b: 1, p: 29, px: 2, py: 11, qx: 7, qy: 8 },
    "defaults must be y² = x³ + 6x² + x over F_29 and the pair from п. 1.6.2 so the steps panel matches the manual run",
  );
});

test("Weierstrass page opens on the same curve via X = x + A/3", () => {
  const { p } = montgomeryPage;
  const A = montgomeryPage.a;
  const shift = mod(A * inverse(3, p), p);
  const a = mod(1 - A * A * inverse(3, p), p);
  const b = mod(2 * A ** 3 * inverse(27, p) - shift, p);
  assert.deepEqual(
    [weierstrassPage.a, weierstrassPage.b, weierstrassPage.p], [a, b, p],
    `By = 1 Montgomery y² = x³ + Ax² + x maps to y² = X³ + (1 − A²/3)X + (2A³/27 − A/3); for A = 6 over F_29 that is a = ${a}, b = ${b}`,
  );
  const toWeierstrass = ([x, y]) => [mod(x + shift, p), y];
  assert.deepEqual([weierstrassPage.px, weierstrassPage.py], toWeierstrass([montgomeryPage.px, montgomeryPage.py]), "P is the image of (2, 11)");
  assert.deepEqual([weierstrassPage.qx, weierstrassPage.qy], toWeierstrass([montgomeryPage.qx, montgomeryPage.qy]), "Q is the image of (7, 8)");
  const W = weierstrass({ a, b, p });
  const M = montgomery({ A, p });
  assert.equal(W.order(), M.order(), "isomorphic curves have the same #E = 40");
  assert.deepEqual(
    W.add([weierstrassPage.px, weierstrassPage.py], [weierstrassPage.qx, weierstrassPage.qy]),
    toWeierstrass(M.add([2, 11], [7, 8])),
    "the change of variables is a group isomorphism: R = (19, 5) maps to (21, 5)",
  );
});

test("the landing page links to the thesis curve page and plots the same sum", async () => {
  assert.match(read("index.html"), /<a href="montgomery-add\.html">Сложение над 𝔽<sub>p<\/sub><\/a>/, "the Montgomery card opens addition over Fp");
  const { THESIS_CURVE, THESIS_SUM } = await import("../site/js/forms.js");
  assert.deepEqual(
    [THESIS_CURVE.A, THESIS_CURVE.B, THESIS_CURVE.p, ...THESIS_SUM.P, ...THESIS_SUM.Q],
    [montgomeryPage.a, montgomeryPage.b, montgomeryPage.p, montgomeryPage.px, montgomeryPage.py, montgomeryPage.qx, montgomeryPage.qy],
    "the hero plot must show exactly the defaults of the Montgomery page",
  );
});

test("every example chip on every page leads to a sum that passes the on-curve check", async () => {
  const { REAL_MONTGOMERY_FORM, REAL_WEIERSTRASS_FORM, MONTGOMERY_FORM, WEIERSTRASS_FORM } = await import("../site/js/forms.js");
  const { snapToCurve, snapToRealCurve } = await import("../site/js/snap.js");
  const { additionStages } = await import("../site/js/steps.js");
  const { realAdditionStages } = await import("../site/js/real-steps.js");
  const forms = { montgomery: [MONTGOMERY_FORM, REAL_MONTGOMERY_FORM], weierstrass: [WEIERSTRASS_FORM, REAL_WEIERSTRASS_FORM] };
  for (const [name, [fieldForm, realForm]] of Object.entries(forms)) {
    for (const op of ["add", "reals-add"]) {
      const page = `${name}-${op}.html`;
      const chips = [...read(page).matchAll(/class="gw-chip" href="[^"?]+\?([^"]+)">([^<]+)</g)];
      assert.ok(chips.length >= 4, `${page} offers examples`);
      for (const [, query, label] of chips) {
        const v = Object.fromEntries(query.split("&amp;").map((pair) => pair.split("=")).map(([k, x]) => [k, Number(x)]));
        const real = op === "reals-add";
        const curve = real ? realForm.create(v) : fieldForm.create(v);
        const snap = real ? snapToRealCurve : snapToCurve;
        const P = snap(curve, [v.px, v.py], [v.px, v.py]);
        const Q = snap(curve, [v.qx, v.qy], [v.qx, v.qy]);
        assert.deepEqual([P, Q], [[v.px, v.py], [v.qx, v.qy]], `${page} «${label}»: example points must already lie on the curve, otherwise the chip highlights nothing`);
        const result = real ? realAdditionStages(curve, P, Q, realForm.names) : additionStages(curve, P, Q, fieldForm.names);
        if (result.check) assert.equal(result.check.holds, true, `${page} «${label}»: R must pass the on-curve check`);
      }
    }
  }
});
