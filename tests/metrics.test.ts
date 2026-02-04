import test from "node:test";
import assert from "node:assert";

function completion(promised: number, reported: number) {
  return promised === 0 ? 0 : (reported * 100) / promised;
}

test("completion with zero promised", () => {
  assert.strictEqual(completion(0, 10), 0);
});

test("completion basic", () => {
  assert.strictEqual(completion(100, 50), 50);
  assert.strictEqual(completion(100, 120), 120);
});
