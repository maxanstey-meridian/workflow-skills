import { z } from "zod";

export const KEBAB_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NonEmptyStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: "must not be blank",
  });

export const KebabNameSchema = z.string().regex(KEBAB_NAME_RE);
export const SignNumberSchema = z.number().int().min(1).max(13);
export const FindingKindSchema = z.enum(["proven", "judgement"]);
export const FindingRiskSchema = z.enum(["low", "med", "high"]);
export const DesignFindingIdSchema = z.string().regex(/^D\d+$/);
export const HunterFindingIdSchema = z.string().regex(/^#\d+$/);
export const AlsoNoticedTagSchema = z.enum(["data-loss", "security"]);
export const SlopRoleSchema = z.enum(["design-reader", "hunter", "verifier", "reporter"]);

export type FindingKind = z.infer<typeof FindingKindSchema>;
export type FindingRisk = z.infer<typeof FindingRiskSchema>;
export type AlsoNoticedTag = z.infer<typeof AlsoNoticedTagSchema>;
export type SlopRole = z.infer<typeof SlopRoleSchema>;

export const AreaSchema = z.strictObject({
  name: KebabNameSchema,
  lines: z.number().int().min(0),
  files: z.array(NonEmptyStringSchema),
});
export type Area = z.infer<typeof AreaSchema>;

export const AreasFileSchema = z.strictObject({
  root: NonEmptyStringSchema,
  head: NonEmptyStringSchema,
  areas: z.array(AreaSchema).min(1),
});
export type AreasFile = z.infer<typeof AreasFileSchema>;

export const AreaInputSchema = z.strictObject({
  name: KebabNameSchema,
  lines: z.number().int().min(0).optional(),
  files: z.array(NonEmptyStringSchema),
});
export type AreaInput = z.infer<typeof AreaInputSchema>;

export const AreasInputSchema = z.strictObject({
  root: NonEmptyStringSchema.optional(),
  head: NonEmptyStringSchema.optional(),
  areas: z.array(AreaInputSchema).min(1),
});
export type AreasInput = z.infer<typeof AreasInputSchema>;

export const WeightMapItemSchema = z.strictObject({
  capability: NonEmptyStringSchema,
  files: NonEmptyStringSchema,
  lines: z.number().int().min(0),
  sharePct: z.number().min(0).max(100),
  status: z.enum(["earned", "finding"]),
  earnedWhy: NonEmptyStringSchema.optional(),
  findingId: NonEmptyStringSchema.optional(),
});
export type WeightMapItem = z.infer<typeof WeightMapItemSchema>;

const findingBodyFields = {
  sign: SignNumberSchema,
  kind: FindingKindSchema,
  risk: FindingRiskSchema,
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  replaceWith: NonEmptyStringSchema,
  removes: NonEmptyStringSchema,
  usersLose: NonEmptyStringSchema,
  proof: NonEmptyStringSchema,
  against: NonEmptyStringSchema.optional(),
  protectedBy: NonEmptyStringSchema,
};

const refineJudgementAgainst = (
  finding: { kind: FindingKind; against?: string },
  ctx: z.RefinementCtx,
): void => {
  if (
    finding.kind === "judgement" &&
    (finding.against === undefined || finding.against.trim().length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["against"],
      message: 'against is required and must be non-empty when kind is "judgement"',
    });
  }
  if (finding.kind === "proven" && finding.against !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["against"],
      message: 'against must be omitted when kind is "proven"',
    });
  }
};

export const DesignFindingSchema = z
  .strictObject({
    id: DesignFindingIdSchema,
    ...findingBodyFields,
  })
  .superRefine(refineJudgementAgainst);
export type DesignFinding = z.infer<typeof DesignFindingSchema>;

export const HunterFindingSchema = z
  .strictObject({
    id: HunterFindingIdSchema,
    ...findingBodyFields,
  })
  .superRefine(refineJudgementAgainst);
export type HunterFinding = z.infer<typeof HunterFindingSchema>;

export const CleanupItemSchema = z.strictObject({
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  replaceWith: NonEmptyStringSchema,
});
export type CleanupItem = z.infer<typeof CleanupItemSchema>;

export const AlsoNoticedItemSchema = z.strictObject({
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  tag: AlsoNoticedTagSchema.optional(),
});
export type AlsoNoticedItem = z.infer<typeof AlsoNoticedItemSchema>;

export const LeadDroppedSchema = z.strictObject({
  lead: NonEmptyStringSchema,
  why: NonEmptyStringSchema,
});
export type LeadDropped = z.infer<typeof LeadDroppedSchema>;

export const DesignReportSchema = z.strictObject({
  houseShape: NonEmptyStringSchema,
  weightMap: z.array(WeightMapItemSchema),
  findings: z.array(DesignFindingSchema).default([]),
  cleanup: z.array(CleanupItemSchema).default([]),
  alsoNoticed: z.array(AlsoNoticedItemSchema).default([]),
  leadsDropped: z.array(LeadDroppedSchema).default([]),
});
export type DesignReport = z.infer<typeof DesignReportSchema>;

export const NoteOnDesignSchema = z.strictObject({
  findingId: DesignFindingIdSchema,
  stance: z.enum(["confirmed", "priced", "contradicted"]),
  where: NonEmptyStringSchema,
  note: NonEmptyStringSchema,
});
export type NoteOnDesign = z.infer<typeof NoteOnDesignSchema>;

export const FinderBlindSpotSchema = z.strictObject({
  path: NonEmptyStringSchema,
  why: NonEmptyStringSchema,
});
export type FinderBlindSpot = z.infer<typeof FinderBlindSpotSchema>;

export const HunterReportSchema = z.strictObject({
  houseShape: NonEmptyStringSchema.optional(),
  weightMap: z.array(WeightMapItemSchema),
  findings: z.array(HunterFindingSchema).default([]),
  cleanup: z.array(CleanupItemSchema).default([]),
  alsoNoticed: z.array(AlsoNoticedItemSchema).default([]),
  leadsDropped: z.array(LeadDroppedSchema).default([]),
  notesOnDesign: z.array(NoteOnDesignSchema).default([]),
  findersCouldntSee: z.array(FinderBlindSpotSchema).default([]),
  notReadInFull: z.array(z.string()),
});
export type HunterReport = z.infer<typeof HunterReportSchema>;

export const VerifyFindingVerdictSchema = z.strictObject({
  target: NonEmptyStringSchema,
  verdict: z.enum(["kept", "dropped"]),
  why: NonEmptyStringSchema,
  against: NonEmptyStringSchema.optional(),
});
export type VerifyFindingVerdict = z.infer<typeof VerifyFindingVerdictSchema>;

export const VerifyLocationVerdictSchema = z.strictObject({
  where: NonEmptyStringSchema,
  verdict: z.enum(["kept", "dropped"]),
  why: NonEmptyStringSchema,
});
export type VerifyLocationVerdict = z.infer<typeof VerifyLocationVerdictSchema>;

export const RaisedFromDroppedLeadSchema = z.strictObject({
  where: NonEmptyStringSchema,
  sign: SignNumberSchema,
  kind: FindingKindSchema,
  why: NonEmptyStringSchema,
});
export type RaisedFromDroppedLead = z.infer<typeof RaisedFromDroppedLeadSchema>;

export const VerifyReportSchema = z.strictObject({
  verdicts: z.array(VerifyFindingVerdictSchema).default([]),
  alsoNoticedVerdicts: z.array(VerifyLocationVerdictSchema).default([]),
  cleanupVerdicts: z.array(VerifyLocationVerdictSchema).default([]),
  raisedFromDroppedLeads: z.array(RaisedFromDroppedLeadSchema).default([]),
});
export type VerifyReport = z.infer<typeof VerifyReportSchema>;

export const SlopAuditFindingSchema = z.strictObject({
  id: NonEmptyStringSchema,
  sign: SignNumberSchema,
  kind: FindingKindSchema,
  risk: FindingRiskSchema,
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  replaceWith: NonEmptyStringSchema,
  removes: NonEmptyStringSchema,
  usersLose: NonEmptyStringSchema,
  proof: NonEmptyStringSchema,
  against: NonEmptyStringSchema.optional(),
  verifierAdds: NonEmptyStringSchema.optional(),
  protectedBy: NonEmptyStringSchema,
  hunterNotes: z.array(NonEmptyStringSchema).optional(),
  unverified: z.boolean().optional(),
  raisedByVerifier: z.boolean().optional(),
  mootIf: NonEmptyStringSchema.optional(),
});
export type SlopAuditFinding = z.infer<typeof SlopAuditFindingSchema>;

export const SlopAuditNeedSchema = z.strictObject({
  item: NonEmptyStringSchema,
  rec: NonEmptyStringSchema.optional(),
});
export type SlopAuditNeed = z.infer<typeof SlopAuditNeedSchema>;

export const SlopAuditWeightMapItemSchema = z.strictObject({
  capability: NonEmptyStringSchema,
  lines: z.number().int().min(0),
  sharePct: z.number().min(0).max(100),
  status: z.enum(["earned", "finding"]),
  earnedWhy: NonEmptyStringSchema.optional(),
  findingId: NonEmptyStringSchema.optional(),
});
export type SlopAuditWeightMapItem = z.infer<typeof SlopAuditWeightMapItemSchema>;

export const SlopAuditCleanupItemSchema = z.strictObject({
  id: NonEmptyStringSchema.optional(),
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  replaceWith: NonEmptyStringSchema,
});
export type SlopAuditCleanupItem = z.infer<typeof SlopAuditCleanupItemSchema>;

export const SlopAuditAlsoNoticedItemSchema = z.strictObject({
  where: NonEmptyStringSchema,
  what: NonEmptyStringSchema,
  tag: AlsoNoticedTagSchema.optional(),
  verification: z.enum(["kept", "unchecked"]),
});
export type SlopAuditAlsoNoticedItem = z.infer<typeof SlopAuditAlsoNoticedItemSchema>;

export const SlopAuditSkippedFinderSchema = z.strictObject({
  name: NonEmptyStringSchema,
  why: NonEmptyStringSchema,
});
export type SlopAuditSkippedFinder = z.infer<typeof SlopAuditSkippedFinderSchema>;

export const SlopAuditHuntedSchema = z.strictObject({
  repo: NonEmptyStringSchema,
  head: NonEmptyStringSchema,
  notReadInFull: z.array(NonEmptyStringSchema).default([]),
  leftOut: z.array(NonEmptyStringSchema).default([]),
  findersRun: z.array(NonEmptyStringSchema).default([]),
  skipped: z.array(SlopAuditSkippedFinderSchema).default([]),
});
export type SlopAuditHunted = z.infer<typeof SlopAuditHuntedSchema>;

export const SlopAuditSchema = z.strictObject({
  tldr: z.string(),
  findings: z.array(NonEmptyStringSchema).default([]),
  needsFromYou: z.array(SlopAuditNeedSchema),
  weightMap: z.array(SlopAuditWeightMapItemSchema),
  design: z.array(SlopAuditFindingSchema).default([]),
  code: z.array(SlopAuditFindingSchema).default([]),
  cleanup: z.array(SlopAuditCleanupItemSchema).default([]),
  alsoNoticed: z.array(SlopAuditAlsoNoticedItemSchema).default([]),
  hunted: SlopAuditHuntedSchema,
});
export type SlopAudit = z.infer<typeof SlopAuditSchema>;

export const SlopPhaseSchema = z.enum([
  "init",
  "review-scope",
  "split",
  "design",
  "hunt",
  "verify",
  "report",
  "done",
]);
export type SlopPhase = z.infer<typeof SlopPhaseSchema>;

export const SlopStateSchema = z.strictObject({
  root: NonEmptyStringSchema,
  mainDir: NonEmptyStringSchema,
  skillDir: NonEmptyStringSchema,
  runDir: NonEmptyStringSchema,
  head: NonEmptyStringSchema,
  scopeReviewed: z.boolean(),
  areasSplit: z.boolean(),
  retries: z.record(z.string(), z.number().int().min(0)),
  phase: SlopPhaseSchema,
});
export type SlopState = z.infer<typeof SlopStateSchema>;

export const SizedFileSchema = z.strictObject({
  path: NonEmptyStringSchema,
  lines: z.number().int().min(0),
});
export type SizedFile = z.infer<typeof SizedFileSchema>;

export const SlopSubagentTaskSchema = z.strictObject({
  role: SlopRoleSchema,
  yours: NonEmptyStringSchema,
  report: NonEmptyStringSchema,
  brief: NonEmptyStringSchema,
});
export type SlopSubagentTask = z.infer<typeof SlopSubagentTaskSchema>;

export const SlopActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("review-scope"),
    scopeFile: NonEmptyStringSchema,
    sizesFile: NonEmptyStringSchema,
    oversized: z.array(SizedFileSchema),
    topBiggest: z.array(SizedFileSchema),
  }),
  z.strictObject({
    action: z.literal("split"),
    scopeFile: NonEmptyStringSchema,
    sizesFile: NonEmptyStringSchema,
    areasFile: NonEmptyStringSchema,
    totalLines: z.number().int().min(0),
    errors: z.array(z.string()),
  }),
  z.strictObject({
    action: z.literal("spawn"),
    parallel: z.boolean(),
    maxConcurrency: z.number().int().min(1),
    subagents: z.array(SlopSubagentTaskSchema).min(1),
  }),
  z.strictObject({
    action: z.literal("relay"),
    report: NonEmptyStringSchema,
  }),
  z.strictObject({
    action: z.literal("stop"),
    reason: NonEmptyStringSchema,
    details: z.array(z.string()).optional(),
  }),
]);
export type SlopAction = z.infer<typeof SlopActionSchema>;
