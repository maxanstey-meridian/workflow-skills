import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { REPORT_SCHEMAS } from "../src/schema-registry.ts";
import { renderZodSchemaToYaml } from "../src/schema-render.ts";

describe("renderZodSchemaToYaml", () => {
  it("renders every registered report schema deterministically without throwing", () => {
    for (const [name, schema] of Object.entries(REPORT_SCHEMAS)) {
      const first = renderZodSchemaToYaml(name, schema);
      const second = renderZodSchemaToYaml(name, schema);
      assert.equal(first, second, `${name} rendered non-deterministically`);
      assert.ok(first.startsWith("```yaml\n# Strict YAML"), `${name} missing yaml fence`);
      assert.ok(first.endsWith("\n```"), `${name} missing closing fence`);
      assert.doesNotMatch(first, /9007199254740991/, `${name} leaked MAX_SAFE_INTEGER`);
    }
  });

  it("renders discriminated root unions with shared base fields compactly", () => {
    const schema = REPORT_SCHEMAS.BuildReportSchema;
    assert.ok(schema);
    const out = renderZodSchemaToYaml("BuildReportSchema", schema);
    assert.match(out, /# Variant 1 \(result: BUILT\):/);
    assert.match(out, /# Variant 2 \(result: STOPPED\):/);
    assert.match(out, /# Same base fields as Variant 1, with:/);
    assert.match(out, /stopReason: <non-empty string>/);
    assert.match(out, /exit: <integer>/);
  });

  it("expands AuditNeedSchema into both decision and action options with description", () => {
    const schema = REPORT_SCHEMAS.GoAuditReportSchema;
    assert.ok(schema);
    const out = renderZodSchemaToYaml("GoAuditReportSchema", schema);
    assert.match(out, /whatItIs: <non-empty string>/);
    assert.match(out, /options: # at least 2 items/);
    assert.match(out, /exactly one option with recommended: true/);
    assert.match(out, /rec: <non-empty string>/);
    assert.match(out, /status: done \| not-done \| needs-user/);
  });

  it("throws on an unrepresentable custom schema", () => {
    const BadSchema = z.strictObject({
      weird: z.custom<unknown>(),
    });
    assert.throws(() => renderZodSchemaToYaml("BadSchema", BadSchema), /Unsupported JSON Schema/);
  });
});
