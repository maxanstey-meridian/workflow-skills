import { z } from "zod";
import { DecisionIdSchema, PieceIdSchema } from "./spec-schema.ts";

export const FindingIdSchema = z.string().regex(/^F\d+$/);
export const AttemptSchema = z.union([z.literal(1), z.literal(2)]);
export type Attempt = z.infer<typeof AttemptSchema>;

export const CommandRunSchema = z
  .object({
    cmd: z.string().min(1),
    exit: z.number().int(),
    note: z.string().min(1).optional(),
  })
  .strict();
export type CommandRun = z.infer<typeof CommandRunSchema>;

export const AuditCommandRunSchema = z
  .object({
    cmd: z.string().min(1),
    exit: z.number().int(),
    note: z.string().min(1).optional(),
    pieces: z.array(PieceIdSchema).optional(),
  })
  .strict();
export type AuditCommandRun = z.infer<typeof AuditCommandRunSchema>;

export const NotRunSchema = z
  .object({
    check: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
export type NotRun = z.infer<typeof NotRunSchema>;

export const ColdReadFindingSchema = z
  .object({
    section: z.string().min(1),
    quote: z.string().min(1),
    detail: z.string().min(1),
    file: z.string().min(1).optional(),
    symbol: z.string().min(1).optional(),
  })
  .strict();
export type ColdReadFinding = z.infer<typeof ColdReadFindingSchema>;

export const ColdReadLawSchema = z.discriminatedUnion("status", [
  z
    .object({
      decisionId: DecisionIdSchema,
      status: z.literal("kept"),
      lawPath: z.string().min(1),
      keptBy: z.string().min(1),
    })
    .strict(),
  z
    .object({
      decisionId: DecisionIdSchema,
      status: z.literal("broken"),
      lawPath: z.string().min(1),
      findingIndex: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      decisionId: DecisionIdSchema,
      status: z.literal("none-bears"),
    })
    .strict(),
]);
export type ColdReadLaw = z.infer<typeof ColdReadLawSchema>;

export const ColdReadReportSchema = z
  .object({
    findings: z.array(ColdReadFindingSchema).default([]),
    laws: z.array(ColdReadLawSchema),
  })
  .strict();
export type ColdReadReport = z.infer<typeof ColdReadReportSchema>;

const BuildChangedSchema = z
  .object({
    path: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict();

const BuildDecisionSchema = z
  .object({
    id: DecisionIdSchema,
    summary: z.string().min(1),
  })
  .strict();

const buildReportBaseFields = {
  piece: PieceIdSchema,
  attempt: AttemptSchema,
  changed: z.array(BuildChangedSchema).default([]),
  decisionsBuilt: z.array(BuildDecisionSchema).default([]),
  ran: z.array(CommandRunSchema).default([]),
  notRun: z.array(NotRunSchema).default([]),
  notBuilt: z.array(z.string().min(1)).default([]),
};

export const BuildReportSchema = z.discriminatedUnion("result", [
  z
    .object({
      ...buildReportBaseFields,
      result: z.literal("BUILT"),
    })
    .strict(),
  z
    .object({
      ...buildReportBaseFields,
      result: z.literal("STOPPED"),
      stopReason: z.string().min(1),
    })
    .strict(),
]);
export type BuildReport = z.infer<typeof BuildReportSchema>;

export const GoCriticReportSchema = z
  .object({
    piece: PieceIdSchema,
    attempt: AttemptSchema,
    ran: z.array(CommandRunSchema).default([]),
    notRun: z.array(NotRunSchema).default([]),
    missing: z.array(z.string().min(1)).default([]),
    extra: z.array(z.string().min(1)).default([]),
    misunderstood: z.array(z.string().min(1)).default([]),
    shrunkCheck: z.array(z.string().min(1)).default([]),
    unproven: z.array(z.string().min(1)).default([]),
    verdict: z.enum(["PASS", "FAIL"]),
  })
  .strict();
export type GoCriticReport = z.infer<typeof GoCriticReportSchema>;

export const ReviewFindingSchema = z
  .object({
    id: FindingIdSchema,
    file: z.string().min(1),
    line: z.number().int().min(1),
    rule: z.string().min(1).optional(),
    problem: z.string().min(1),
    harm: z.string().min(1),
    fix: z.string().min(1),
    files: z.array(z.string().min(1)).min(1),
    do: z.enum(["fix", "park", "ask", "nit"]),
  })
  .strict();
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const ReviewFileReadSchema = z
  .object({
    path: z.string().min(1),
    mode: z.enum(["full", "diff"]),
  })
  .strict();
export type ReviewFileRead = z.infer<typeof ReviewFileReadSchema>;

export const ReviewReportSchema = z
  .object({
    findings: z.array(ReviewFindingSchema).default([]),
    filesRead: z.array(ReviewFileReadSchema).min(1),
  })
  .strict();
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

export const FixResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      findingId: FindingIdSchema,
      report: z.string().min(1),
      status: z.literal("FIXED"),
      change: z.string().min(1),
      check: z.string().min(1).optional(),
    })
    .strict(),
  z
    .object({
      findingId: FindingIdSchema,
      report: z.string().min(1),
      status: z.literal("NOT_FOUND"),
      read: z.string().min(1),
    })
    .strict(),
  z
    .object({
      findingId: FindingIdSchema,
      report: z.string().min(1),
      status: z.literal("NEEDS_CALL"),
      read: z.string().min(1),
      options: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      findingId: FindingIdSchema,
      report: z.string().min(1),
      status: z.literal("OUT_OF_SLICE"),
      read: z.string().min(1),
      outsideSlice: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);
export type FixResult = z.infer<typeof FixResultSchema>;

export const FixReportSchema = z
  .object({
    results: z.array(FixResultSchema).default([]),
    changedFiles: z.array(z.string().min(1)).default([]),
    notRun: z.array(NotRunSchema).default([]),
  })
  .strict();
export type FixReport = z.infer<typeof FixReportSchema>;

export const CycleCriticFindingSchema = z
  .object({
    findingId: FindingIdSchema,
    report: z.string().min(1),
    verdict: z.enum([
      "FIXED",
      "NOT_FOUND_AGREED",
      "STILL_THERE",
      "NOT_A_HARM",
      "EXTRA",
      "WRONG",
      "MISSING",
    ]),
    detail: z.string().min(1),
  })
  .strict();
export type CycleCriticFinding = z.infer<typeof CycleCriticFindingSchema>;

export const CycleCriticSpecBrokenSchema = z
  .object({
    findingId: FindingIdSchema,
    report: z.string().min(1),
    quote: z.string().min(1),
    location: z.string().min(1),
  })
  .strict();
export type CycleCriticSpecBroken = z.infer<typeof CycleCriticSpecBrokenSchema>;

export const CycleCriticReportSchema = z
  .object({
    ran: z.array(CommandRunSchema).default([]),
    notRun: z.array(NotRunSchema).default([]),
    findings: z.array(CycleCriticFindingSchema).default([]),
    missing: z.array(z.string().min(1)).default([]),
    extra: z.array(z.string().min(1)).default([]),
    specBroken: z.array(CycleCriticSpecBrokenSchema).default([]),
    verdict: z.enum(["PASS", "FAIL"]),
  })
  .strict();
export type CycleCriticReport = z.infer<typeof CycleCriticReportSchema>;

export const AuditFindingSchema = z
  .object({
    title: z.string().min(1),
    detail: z.string().min(1),
  })
  .strict();
export type AuditFinding = z.infer<typeof AuditFindingSchema>;

export const AuditNeedSchema = z
  .object({
    item: z.string().min(1),
    rec: z.string().min(1),
    detail: z.string().min(1).optional(),
  })
  .strict();
export type AuditNeed = z.infer<typeof AuditNeedSchema>;

export const AuditPieceSchema = z
  .object({
    id: PieceIdSchema,
    status: z.enum(["done", "not-done", "needs-user"]),
    note: z.string().min(1).optional(),
  })
  .strict();
export type AuditPiece = z.infer<typeof AuditPieceSchema>;

export const AuditDecisionSchema = z
  .object({
    id: DecisionIdSchema,
    status: z.enum(["honoured", "not-built"]),
    note: z.string().min(1).optional(),
  })
  .strict();
export type AuditDecision = z.infer<typeof AuditDecisionSchema>;

export const AuditParkedSchema = z
  .object({
    item: z.string().min(1),
    detail: z.string().min(1),
    rec: z.enum(["fold-in", "leave"]),
    why: z.string().min(1),
  })
  .strict();
export type AuditParked = z.infer<typeof AuditParkedSchema>;

export const GoAuditReportSchema = z
  .object({
    tldr: z.string().min(1),
    findings: z.array(AuditFindingSchema).default([]),
    needsFromYou: z.array(AuditNeedSchema).default([]),
    pieces: z.array(AuditPieceSchema).min(1),
    decisions: z.array(AuditDecisionSchema).default([]),
    checked: z.array(AuditCommandRunSchema).default([]),
    notChecked: z.array(NotRunSchema).default([]),
    parked: z.array(AuditParkedSchema).default([]),
    builtPieces: z.array(PieceIdSchema).default([]),
  })
  .strict();
export type GoAuditReport = z.infer<typeof GoAuditReportSchema>;

export const CycleAuditCommitSchema = z
  .object({
    sha: z.string().min(1),
    subject: z.string().min(1),
    bullets: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type CycleAuditCommit = z.infer<typeof CycleAuditCommitSchema>;

export const CycleAuditFixedSchema = z
  .object({
    findingId: FindingIdSchema,
    report: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict();
export type CycleAuditFixed = z.infer<typeof CycleAuditFixedSchema>;

export const CycleAuditDispositionSchema = z
  .object({
    findingId: FindingIdSchema,
    report: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
export type CycleAuditDisposition = z.infer<typeof CycleAuditDispositionSchema>;

export const CycleAuditSpecStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("built") }).strict(),
  z.object({ status: z.literal("building"), remaining: z.string().min(1) }).strict(),
  z.object({ status: z.literal("none") }).strict(),
]);
export type CycleAuditSpecStatus = z.infer<typeof CycleAuditSpecStatusSchema>;

export const CycleAuditReportSchema = z
  .object({
    tldr: z.string().min(1),
    findings: z.array(AuditFindingSchema).default([]),
    needsFromYou: z.array(AuditNeedSchema).default([]),
    pieces: z.array(AuditPieceSchema).default([]),
    decisions: z.array(AuditDecisionSchema).default([]),
    checked: z.array(AuditCommandRunSchema).default([]),
    notChecked: z.array(NotRunSchema).default([]),
    parked: z.array(AuditParkedSchema).default([]),
    builtPieces: z.array(PieceIdSchema).default([]),
    commits: z.array(CycleAuditCommitSchema).default([]),
    fixed: z.array(CycleAuditFixedSchema).default([]),
    notAHarm: z.array(CycleAuditDispositionSchema).default([]),
    notFixed: z.array(CycleAuditDispositionSchema).default([]),
    gate: z.enum(["green", "failed", "none-named", "unlisted"]),
    mutation: z.string().min(1).optional(),
    specStatus: CycleAuditSpecStatusSchema,
  })
  .strict();
export type CycleAuditReport = z.infer<typeof CycleAuditReportSchema>;
