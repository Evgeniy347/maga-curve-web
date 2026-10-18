import { test } from "node:test";
import assert from "node:assert/strict";
import { inverse, isPrime, mod } from "../site/js/field.js";

test("mod always lands in [0, p) so negative differences wrap like −11 + 29 = 18", () => {
  assert.equal(mod(-11, 29), 18, "the manual run reduces −11 to 18 by adding 29 once");
  assert.equal(mod(-49, 29), 9, "−49 needs two additions of 29: −49 + 58 = 9");
  assert.equal(mod(136, 29), 20, "136 = 4·29 + 20");
});

test("inverse matches the full table of inverses mod 29 from the manual run", () => {
  const table = [1, 15, 10, 22, 6, 5, 25, 11, 13, 3, 8, 17, 9, 27, 2, 20, 12, 21, 26, 16, 18, 4, 24, 23, 7, 19, 14, 28];
  table.forEach((expected, index) => {
    const a = index + 1;
    assert.equal(inverse(a, 29), expected, `${a}⁻¹ mod 29 must be ${expected}: ${a}·${expected} ≡ 1 (mod 29)`);
  });
});

test("inverse is null when gcd(a, p) ≠ 1, so a composite p cannot silently fake a division", () => {
  assert.equal(inverse(0, 29), null, "0 has no inverse in any field");
  assert.equal(inverse(6, 15), null, "gcd(6, 15) = 3, there is no 6⁻¹ mod 15");
});

test("isPrime separates the primes the page accepts from composites it warns about", () => {
  assert.deepEqual([2, 3, 29, 97].map(isPrime), [true, true, true, true], "2, 3, 29, 97 are prime");
  assert.deepEqual([0, 1, 15, 91].map(isPrime), [false, false, false, false], "0, 1, 15 = 3·5, 91 = 7·13 are not prime");
});
