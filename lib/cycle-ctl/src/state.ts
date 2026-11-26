import { z } from "zod";

export const CycleModeSchema = z.enum(["diff", "full"]);
export type CycleMode = z.infer<typeof CycleModeSchema>;

export const CycleRoundSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type CycleRound = z.infer<typeof CycleRoundSchema>;

export const ReviewRoleSchema = z.enum([
  "reviewer",
  "doctrine-reviewer-backend",
  "doctrine-reviewer-frontend",
]);
export type ReviewRole = z.infer<typeof ReviewRoleSchema>;

export const ReviewTaskSchema = z
  .object({
    role: ReviewRoleSchema,
    listFile: z.string().min(1),
    reportFile: z.string().min(1),
  })
  .strict();
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;

export const StackFilesSchema = z
  .object({
    backend: z.array(z.string().min(1)),
    frontend: z.array(z.string().min(1)),
  })
  .strict();
export type StackFiles = z.infer<typeof StackFilesSchema>;

export const CyclePhaseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("await_slices"),
      errors: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      kind: z.literal("review_ready"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reviewing"),
      tasks: z.array(ReviewTaskSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal("commit_work"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("fixing"),
      sliceIds: z.array(z.number().int().nonnegative()),
      reviewReports: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      kind: z.literal("critiquing"),
      sliceIds: z.array(z.number().int().nonnegative()),
      currentIndex: z.number().int().nonnegative(),
      reviewReports: z.array(z.string().min(1)),
      failedSliceIds: z.array(z.number().int().nonnegative()),
    })
    .strict(),
  z
    .object({
      kind: z.literal("second_fixing"),
      sliceIds: z.array(z.number().int().nonnegative()),
      currentIndex: z.number().int().nonnegative(),
      reviewReports: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      kind: z.literal("second_critiquing"),
      sliceIds: z.array(z.number().int().nonnegative()),
      currentIndex: z.number().int().nonnegative(),
      reviewReports: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      kind: z.literal("rereviewing"),
      fixedListFile: z.string().min(1),
      reportFile: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("commit_round"),
      fixedListFile: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("gate"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("gate_fixing"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("gate_critiquing"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("commit_gate"),
      fixedListFile: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("auditing"),
    })
    .strict(),
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
      details: z.array(z.string().min(1)).default([]),
    })
    .strict(),
]);
export type CyclePhase = z.infer<typeof CyclePhaseSchema>;

export const CycleStateSchema = z
  .object({
    specPath: z.string().min(1).nullable(),
    mode: CycleModeSchema,
    mainDir: z.string().min(1),
    repoRoot: z.string().min(1),
    skillDir: z.string().min(1),
    runDir: z.string().min(1),
    round: CycleRoundSchema,
    phase: CyclePhaseSchema,
    slices: z.record(z.string(), z.array(z.string().min(1))),
    stackFiles: StackFilesSchema,
    retries: z.record(z.string(), z.number().int().nonnegative()),
    committedLists: z.array(z.string().min(1)),
    missedReports: z.array(z.string().min(1)),
  })
  .strict();
export type CycleState = z.infer<typeof CycleStateSchema>;

export type SpawnSubagent = {
  role: string;
  brief: string;
  report: string;
};

export type CycleAction =
  | {
      action: "slice";
      scopeFile: string;
      slicesFile: string;
      fileLines: Record<string, number>;
      schema: {
        slices: string;
        stacks: {
          backend: string;
          frontend: string;
        };
        maxPerFile: number;
        maxLinesPerList: number;
      };
      errors: string[];
    }
  | {
      action: "spawn";
      parallel: boolean;
      subagents: SpawnSubagent[];
    }
  | {
      action: "commit";
      listFile: string;
      messageFile: string;
      diffStat: string;
      changes: string[];
      commitRule: string;
      specPath: string | null;
    }
  | {
      action: "gate";
      logFile: string;
    }
  | {
      action: "relay";
      report: string;
    }
  | {
      action: "stop";
      reason: string;
      details?: string[];
    };
