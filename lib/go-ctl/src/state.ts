import { z } from "zod";
import { type OpenAsk, PieceIdSchema } from "../../contracts/src/spec-schema.ts";

export const GoPhaseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("idle") }).strict(),
  z
    .object({
      kind: z.literal("building"),
      pieces: z.array(PieceIdSchema).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("critiquing"),
      piece: PieceIdSchema,
      queue: z.array(PieceIdSchema),
      retryQueue: z.array(PieceIdSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal("retrying_build"),
      piece: PieceIdSchema,
      queue: z.array(PieceIdSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal("retrying_critic"),
      piece: PieceIdSchema,
      queue: z.array(PieceIdSchema),
    })
    .strict(),
  z.object({ kind: z.literal("auditing") }).strict(),
  z
    .object({
      kind: z.literal("done"),
      reportPath: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("stopped"),
      reason: z.string().min(1),
      details: z.array(z.string().min(1)).optional(),
    })
    .strict(),
]);

export type GoPhase = z.infer<typeof GoPhaseSchema>;

export const GoStateSchema = z
  .object({
    specPath: z.string().min(1),
    mainDir: z.string().min(1),
    skillDir: z.string().min(1),
    runDir: z.string().min(1),
    phase: GoPhaseSchema,
    failedPieces: z.array(PieceIdSchema).default([]),
    retries: z.record(z.string(), z.number().int().min(0)).default({}),
  })
  .strict();

export type GoState = z.infer<typeof GoStateSchema>;

export type GoSubagentRole = "builder" | "critic" | "auditor";

export type GoSubagentTask = {
  role: GoSubagentRole;
  piece: string;
  attempt?: 1 | 2;
  brief: string;
};

export type GoAction =
  | {
      action: "spawn";
      parallel: boolean;
      subagents: GoSubagentTask[];
    }
  | {
      action: "relay";
      report: string;
    }
  | {
      action: "stop";
      reason: string;
      openAsks?: OpenAsk[];
      details?: string[];
    };
