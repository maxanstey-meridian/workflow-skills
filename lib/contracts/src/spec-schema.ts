import { z } from "zod";

export type ValidationIssue = {
  path: string;
  message: string;
};

export const PieceIdSchema = z.string().regex(/^P\d+$/);
export const DecisionIdSchema = z.string().regex(/^D\d+$/);
export const OpenAskIdSchema = z.string().regex(/^A\d+$/);

export const SpecStatusSchema = z.enum(["draft", "agreed", "building", "built"]);
export type SpecStatus = z.infer<typeof SpecStatusSchema>;

export const OracleCaseRefSchema = z
  .object({
    path: z.string().min(1),
    kind: z.enum(["api-contract", "browser", "cli"]),
  })
  .strict();
export type OracleCaseRef = z.infer<typeof OracleCaseRefSchema>;

export const PremiseItemSchema = z
  .object({
    assumed: z.string().min(1),
    actual: z.string().min(1),
    correction: z.string().min(1).optional(),
  })
  .strict();
export type PremiseItem = z.infer<typeof PremiseItemSchema>;

export const DecisionSchema = z
  .object({
    id: DecisionIdSchema,
    title: z.string().min(1),
    what: z.string().min(1),
    why: z.string().min(1),
    decidedBy: z.enum(["agreed", "agent-when-handed-back"]),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;

export const OpenAskSchema = z
  .object({
    id: OpenAskIdSchema,
    question: z.string().min(1),
    rec: z.string().min(1),
    settledBy: z.string().min(1),
  })
  .strict();
export type OpenAsk = z.infer<typeof OpenAskSchema>;

export const PieceSchema = z
  .object({
    id: PieceIdSchema,
    name: z.string().min(1),
    owns: z.array(z.string().min(1)).min(1),
    after: z.array(PieceIdSchema).default([]),
    now: z.string().min(1),
    reuse: z.string().min(1),
    change: z.string().min(1),
    proof: z.string().min(1),
  })
  .strict();
export type Piece = z.infer<typeof PieceSchema>;

export const DoneMeanSchema = z
  .object({
    cmd: z.string().min(1),
    proves: z.string().min(1),
  })
  .strict();
export type DoneMean = z.infer<typeof DoneMeanSchema>;

export const OutOfScopeItemSchema = z
  .object({
    item: z.string().min(1),
    why: z.string().min(1),
  })
  .strict();
export type OutOfScopeItem = z.infer<typeof OutOfScopeItemSchema>;

export const ParkedItemSchema = z
  .object({
    item: z.string().min(1),
    whoHits: z.string().min(1),
    fixAndSize: z.string().min(1),
    rec: z.enum(["fold-in", "leave"]),
    why: z.string().min(1),
  })
  .strict();
export type ParkedItem = z.infer<typeof ParkedItemSchema>;

export const SpecSchema = z
  .object({
    title: z.string().min(1),
    status: SpecStatusSchema,
    intent: z.string().min(1),
    premise: z.array(PremiseItemSchema).default([]),
    oracleCase: OracleCaseRefSchema.optional(),
    decisions: z.array(DecisionSchema).default([]),
    openAsks: z.array(OpenAskSchema).default([]),
    builtPieces: z.array(PieceIdSchema).default([]),
    pieces: z.array(PieceSchema).min(1),
    invariantsAndDocs: z.array(z.string().min(1)).default([]),
    doneMeans: z.array(DoneMeanSchema).min(1),
    onlyUserCan: z.array(z.string().min(1)).default([]),
    outOfScope: z.array(OutOfScopeItemSchema).default([]),
    parked: z.array(ParkedItemSchema).default([]),
  })
  .strict();
export type Spec = z.infer<typeof SpecSchema>;
