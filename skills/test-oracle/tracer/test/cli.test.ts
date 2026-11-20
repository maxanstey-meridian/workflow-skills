import { expect, test } from "bun:test";
import { run } from "../cli.ts";

test("greet.no-person.exit-2", () => {
  expect(run(["greet"])).toEqual({ exit: 2, out: "usage: greet <name>" });
});

test("greet.person.exit-0", () => {
  expect(run(["greet", "Ada"])).toEqual({ exit: 0, out: "Hello, Ada!" });
});

test("not-greet.list.no-format-or-format-not-in-formats.throws-undeclared-format-value", () => {
  expect(() => run(["list"])).toThrow(new Error("undeclared --format value: undefined"));
  expect(() => run(["list", "--format"])).toThrow(new Error("undeclared --format value: undefined"));
  expect(() => run(["list", "--format", "yaml"])).toThrow(new Error("undeclared --format value: yaml"));
});

test("not-greet.list.not-no-format-or-format-not-in-formats.format-json.exit-0", () => {
  expect(run(["list", "--format", "json"])).toEqual({ exit: 0, out: '["mango","apple","cherry"]' });
});

test("not-greet.list.not-no-format-or-format-not-in-formats.not-format-json.exit-0", () => {
  expect(run(["list", "--format", "text"])).toEqual({ exit: 0, out: "mango\napple\ncherry" });
});

test("not-greet.not-list.throws-undeclared-command", () => {
  expect(() => run(["frobnicate"])).toThrow(new Error("undeclared command: frobnicate"));
  expect(() => run([])).toThrow(new Error("undeclared command: undefined"));
});
