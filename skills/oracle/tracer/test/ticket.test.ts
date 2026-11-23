import assert from "node:assert/strict";
import { test } from "node:test";
import { type Action, decide, type Status } from "../ticket.ts";

const assertRefused = (status: Status, action: Action): void => {
  const res = decide(status, action);
  if (res.ok) {
    assert.fail(`expected ${status}_${action} to be refused, got next=${res.next}`);
  }
  assert.ok(res.reason.length > 0, `expected refusal reason for ${status}_${action}`);
};

test("open_pause", () => {
  assert.deepEqual(decide("open", "pause"), { ok: true, next: "paused" });
});

test("open_resume", () => {
  assertRefused("open", "resume");
});

test("open_close", () => {
  assert.deepEqual(decide("open", "close"), { ok: true, next: "closed" });
});

test("paused_pause", () => {
  assertRefused("paused", "pause");
});

test("paused_resume", () => {
  assert.deepEqual(decide("paused", "resume"), { ok: true, next: "open" });
});

test("paused_close", () => {
  assert.deepEqual(decide("paused", "close"), { ok: true, next: "closed" });
});

test("closed_pause", () => {
  assertRefused("closed", "pause");
});

test("closed_resume", () => {
  assertRefused("closed", "resume");
});

test("closed_close", () => {
  assertRefused("closed", "close");
});
