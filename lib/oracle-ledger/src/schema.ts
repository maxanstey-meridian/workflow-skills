import { createHash } from "node:crypto";
import { z } from "zod";

export const OracleKindSchema = z.enum(["api-contract", "browser", "cli"]);
export type OracleKind = z.infer<typeof OracleKindSchema>;

export const RowStatusSchema = z.enum([
  "active",
  "shortfall",
  "cant-happen",
  "other-level",
  "struck",
]);
export type RowStatus = z.infer<typeof RowStatusSchema>;

export const RowSourceSchema = z.enum(["written", "meridian", "ruling", "today"]);
export type RowSource = z.infer<typeof RowSourceSchema>;

export const UiStateSchema = z
  .object({
    id: z.string().min(1),
    slice: z.string().min(1).optional(),
    when: z.string().min(1),
  })
  .strict();
export type UiState = z.infer<typeof UiStateSchema>;

export const OracleConfSchema = z
  .object({
    kind: OracleKindSchema,
    rows: z.array(z.string().min(1)).min(1),
    uiStates: z.array(UiStateSchema).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.uiStates !== undefined && val.kind !== "browser") {
      ctx.addIssue({
        code: "custom",
        path: ["uiStates"],
        message: 'uiStates is only allowed when kind is "browser"',
      });
    }
  });
export type OracleConf = z.infer<typeof OracleConfSchema>;

export const RowStubSchema = z
  .object({
    id: z.string().min(1),
    slice: z.string().min(1).optional(),
    where: z.string().optional(),
    meta: z.record(z.string(), z.string()).optional(),
  })
  .strict();
export type RowStub = z.infer<typeof RowStubSchema>;

export const UnplacedStubSchema = z
  .object({
    id: z.string().min(1),
    unplaced: z.string().min(1),
    slice: z.string().min(1).optional(),
    where: z.string().optional(),
  })
  .strict();
export type UnplacedStub = z.infer<typeof UnplacedStubSchema>;

export const RowScriptLineSchema = z.union([RowStubSchema, UnplacedStubSchema]);
export type RowScriptLine = z.infer<typeof RowScriptLineSchema>;

export const QuestionSchema = z
  .object({
    ask: z.string().min(1),
    recommend: z.string().min(1),
  })
  .strict();
export type Question = z.infer<typeof QuestionSchema>;

export const BrowserExpectSchema = z
  .object({
    ui: z.string(),
    api: z.string().optional(),
  })
  .strict();
export type BrowserExpect = z.infer<typeof BrowserExpectSchema>;

export const stripSourceRefLocator = (ref: string): string =>
  ref.replace(/#.*$/, "").replace(/:\d+(?:-\d+)?$/, "");

export const isUrlSourceRef = (ref: string): boolean => /^https?:\/\//i.test(ref);

const TEST_DIR_SEGMENTS = new Set(["test", "tests", "__tests__"]);

export const isTestFileSourceRef = (ref: string): boolean => {
  if (isUrlSourceRef(ref)) {
    return false;
  }
  const filePath = stripSourceRefLocator(ref).replace(/\\/g, "/");
  const segments = filePath.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) {
    return false;
  }
  const dirSegments = segments.slice(0, -1);
  if (dirSegments.some((s) => TEST_DIR_SEGMENTS.has(s.toLowerCase()))) {
    return true;
  }
  const fileName = segments[segments.length - 1] ?? "";
  return (
    /\.(?:test|spec)\.[^./]+$/i.test(fileName) ||
    /(?:Test|Tests)\.cs$/.test(fileName) ||
    /^test_[^/]+\.[^./]+$/i.test(fileName) ||
    /_test\.[^./]+$/i.test(fileName)
  );
};

export const validateSourceRefFormat = (ref: string): string | null => {
  if (ref.length === 0) {
    return "sourceRef must be non-empty";
  }
  if (/\s/.test(ref) || ref.includes("(") || ref.includes(")")) {
    return `sourceRef "${ref}" must be a bare path or URL without whitespace or parentheses`;
  }
  if (isUrlSourceRef(ref)) {
    return null;
  }
  if (ref.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(ref)) {
    return `sourceRef "${ref}" must be a repo-relative path or URL, not an absolute path`;
  }
  const filePath = stripSourceRefLocator(ref).replace(/\\/g, "/");
  if (filePath.length === 0) {
    return `sourceRef "${ref}" must include a file path`;
  }
  const segments = filePath.split("/").filter((s) => s.length > 0);
  if (segments.includes(".plans")) {
    return `sourceRef "${ref}" points inside .plans/, which is not a durable source`;
  }
  return null;
};

const baseRowFields = {
  id: z.string().min(1),
  where: z.string().optional(),
  meta: z.record(z.string(), z.string()).optional(),
  gone: z.boolean().optional(),
  status: RowStatusSchema,
  when: z.string().nullable(),
  source: RowSourceSchema.nullable(),
  sourceRef: z
    .string()
    .superRefine((val, ctx) => {
      const err = validateSourceRefFormat(val);
      if (err !== null) {
        ctx.addIssue({ code: "custom", message: err });
      }
    })
    .optional(),
  shortfall: z.string().nullable(),
  reason: z.string().nullable(),
  question: QuestionSchema.nullable(),
};

export const BrowserRowSchema = z
  .object({
    ...baseRowFields,
    expect: BrowserExpectSchema.nullable(),
    allowKeyboard: z.boolean().optional(),
  })
  .strict();
export type BrowserRow = z.infer<typeof BrowserRowSchema>;

export const SimpleRowSchema = z
  .object({
    ...baseRowFields,
    expect: z.string().nullable(),
  })
  .strict();
export type SimpleRow = z.infer<typeof SimpleRowSchema>;

export type OracleRow = BrowserRow | SimpleRow;

export const UnplacedSchema = z
  .object({
    id: z.string().min(1),
    reason: z.string().min(1),
    where: z.string().optional(),
    gone: z.boolean().optional(),
    struck: z.boolean().optional(),
  })
  .strict();
export type UnplacedItem = z.infer<typeof UnplacedSchema>;

export const BrowserOracleFileSchema = z
  .object({
    kind: z.literal("browser"),
    slice: z.string().min(1),
    rows: z.array(BrowserRowSchema),
    unplaced: z.array(UnplacedSchema).optional(),
  })
  .strict();

export const ApiContractOracleFileSchema = z
  .object({
    kind: z.literal("api-contract"),
    slice: z.string().min(1),
    rows: z.array(SimpleRowSchema),
    unplaced: z.array(UnplacedSchema).optional(),
  })
  .strict();

export const CliOracleFileSchema = z
  .object({
    kind: z.literal("cli"),
    slice: z.string().min(1),
    rows: z.array(SimpleRowSchema),
    unplaced: z.array(UnplacedSchema).optional(),
  })
  .strict();

export const OracleFileSchema = z.discriminatedUnion("kind", [
  BrowserOracleFileSchema,
  ApiContractOracleFileSchema,
  CliOracleFileSchema,
]);
export type OracleFile = z.infer<typeof OracleFileSchema>;

export type LoadedOracleFile = {
  fileName: string;
  filePath: string;
  data: OracleFile;
};

export const ClaimSchema = z
  .object({
    id: z.string().min(1),
    redCondition: z.string().refine((s) => s.trim().length > 0, {
      message: "redCondition must be non-empty",
    }),
  })
  .strict();
export type Claim = z.infer<typeof ClaimSchema>;

export const ClaimsFileSchema = z
  .object({
    claims: z.array(ClaimSchema),
  })
  .strict();
export type ClaimsFile = z.infer<typeof ClaimsFileSchema>;

export const FrozenSchema = z
  .object({
    date: z.string().min(1),
    words: z.string().min(1),
    command: z.array(z.string().min(1)).min(1),
    script: z
      .object({
        file: z.string().min(1),
        sha256: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type Frozen = z.infer<typeof FrozenSchema>;

export const LockedSchema = z
  .object({
    lockedAt: z.string().min(1),
    kind: OracleKindSchema,
    rows: z.record(z.string(), z.string()),
  })
  .strict();
export type Locked = z.infer<typeof LockedSchema>;

export const RunColourSchema = z.enum(["green", "red", "skipped", "error"]);
export type RunColour = z.infer<typeof RunColourSchema>;

export const RunRowStateSchema = z
  .object({
    slice: z.string().min(1),
    colour: RunColourSchema,
    testName: z.string().min(1),
    testFile: z.string().min(1),
    fileHash: z.string().min(1),
    lintFindings: z.array(z.string()),
    claimed: z.boolean(),
    redCondition: z.string().optional(),
    verifiedFileHash: z.string().optional(),
  })
  .strict();
export type RunRowState = z.infer<typeof RunRowStateSchema>;

export const RunStateSchema = z
  .object({
    updatedAt: z.string().min(1),
    rows: z.record(z.string(), RunRowStateSchema),
  })
  .strict();
export type RunState = z.infer<typeof RunStateSchema>;

export const formatZodError = (err: z.ZodError): string =>
  err.issues
    .map((issue) => {
      const loc = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${loc}: ${issue.message}`;
    })
    .join("; ");

export const normaliseId = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const rowLockHash = (row: OracleRow): string => {
  const expectCanonical =
    row.expect === null || typeof row.expect === "string"
      ? row.expect
      : {
          ui: row.expect.ui,
          ...(row.expect.api !== undefined ? { api: row.expect.api } : {}),
        };

  const allowKeyboard = "allowKeyboard" in row ? (row.allowKeyboard ?? false) : false;

  const canonical = {
    when: row.when,
    expect: expectCanonical,
    status: row.status,
    shortfall: row.shortfall,
    allowKeyboard,
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
};

const isNonEmpty = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const validateOracleFile = (
  file: OracleFile,
  expectedKind: OracleKind,
  fileName: string,
): string[] => {
  const errors: string[] = [];

  if (file.kind !== expectedKind) {
    errors.push(
      `${fileName}: kind "${file.kind}" does not match oracle.conf.json kind "${expectedKind}"`,
    );
  }

  for (const row of file.rows) {
    const prefix = `${fileName} [${row.id}]`;

    if (row.sourceRef !== undefined) {
      const refErr = validateSourceRefFormat(row.sourceRef);
      if (refErr !== null) {
        errors.push(`${prefix}: ${refErr}`);
      } else if (row.source === "written" && isTestFileSourceRef(row.sourceRef)) {
        errors.push(
          `${prefix}: sourceRef "${row.sourceRef}" is a test file; test files cannot back source "written"`,
        );
      }
    }

    if (row.status === "active") {
      if (row.shortfall !== null) {
        errors.push(`${prefix}: active row must have shortfall: null`);
      }
      if (row.question === null) {
        if (!isNonEmpty(row.when)) {
          errors.push(`${prefix}: active row without question requires non-empty when`);
        }
        if (row.source === null) {
          errors.push(`${prefix}: active row without question requires source`);
        } else if (row.source === "written" && !isNonEmpty(row.sourceRef)) {
          errors.push(`${prefix}: active row with source "written" requires sourceRef`);
        }
        if (file.kind === "browser") {
          if (row.expect === null || typeof row.expect === "string" || !isNonEmpty(row.expect.ui)) {
            errors.push(`${prefix}: browser active row requires non-empty expect.ui`);
          } else if (row.expect.api !== undefined && !isNonEmpty(row.expect.api)) {
            errors.push(`${prefix}: browser expect.api must be non-empty when present`);
          }
        } else if (typeof row.expect !== "string" || !isNonEmpty(row.expect)) {
          errors.push(`${prefix}: ${file.kind} active row requires non-empty expect`);
        }
      }
    } else if (row.status === "shortfall") {
      if (row.question !== null) {
        errors.push(`${prefix}: shortfall row must have question: null`);
      }
      if (!isNonEmpty(row.shortfall)) {
        errors.push(`${prefix}: shortfall row requires non-empty shortfall`);
      }
      if (!isNonEmpty(row.when)) {
        errors.push(`${prefix}: shortfall row requires non-empty when`);
      }
      if (row.source === null) {
        errors.push(`${prefix}: shortfall row requires source`);
      } else if (row.source === "written" && !isNonEmpty(row.sourceRef)) {
        errors.push(`${prefix}: shortfall row with source "written" requires sourceRef`);
      }
      if (file.kind === "browser") {
        if (row.expect === null || typeof row.expect === "string" || !isNonEmpty(row.expect.ui)) {
          errors.push(`${prefix}: browser shortfall row requires non-empty expect.ui`);
        } else if (row.expect.api !== undefined && !isNonEmpty(row.expect.api)) {
          errors.push(`${prefix}: browser expect.api must be non-empty when present`);
        }
      } else if (typeof row.expect !== "string" || !isNonEmpty(row.expect)) {
        errors.push(`${prefix}: ${file.kind} shortfall row requires non-empty expect`);
      }
    } else {
      // cant-happen | other-level | struck
      if (!isNonEmpty(row.reason)) {
        errors.push(`${prefix}: ${row.status} row requires non-empty reason`);
      }
      if (row.shortfall !== null) {
        errors.push(`${prefix}: ${row.status} row must have shortfall: null`);
      }
    }
  }

  return errors;
};
