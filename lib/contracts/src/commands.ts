import type { Command } from "commander";
import type { z } from "zod";
import {
  loadRunJustifiedMachinery,
  loadRunReviewFindings,
  readYamlFile,
  validateOracleCaseOnDisk,
} from "./io.ts";
import { renderCycleAudit, renderGoAudit, renderSpec } from "./render.ts";
import {
  BuildReportSchema,
  ColdReadReportSchema,
  CycleAuditReportSchema,
  CycleCriticReportSchema,
  DoctrineReviewReportSchema,
  FixReportSchema,
  GoAuditReportSchema,
  GoCriticReportSchema,
  ReviewReportSchema,
} from "./report-schemas.ts";
import {
  validateColdRead,
  validateCycleAudit,
  validateCycleCritic,
  validateDoctrineReview,
  validateGoAudit,
  validateGoCritic,
} from "./report-validate.ts";
import { SpecSchema, type Spec, type ValidationIssue } from "./spec-schema.ts";
import { validateSpec } from "./spec-validate.ts";

const VALIDATE_KINDS = [
  "spec",
  "cold-read",
  "build",
  "go-critic",
  "review",
  "doctrine-review",
  "fix",
  "cycle-critic",
  "go-audit",
  "cycle-audit",
] as const;

type ValidateKind = (typeof VALIDATE_KINDS)[number];

const RENDER_KINDS = ["spec", "go-audit", "cycle-audit"] as const;

type RenderKind = (typeof RENDER_KINDS)[number];

const isValidateKind = (value: string): value is ValidateKind =>
  VALIDATE_KINDS.some((kind) => kind === value);

const isRenderKind = (value: string): value is RenderKind =>
  RENDER_KINDS.some((kind) => kind === value);

const formatZodPath = (pathParts: ReadonlyArray<PropertyKey>): string => {
  if (pathParts.length === 0) {
    return "(root)";
  }
  return pathParts
    .map((part, index) => {
      if (typeof part === "number") {
        return `[${part}]`;
      }
      const key = String(part);
      return index === 0 ? key : `.${key}`;
    })
    .join("");
};

const zodErrorToIssues = (error: z.ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    path: formatZodPath(issue.path),
    message: issue.message,
  }));

const printIssues = (issues: ReadonlyArray<ValidationIssue>): void => {
  for (const issue of issues) {
    console.error(`${issue.path}: ${issue.message}`);
  }
};

const loadSpecFile = (
  specPath: string,
): { ok: true; spec: Spec } | { ok: false; exitCode: 1 | 2 } => {
  const loaded = readYamlFile(specPath);
  if (!loaded.ok) {
    console.error(loaded.error);
    return { ok: false, exitCode: 2 };
  }

  const parsed = SpecSchema.safeParse(loaded.data);
  if (!parsed.success) {
    printIssues(zodErrorToIssues(parsed.error));
    return { ok: false, exitCode: 1 };
  }

  const issues = validateSpec(parsed.data);
  if (issues.length > 0) {
    printIssues(issues);
    return { ok: false, exitCode: 1 };
  }

  return { ok: true, spec: parsed.data };
};

export const cmdValidate = (
  rawKind: string,
  filePath: string,
  opts: { spec?: string; run?: string },
): number => {
  if (!isValidateKind(rawKind)) {
    console.error(
      `Unknown validate kind "${rawKind}". Expected one of: ${VALIDATE_KINDS.join(", ")}`,
    );
    return 2;
  }

  if ((rawKind === "cold-read" || rawKind === "go-audit") && opts.spec === undefined) {
    console.error(`--spec <spec.yaml> is required when validating "${rawKind}"`);
    return 2;
  }

  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    console.error(loaded.error);
    return 2;
  }

  if (rawKind === "spec") {
    const parsed = SpecSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }

    const issues = validateSpec(parsed.data);
    if (parsed.data.oracleCase !== undefined) {
      issues.push(...validateOracleCaseOnDisk(parsed.data.oracleCase));
    }

    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "cold-read") {
    if (opts.spec === undefined) {
      console.error('--spec <spec.yaml> is required when validating "cold-read"');
      return 2;
    }
    const specResult = loadSpecFile(opts.spec);
    if (!specResult.ok) {
      return specResult.exitCode;
    }

    const parsed = ColdReadReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }

    const issues = validateColdRead(parsed.data, specResult.spec);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "build") {
    const parsed = BuildReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "go-critic") {
    const parsed = GoCriticReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    const issues = validateGoCritic(parsed.data);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "review") {
    const parsed = ReviewReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "doctrine-review") {
    const parsed = DoctrineReviewReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    const issues = validateDoctrineReview(parsed.data);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "fix") {
    const parsed = FixReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "cycle-critic") {
    const parsed = CycleCriticReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    const issues = validateCycleCritic(parsed.data);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (rawKind === "go-audit") {
    if (opts.spec === undefined) {
      console.error('--spec <spec.yaml> is required when validating "go-audit"');
      return 2;
    }
    const specResult = loadSpecFile(opts.spec);
    if (!specResult.ok) {
      return specResult.exitCode;
    }

    const parsed = GoAuditReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }

    const issues = validateGoAudit(parsed.data, specResult.spec);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    console.log("OK");
    return 0;
  }

  let spec: Spec | undefined;
  if (opts.spec !== undefined) {
    const specResult = loadSpecFile(opts.spec);
    if (!specResult.ok) {
      return specResult.exitCode;
    }
    spec = specResult.spec;
  }

  let reviewFindings: Array<{ report: string; id: string; do: string }> = [];
  let justifiedMachinery: Array<{ report: string; file: string; symbol: string }> | undefined;
  if (opts.run !== undefined) {
    const runResult = loadRunReviewFindings(opts.run);
    if (!runResult.ok) {
      console.error(runResult.error);
      return 2;
    }
    reviewFindings = runResult.findings;

    const machineryResult = loadRunJustifiedMachinery(opts.run);
    if (!machineryResult.ok) {
      console.error(machineryResult.error);
      return 2;
    }
    justifiedMachinery = machineryResult.machinery;
  }

  const parsed = CycleAuditReportSchema.safeParse(loaded.data);
  if (!parsed.success) {
    printIssues(zodErrorToIssues(parsed.error));
    return 1;
  }

  const issues = validateCycleAudit(parsed.data, { spec, reviewFindings, justifiedMachinery });
  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }
  console.log("OK");
  return 0;
};

export const cmdRender = (rawKind: string, filePath: string): number => {
  if (!isRenderKind(rawKind)) {
    console.error(`Unknown render kind "${rawKind}". Expected one of: ${RENDER_KINDS.join(", ")}`);
    return 2;
  }

  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    console.error(loaded.error);
    return 2;
  }

  if (rawKind === "spec") {
    const parsed = SpecSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    const issues = validateSpec(parsed.data);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }
    process.stdout.write(renderSpec(parsed.data));
    return 0;
  }

  if (rawKind === "go-audit") {
    const parsed = GoAuditReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      printIssues(zodErrorToIssues(parsed.error));
      return 1;
    }
    process.stdout.write(renderGoAudit(parsed.data));
    return 0;
  }

  const parsed = CycleAuditReportSchema.safeParse(loaded.data);
  if (!parsed.success) {
    printIssues(zodErrorToIssues(parsed.error));
    return 1;
  }
  process.stdout.write(renderCycleAudit(parsed.data));
  return 0;
};

export const registerContractCommands = (program: Command): void => {
  program
    .command("validate")
    .description("Validate a spec or role report YAML file")
    .argument("<kind>", `Artifact kind (${VALIDATE_KINDS.join(" | ")})`)
    .argument("<file>", "Path to the YAML file to validate")
    .option("--spec <spec.yaml>", "Path to spec YAML for cross-checks")
    .option("--run <run-dir>", "Path to run directory containing review-*.yaml files")
    .action((kind: string, file: string, opts: { spec?: string; run?: string }) => {
      process.exitCode = cmdValidate(kind, file, opts);
    });

  program
    .command("render")
    .description("Validate and render a spec or audit YAML file as Markdown")
    .argument("<kind>", `Render kind (${RENDER_KINDS.join(" | ")})`)
    .argument("<file>", "Path to the YAML file to render")
    .action((kind: string, file: string) => {
      process.exitCode = cmdRender(kind, file);
    });
};
