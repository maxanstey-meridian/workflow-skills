import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLintFinding, lintTestFile } from "../src/lint.ts";

describe("lintTestFile", () => {
  it("flags all 11 banned TS/Playwright cheats in browser mode", () => {
    const cases: Array<{ name: string; code: string; rule: string }> = [
      {
        name: ".first()",
        code: 'page.getByRole("button").first().click();',
        rule: "no-positional-first",
      },
      {
        name: ".last()",
        code: 'page.getByRole("button").last().click();',
        rule: "no-positional-last",
      },
      {
        name: ".nth()",
        code: 'page.getByRole("button").nth(0).click();',
        rule: "no-positional-nth",
      },
      { name: "force: true", code: "btn.click({ force: true });", rule: "no-force-true" },
      {
        name: "page.waitForTimeout",
        code: "await page.waitForTimeout(500);",
        rule: "no-wait-for-timeout",
      },
      {
        name: "bare waitForTimeout",
        code: "await waitForTimeout(500);",
        rule: "no-wait-for-timeout",
      },
      {
        name: "keyboard.press",
        code: 'await page.keyboard.press("Escape");',
        rule: "no-keyboard-press",
      },
      { name: ".skip", code: 'test.skip("a", () => {});', rule: "no-skip" },
      { name: ".only", code: 'test.only("a", () => {});', rule: "no-only" },
      { name: "test.fail", code: 'test.fail("a", () => {});', rule: "no-test-fail" },
      { name: "test.fixme", code: 'test.fixme("a", () => {});', rule: "no-fixme" },
      {
        name: 'toHaveAttribute("data-status", ...)',
        code: 'await expect(el).toHaveAttribute("data-status", "open");',
        rule: "no-data-attribute-assertion",
      },
      {
        name: "toHaveAttribute(`data-${name}`, ...)",
        code: "await expect(el).toHaveAttribute(`data-${name}`, 'open');",
        rule: "no-data-attribute-assertion",
      },
    ];

    for (const tc of cases) {
      const findings = lintTestFile("example.spec.ts", tc.code, {
        kind: "browser",
        allowKeyboard: false,
      });
      assert.ok(
        findings.some((f) => f.rule === tc.rule),
        `Expected ${tc.name} to trigger ${tc.rule}, got: ${JSON.stringify(findings)}`,
      );
    }
  });

  it("allows keyboard.press when allowKeyboard is true", () => {
    const findings = lintTestFile("example.spec.ts", 'await page.keyboard.press("Escape");', {
      kind: "browser",
      allowKeyboard: true,
    });
    assert.deepEqual(findings, []);
  });

  it("ignores browser-only cheats for non-browser kinds while still banning skip/only/fixme/fail", () => {
    const code = [
      "const x = list.first();",
      "const y = list.last();",
      "btn.click({ force: true });",
      "await page.waitForTimeout(100);",
      'await page.keyboard.press("Enter");',
      'test.skip("a", () => {});',
    ].join("\n");

    const cliFindings = lintTestFile("cli.test.ts", code, { kind: "cli" });
    assert.deepEqual(
      cliFindings.map((f) => f.rule),
      ["no-skip"],
    );

    const apiFindings = lintTestFile("api.test.ts", code, { kind: "api-contract" });
    assert.deepEqual(
      apiFindings.map((f) => f.rule),
      ["no-skip"],
    );
  });

  it("scopes checks by testName while still flagging suite-level skip/fixme and any .only", () => {
    const skipCode = [
      'test.describe.skip("suite", () => {',
      '  test("row_one", async () => {});',
      "});",
    ].join("\n");
    const skipFindings = lintTestFile("suite.spec.ts", skipCode, {
      kind: "browser",
      testName: "row_one",
    });
    assert.deepEqual(
      skipFindings.map((f) => f.rule),
      ["no-skip"],
    );

    const fixmeCode = [
      'test.describe.fixme("suite", () => {',
      '  test("row_one", async () => {});',
      "});",
    ].join("\n");
    const fixmeFindings = lintTestFile("suite.spec.ts", fixmeCode, {
      kind: "browser",
      testName: "row_one",
    });
    assert.deepEqual(
      fixmeFindings.map((f) => f.rule),
      ["no-fixme"],
    );

    // Cheats in another test are ignored when testName targets row_one, except .only
    const scopedCode = [
      'test("row_one", async () => { await expect(page).toHaveTitle("OK"); });',
      'test("row_two", async () => { await page.waitForTimeout(100); });',
    ].join("\n");
    assert.deepEqual(
      lintTestFile("scoped.spec.ts", scopedCode, { kind: "browser", testName: "row_one" }),
      [],
    );

    const onlyInOtherTest = [
      'test("row_one", async () => {});',
      'test.only("row_two", async () => {});',
    ].join("\n");
    const onlyFindings = lintTestFile("scoped.spec.ts", onlyInOtherTest, {
      kind: "browser",
      testName: "row_one",
    });
    assert.deepEqual(
      onlyFindings.map((f) => f.rule),
      ["no-only"],
    );
  });

  it("flags C# xUnit Skip attributes and ignores commented-out attributes", () => {
    const csCode = [
      '// [Fact(Skip = "line comment")]',
      '/* [Theory(Skip = "block comment")]',
      "   still in block comment */",
      'var s = "// not a comment";',
      '[Fact(Skip = "later")]',
      "public void TestOne() {}",
      '[Theory(DisplayName = "x", Skip = "also later")]',
      "public void TestTwo(int x) {}",
    ].join("\n");

    const findings = lintTestFile("ApiTests.cs", csCode, { kind: "api-contract" });
    assert.deepEqual(findings, [
      {
        file: "ApiTests.cs",
        line: 5,
        rule: "xunit-skip",
        detail: "xUnit Skip attribute is banned",
      },
      {
        file: "ApiTests.cs",
        line: 7,
        rule: "xunit-skip",
        detail: "xUnit Skip attribute is banned",
      },
    ]);
  });

  it("formats lint findings consistently", () => {
    assert.equal(
      formatLintFinding({
        file: "tests/a.spec.ts",
        line: 12,
        rule: "no-skip",
        detail: "test.skip is banned",
      }),
      "tests/a.spec.ts:12: [no-skip] test.skip is banned",
    );
  });
});
