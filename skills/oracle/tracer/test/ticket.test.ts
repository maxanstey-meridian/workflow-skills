import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../ticket.ts";

test("open_pause", () => {
  assert.deepEqual(decide("open", "pause"), { ok: true, next: "paused" });
});

test("open_resume", () => {
  assert.deepEqual(decide("open", "resume"), {
    ok: false,
    reason: "ticket is already open",
  });
});

test("open_close", () => {
  assert.deepEqual(decide("open", "close"), { ok: true, next: "closed" });
});

test("paused_pause", () => {
  assert.deepEqual(decide("paused", "pause"), {
    ok: false,
    reason: "ticket is paused",
  });
});

test("paused_resume", () => {
  assert.deepEqual(decide("paused", "resume"), { ok: true, next: "open" });
});

test("paused_close", () => {
  assert.deepEqual(decide("paused", "close"), { ok: true, next: "closed" });
});

test("closed_pause", () => {
  assert.deepEqual(decide("closed", "pause"), {
    ok: false,
    reason: "ticket is already closed",
  });
});

test("closed_resume", () => {
  assert.deepEqual(decide("closed", "resume"), {
    ok: false,
    reason: "ticket is already closed",
  });
});

test("closed_close", () => {
  assert.deepEqual(decide("closed", "close"), {
    ok: false,
    reason: "ticket is already closed",
  });
});
