import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../cli.ts";

test("greet_name", () => {
  const res = run(["greet", "Ada"]);
  assert.equal(res.exit, 0);
  assert.equal(res.out, "Hello, Ada!");
});

test("greet_missing", () => {
  const res = run(["greet"]);
  assert.equal(res.exit, 2);
  assert.equal(res.out, "usage: greet <name>");
});

test("list_json", () => {
  const res = run(["list", "--format", "json"]);
  assert.equal(res.exit, 0);
  assert.deepEqual(JSON.parse(res.out), ["apple", "cherry", "mango"]);
});

test("list_text", () => {
  const res = run(["list", "--format", "text"]);
  assert.equal(res.exit, 0);
  assert.equal(res.out, "apple\ncherry\nmango");
});
