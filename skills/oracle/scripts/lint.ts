import path from "node:path";
import ts from "typescript";
import { normaliseId, type OracleKind } from "./schema.ts";

export type LintOptions = {
  kind: OracleKind;
  allowKeyboard?: boolean;
  testName?: string;
};

export type LintFinding = {
  file: string;
  line: number;
  rule: string;
  detail: string;
};

const TS_JS_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const TEST_ROOT_NAMES = new Set(["test", "it", "describe", "suite", "t"]);

const scriptKindFor = (ext: string): ts.ScriptKind => {
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".jsx") return ts.ScriptKind.JSX;
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};

const rootIdentifierName = (expr: ts.Expression): string | null => {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return rootIdentifierName(expr.expression);
  return null;
};

const staticStringArg = (node: ts.Expression | undefined): string | null => {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
};

const startsWithDataPrefix = (node: ts.Expression | undefined): boolean => {
  if (!node) return false;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.startsWith("data-");
  }
  if (ts.isTemplateExpression(node)) {
    return node.head.text.startsWith("data-");
  }
  return false;
};

const isTestCallNode = (node: ts.Node): string | null => {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  let isTestCall = false;
  if (ts.isIdentifier(callee) && (callee.text === "test" || callee.text === "it")) {
    isTestCall = true;
  } else if (ts.isPropertyAccessExpression(callee)) {
    const root = rootIdentifierName(callee);
    if (
      (root === "test" || root === "it") &&
      (callee.name.text === "skip" ||
        callee.name.text === "only" ||
        callee.name.text === "fixme" ||
        callee.name.text === "fail")
    ) {
      isTestCall = true;
    }
  }
  if (!isTestCall) return null;
  return staticStringArg(node.arguments[0]);
};

const isKeyboardReceiver = (expr: ts.Expression): boolean => {
  if (ts.isIdentifier(expr) && expr.text === "keyboard") return true;
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === "keyboard") return true;
  return false;
};

const stripCSharpCommentsPreservingLines = (source: string): string => {
  let out = "";
  let i = 0;
  let inString = false;
  let inVerbatim = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inVerbatim) {
      out += ch;
      if (ch === '"' && next === '"') {
        out += next;
        i += 2;
        continue;
      }
      if (ch === '"') inVerbatim = false;
      i += 1;
      continue;
    }

    if (inString) {
      out += ch;
      if (ch === "\\" && next !== undefined) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }

    if (ch === "@" && next === '"') {
      inVerbatim = true;
      out += '@"';
      i += 2;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      if (i < source.length) {
        out += "  ";
        i += 2;
      }
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
};

const lintCSharpFile = (filePath: string, content: string): LintFinding[] => {
  const findings: LintFinding[] = [];
  const cleaned = stripCSharpCommentsPreservingLines(content);
  const pattern = /\[\s*(?:Fact|Theory)\s*\([^)]*\bSkip\s*=/g;

  for (const match of cleaned.matchAll(pattern)) {
    const index = match.index ?? 0;
    const line = cleaned.slice(0, index).split("\n").length;
    findings.push({
      file: filePath,
      line,
      rule: "xunit-skip",
      detail: "xUnit Skip attribute is banned",
    });
  }

  return findings;
};

export const lintTestFile = (
  filePath: string,
  content: string,
  options: LintOptions,
): LintFinding[] => {
  const ext = path.extname(filePath).toLowerCase();

  if (!TS_JS_EXTENSIONS.has(ext)) {
    return lintCSharpFile(filePath, content);
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(ext),
  );

  const targetNorm =
    options.testName !== undefined ? normaliseId(options.testName) : null;
  const findings: LintFinding[] = [];

  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const visit = (node: ts.Node, enclosingTestName: string | null): void => {
    const callTestName = isTestCallNode(node);
    const activeTestName = callTestName ?? enclosingTestName;

    const inScope =
      targetNorm === null ||
      activeTestName === null ||
      normaliseId(activeTestName) === targetNorm;

    if (ts.isCallExpression(node)) {
      const callee = node.expression;

      if (ts.isPropertyAccessExpression(callee)) {
        const prop = callee.name.text;
        const root = rootIdentifierName(callee);

        if (prop === "only" && root !== null && TEST_ROOT_NAMES.has(root)) {
          findings.push({
            file: filePath,
            line: lineOf(node),
            rule: "no-only",
            detail: `${callee.getText(sourceFile)} is banned`,
          });
        } else if (inScope) {
          if (prop === "skip" && root !== null && TEST_ROOT_NAMES.has(root)) {
            findings.push({
              file: filePath,
              line: lineOf(node),
              rule: "no-skip",
              detail: `${callee.getText(sourceFile)} is banned`,
            });
          } else if (
            prop === "fixme" &&
            (root === "test" || root === "it" || root === "describe")
          ) {
            findings.push({
              file: filePath,
              line: lineOf(node),
              rule: "no-fixme",
              detail: `${callee.getText(sourceFile)} is banned`,
            });
          } else if (prop === "fail" && (root === "test" || root === "it")) {
            findings.push({
              file: filePath,
              line: lineOf(node),
              rule: "no-test-fail",
              detail: `${callee.getText(sourceFile)} is banned`,
            });
          }

          if (options.kind === "browser") {
            if (prop === "first" || prop === "last" || prop === "nth") {
              findings.push({
                file: filePath,
                line: lineOf(node),
                rule: `no-positional-${prop}`,
                detail: `.${prop}() positional selector is banned in browser tests`,
              });
            } else if (prop === "waitForTimeout") {
              findings.push({
                file: filePath,
                line: lineOf(node),
                rule: "no-wait-for-timeout",
                detail: "waitForTimeout() is banned in browser tests",
              });
            } else if (
              prop === "toHaveAttribute" &&
              startsWithDataPrefix(node.arguments[0])
            ) {
              findings.push({
                file: filePath,
                line: lineOf(node),
                rule: "no-data-attribute-assertion",
                detail: 'toHaveAttribute("data-...", ...) is banned in browser tests',
              });
            } else if (
              prop === "press" &&
              isKeyboardReceiver(callee.expression) &&
              options.allowKeyboard !== true
            ) {
              findings.push({
                file: filePath,
                line: lineOf(node),
                rule: "no-keyboard-press",
                detail:
                  "keyboard.press() is banned unless the locked row sets allowKeyboard: true",
              });
            }
          }
        }
      } else if (
        inScope &&
        options.kind === "browser" &&
        ts.isIdentifier(callee) &&
        callee.text === "waitForTimeout"
      ) {
        findings.push({
          file: filePath,
          line: lineOf(node),
          rule: "no-wait-for-timeout",
          detail: "waitForTimeout() is banned in browser tests",
        });
      }
    } else if (
      inScope &&
      options.kind === "browser" &&
      ts.isPropertyAssignment(node)
    ) {
      const propName =
        ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
          ? node.name.text
          : null;
      if (
        propName === "force" &&
        node.initializer.kind === ts.SyntaxKind.TrueKeyword
      ) {
        findings.push({
          file: filePath,
          line: lineOf(node),
          rule: "no-force-true",
          detail: "{ force: true } is banned in browser tests",
        });
      }
    }

    ts.forEachChild(node, (child) => visit(child, activeTestName));
  };

  visit(sourceFile, null);
  return findings;
};

export const formatLintFinding = (finding: LintFinding): string =>
  `${finding.file}:${finding.line}: [${finding.rule}] ${finding.detail}`;
