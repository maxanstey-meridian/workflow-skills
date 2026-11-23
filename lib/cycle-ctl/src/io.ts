import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { loadRunReviewFindings, readYamlFile } from "../../contracts/src/io.ts";
import { GoAuditReportSchema, ReviewReportSchema } from "../../contracts/src/report-schemas.ts";
import {
  validateGoAudit,
  type CycleAuditReviewFindingRef,
} from "../../contracts/src/report-validate.ts";
import { SpecSchema, type Spec } from "../../contracts/src/spec-schema.ts";
import { validateSpec } from "../../contracts/src/spec-validate.ts";
import { CycleStateSchema, type CycleState } from "./state.ts";
import type { CycleEffects, RawReportEntry } from "./transition.ts";

const formatZodIssues = (error: z.ZodError): string[] =>
  error.issues.map((issue) => {
    const loc = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${loc}: ${issue.message}`;
  });

export const readListFile = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);
};

export const writeListFile = (filePath: string, lines: ReadonlyArray<string>): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  fs.writeFileSync(filePath, content, "utf8");
};

export const readState = (
  runDir: string,
): { ok: true; state: CycleState } | { ok: false; error: string } => {
  const statePath = path.join(runDir, "state.json");
  let content: string;
  try {
    content = fs.readFileSync(statePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${statePath}: ${message}` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to parse JSON in ${statePath}: ${message}` };
  }

  const parsed = CycleStateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid state.json: ${formatZodIssues(parsed.error).join("; ")}`,
    };
  }
  return { ok: true, state: parsed.data };
};

export const writeState = (runDir: string, state: CycleState): void => {
  fs.mkdirSync(runDir, { recursive: true });
  const statePath = path.join(runDir, "state.json");
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
};

export const readRawYamlEntry = (filePath: string): RawReportEntry => {
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }
  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    return { exists: true, parseError: loaded.error };
  }
  return { exists: true, raw: loaded.data };
};

export const loadSpecForCycle = (
  specPath: string,
):
  | { ok: true; spec: Spec }
  | { ok: false; kind: "io"; error: string }
  | { ok: false; kind: "validation"; issues: string[] } => {
  const loaded = readYamlFile(specPath);
  if (!loaded.ok) {
    return { ok: false, kind: "io", error: loaded.error };
  }

  const parsed = SpecSchema.safeParse(loaded.data);
  if (!parsed.success) {
    return { ok: false, kind: "validation", issues: formatZodIssues(parsed.error) };
  }

  const issues = validateSpec(parsed.data);
  if (issues.length > 0) {
    return {
      ok: false,
      kind: "validation",
      issues: issues.map((issue) => `${issue.path}: ${issue.message}`),
    };
  }

  return { ok: true, spec: parsed.data };
};

export const checkGoAuditForInit = (
  mainDir: string,
  specPath: string,
  spec: Spec,
): { ok: true } | { ok: false; reason: string; details: string[] } => {
  const specName = path.basename(specPath, ".yaml");
  const auditPath = path.join(mainDir, ".plans", "scratch", specName, "go", "audit.yaml");

  if (!fs.existsSync(auditPath)) {
    return { ok: true };
  }

  const loaded = readYamlFile(auditPath);
  if (!loaded.ok) {
    return {
      ok: false,
      reason: `Cannot start /cycle: unreadable /go audit at ${auditPath}`,
      details: [loaded.error],
    };
  }

  const parsed = GoAuditReportSchema.safeParse(loaded.data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `Cannot start /cycle: invalid /go audit at ${auditPath}`,
      details: formatZodIssues(parsed.error),
    };
  }

  const validationIssues = validateGoAudit(parsed.data, spec);
  if (validationIssues.length > 0) {
    return {
      ok: false,
      reason: `Cannot start /cycle: /go audit failed validation at ${auditPath}`,
      details: validationIssues.map((issue) => `${issue.path}: ${issue.message}`),
    };
  }

  const blockers: string[] = [];
  for (const decision of parsed.data.decisions) {
    if (decision.status === "not-built") {
      const note = decision.note !== undefined ? ` (${decision.note})` : "";
      blockers.push(`Decision ${decision.id} is not-built${note}`);
    }
  }
  for (const piece of parsed.data.pieces) {
    if (piece.status !== "done") {
      const note = piece.note !== undefined ? ` (${piece.note})` : "";
      blockers.push(`Piece ${piece.id} has status "${piece.status}"${note}`);
    }
  }
  for (const finding of parsed.data.findings) {
    blockers.push(`Open finding: ${finding.title}`);
  }

  if (blockers.length > 0) {
    return {
      ok: false,
      reason: `Cannot start /cycle over incomplete /go audit (${auditPath}); pass --allow-partial to override`,
      details: blockers,
    };
  }

  return { ok: true };
};

export const loadRunReports = (runDir: string): Map<string, RawReportEntry> => {
  const reports = new Map<string, RawReportEntry>();
  if (!fs.existsSync(runDir)) {
    return reports;
  }

  const entries = fs.readdirSync(runDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml") || entry.name === "slices.yaml") {
      continue;
    }
    reports.set(entry.name, readRawYamlEntry(path.join(runDir, entry.name)));
  }
  return reports;
};

export const loadReviewFindingsForAudit = (
  runDir: string,
  missedReports: ReadonlyArray<string>,
  reports: ReadonlyMap<string, RawReportEntry>,
): CycleAuditReviewFindingRef[] => {
  const hasMissedReview = missedReports.some(
    (name) => name.startsWith("review-") && name.endsWith(".yaml"),
  );
  if (!hasMissedReview) {
    const res = loadRunReviewFindings(runDir);
    if (res.ok) {
      return res.findings;
    }
  }

  const missedSet = new Set(missedReports);
  const findings: CycleAuditReviewFindingRef[] = [];
  const names = [...reports.keys()]
    .filter((name) => name.startsWith("review-") && name.endsWith(".yaml") && !missedSet.has(name))
    .sort();

  for (const name of names) {
    const entry = reports.get(name);
    if (entry === undefined || !entry.exists || "parseError" in entry) {
      continue;
    }
    const parsed = ReviewReportSchema.safeParse(entry.raw);
    if (!parsed.success) {
      continue;
    }
    for (const finding of parsed.data.findings) {
      findings.push({ report: name, id: finding.id, do: finding.do });
    }
  }
  return findings;
};

export const collectExistingFindingPaths = (
  repoRoot: string,
  reports: ReadonlyMap<string, RawReportEntry>,
): Set<string> => {
  const candidates = new Set<string>();
  for (const [name, entry] of reports.entries()) {
    if (!name.startsWith("review-") || !entry.exists || "parseError" in entry) {
      continue;
    }
    const parsed = ReviewReportSchema.safeParse(entry.raw);
    if (!parsed.success) {
      continue;
    }
    for (const finding of parsed.data.findings) {
      candidates.add(finding.file);
      for (const filePath of finding.files) {
        candidates.add(filePath);
      }
    }
  }

  const existing = new Set<string>();
  for (const relPath of candidates) {
    if (fs.existsSync(path.join(repoRoot, relPath))) {
      existing.add(relPath);
    }
  }
  return existing;
};

export const readGateLog = (runDir: string): string | null => {
  const logPath = path.join(runDir, "gate.log");
  if (!fs.existsSync(logPath)) {
    return null;
  }
  return fs.readFileSync(logPath, "utf8");
};

const formatTimestamp = (now: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const createRunDir = (mainDir: string): string => {
  const scratchDir = path.join(mainDir, ".plans", "scratch");
  fs.mkdirSync(scratchDir, { recursive: true });
  const baseName = `cycle-${formatTimestamp(new Date())}`;
  let candidate = path.join(scratchDir, baseName);
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(scratchDir, `${baseName}-${suffix}`);
    suffix += 1;
  }
  fs.mkdirSync(candidate, { recursive: true });
  return candidate;
};

export const writeStackLists = (
  runDir: string,
  stacks: {
    backend: ReadonlyArray<ReadonlyArray<string>>;
    frontend: ReadonlyArray<ReadonlyArray<string>>;
  },
): void => {
  for (let i = 0; i < stacks.backend.length; i += 1) {
    const list = stacks.backend[i];
    if (list !== undefined) {
      writeListFile(path.join(runDir, `stack-backend-${i + 1}.txt`), list);
    }
  }
  for (let i = 0; i < stacks.frontend.length; i += 1) {
    const list = stacks.frontend[i];
    if (list !== undefined) {
      writeListFile(path.join(runDir, `stack-frontend-${i + 1}.txt`), list);
    }
  }
};

export const syncSliceFiles = (
  runDir: string,
  slices: Readonly<Record<string, ReadonlyArray<string>>>,
): void => {
  const expectedNames = new Set<string>();
  for (const [id, files] of Object.entries(slices)) {
    const filename = `slice-${id}.txt`;
    expectedNames.add(filename);
    writeListFile(path.join(runDir, filename), files);
  }

  if (fs.existsSync(runDir)) {
    for (const entry of fs.readdirSync(runDir, { withFileTypes: true })) {
      if (entry.isFile() && /^slice-\d+\.txt$/.test(entry.name) && !expectedNames.has(entry.name)) {
        fs.rmSync(path.join(runDir, entry.name), { force: true });
      }
    }
  }
};

export const applyCycleEffects = (
  state: CycleState,
  effects: CycleEffects,
): { ok: true } | { ok: false; error: string } => {
  if (effects.writeSlices !== undefined) {
    syncSliceFiles(state.runDir, effects.writeSlices);
  }
  if (effects.writeStackFiles !== undefined) {
    writeStackLists(state.runDir, effects.writeStackFiles);
  }
  if (effects.writeMerges !== undefined) {
    const mergePath = path.join(state.runDir, `merged-${effects.writeMerges.round}.txt`);
    const lines = effects.writeMerges.merges.map(
      (m) => `slice-${m.from}.txt into slice-${m.into}.txt\n`,
    );
    fs.appendFileSync(mergePath, lines.join(""), "utf8");
  }
  if (effects.writeHitPaths !== undefined) {
    writeListFile(
      path.join(state.runDir, `hit-${effects.writeHitPaths.round}.txt`),
      effects.writeHitPaths.paths,
    );
  }
  if (effects.writeScope !== undefined) {
    writeListFile(path.join(state.runDir, "scope.txt"), effects.writeScope);
  }
  if (effects.writeLeftOut !== undefined) {
    writeListFile(path.join(state.runDir, "left-out.txt"), effects.writeLeftOut);
  }
  if (effects.writeFixedList !== undefined) {
    writeListFile(
      path.join(state.runDir, effects.writeFixedList.filename),
      effects.writeFixedList.paths,
    );
  }
  if (effects.renderReport !== undefined) {
    fs.writeFileSync(effects.renderReport.reportPath, effects.renderReport.markdown, "utf8");
  }
  if (effects.updateSpec !== undefined && state.specPath !== null) {
    const loaded = loadSpecForCycle(state.specPath);
    if (!loaded.ok) {
      const msg = loaded.kind === "io" ? loaded.error : loaded.issues.join("; ");
      return { ok: false, error: `Failed to reload spec for update: ${msg}` };
    }
    const updated: Spec = {
      ...loaded.spec,
      builtPieces: effects.updateSpec.builtPieces,
      status: effects.updateSpec.status ?? loaded.spec.status,
    };
    const issues = validateSpec(updated);
    if (issues.length > 0) {
      return {
        ok: false,
        error: `Updated spec failed validation: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
      };
    }
    fs.writeFileSync(state.specPath, YAML.stringify(updated, { lineWidth: 0 }), "utf8");
  }
  return { ok: true };
};
