import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { getSystemErrorMessage, inspect, isDeepStrictEqual } from "node:util";

import { DOMParser, onWarningStopParsing } from "@xmldom/xmldom";
import type { Element } from "@xmldom/xmldom";
import { Command, CommanderError } from "commander";
import { z } from "zod";

const VERDICTS = ["CONFIRMED", "PARTLY", "WRONG", "CAN'T TELL"] as const;
const VERDICT_KEYS = ["Id", "Field", "Verdict", "Evidence", "Judged"];
// Fields the ledger alone writes, which a row script may never print.
const LEDGER_FIELDS = ["Gone", "Ran", "Struck"];
// Fields on every row that are neither the script's fields to fill nor the ledger's.
const ROW_KEYS = ["Id", "Slice"];
// Fields the ledger gives a meaning to; every other field is the script's.
const CANTHAPPEN = "CantHappen";
const SHORTFALL = "Shortfall";
const TEST = "Test";
// With the three above, the fields every row carries.
const EXPECTED = "Expected";
// The two passes. `test` owns the field Test; `fill` owns every other field the script printed as null.
const FILL = "fill";
const TEST_PASS = "test";
const PASSES = [FILL, TEST_PASS];
// A case is a folder with exactly this name, placed next to what it pins down.
const CASE_FOLDER = "__oracle__";
// Its one config file: {"rows": [<the row script's command, run in the case folder>]}.
const CONF_FILE = "oracle.conf.json";
const FROZEN_FILE = "frozen.json";
const NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const FOLDER_UNSAFE = /[/\\\x00]/;
const RULING_LINE = /^- \S+ · (\S+) · ([A-Za-z0-9_-]+): /gm;
const NOT_ALNUM = /[^a-z0-9]/g;
const LINE_SUFFIX = /(:\d+(-\d+)?)+$/;
// Where an expected value came from: a value record of an expected field carries one of these as `Source`.
const SOURCE_WORDS = ["written", "ruling", "meridian", "today", "judgement"] as const;
// A citation's File may name one of the skill's own rule files as `meridian:<name>`.
const MERIDIAN_PREFIX = "meridian:";
const REFERENCES = path.resolve(import.meta.dirname, "..", "references");
const MERIDIAN_FILE = /^rules-[A-Za-z0-9_.-]*\.md$/;
// Under the case folder, what a `written` source may never cite: the records are agents' and the ledger's own words.
const RECORD_FOLDERS = ["table", FILL, TEST_PASS, "reports"];
const RECORD_FILES = ["rulings.md", FROZEN_FILE, CONF_FILE];

// An input can't be read or is malformed: exit 2, and nothing is written.
class RecordError extends Error {
  problems: string[];

  constructor(problems: string[]) {
    super(problems.join("; "));
    this.problems = [...problems];
  }
}

// ---------------------------------------------------------------- the shapes

const JsonSchema = z.json();
type Json = z.infer<typeof JsonSchema>;

// One line of a JSONL file. A record schema keeps a record's keys in the order they were written;
// an object schema puts its own keys first, so each record below is both.
const JsonObjectSchema = z.record(z.string(), JsonSchema);
type JsonObject = z.infer<typeof JsonObjectSchema>;

const TextSchema = z.string().refine((value) => value.trim() !== "");

const ROWS_PROBLEM = "`rows` must be a non-empty list of text, the row script's command.";
const ConfSchema = z.strictObject(
  {
    rows: z
      .array(z.string({ error: ROWS_PROBLEM }).min(1, ROWS_PROBLEM), {
        error: (issue) => (issue.input === undefined ? "it must hold exactly one key, `rows`; it holds no `rows`." : ROWS_PROBLEM),
      })
      .min(1, ROWS_PROBLEM),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `it must hold exactly one key, \`rows\`; it also holds ${issue.keys.toSorted().join(", ")}.`
        : "it must be a JSON object holding exactly one key, `rows`.",
  },
);

const FrozenSchema = z.strictObject({
  date: TextSchema,
  words: TextSchema,
  script: z.strictObject({ file: TextSchema, sha256: TextSchema }),
});
type Frozen = z.infer<typeof FrozenSchema>;

const CiteSchema = z.strictObject({ File: z.string(), Quote: z.string() });
type Cite = z.infer<typeof CiteSchema>;

const SourceSchema = z.enum(SOURCE_WORDS);

// The three shapes of a fill record, without its Id and Field: what a merged field holds in the table.
const ValueSchema = z.strictObject({
  Value: TextSchema,
  Cites: z.array(CiteSchema).min(1),
  Source: SourceSchema.nullish(),
  Why: JsonSchema.optional(),
});
type Value = z.infer<typeof ValueSchema>;
const QuestionSchema = z.strictObject({ Question: TextSchema, Recommend: TextSchema });
type Question = z.infer<typeof QuestionSchema>;
const EmptySchema = z.strictObject({ Empty: TextSchema });

const SHAPE_KEYS = {
  value: Object.keys(ValueSchema.shape),
  question: Object.keys(QuestionSchema.shape),
  empty: Object.keys(EmptySchema.shape),
};
type Shape = keyof typeof SHAPE_KEYS;

const FILL_KEYS = { Id: TextSchema, Field: TextSchema };
const FillRecordSchema = JsonObjectSchema.and(
  z.union([ValueSchema.extend(FILL_KEYS), QuestionSchema.extend(FILL_KEYS), EmptySchema.extend(FILL_KEYS)]),
);

const VerdictSchema = z.looseObject({
  Id: TextSchema,
  Field: TextSchema,
  Verdict: z.enum(VERDICTS),
  Evidence: JsonSchema,
  Judged: JsonSchema,
});
type Verdict = z.infer<typeof VerdictSchema>;

// An object holding Value or Question has the shape of a merged field, whatever else it holds.
const hasMergedShape = (held: Json): boolean =>
  typeof held === "object" && held !== null && !Array.isArray(held) && ("Value" in held || "Question" in held);

// What a row holds under a key: a merged field, or anything of the script's own that is not shaped like one.
const HeldSchema = z.union([ValueSchema, QuestionSchema, JsonSchema.refine((held) => !hasMergedShape(held))]);

// A row of the table. Every row carries Expected, CantHappen, Shortfall, and Test; the row script prints them as null.
const RowSchema = JsonObjectSchema.and(
  z
    .object({
      Id: TextSchema,
      Slice: TextSchema,
      [EXPECTED]: z.union([z.null(), ValueSchema, QuestionSchema]),
      [CANTHAPPEN]: z.union([z.null(), ValueSchema]),
      [SHORTFALL]: z.union([z.null(), ValueSchema]),
      [TEST]: z.union([z.null(), ValueSchema, QuestionSchema]),
      Ran: z.enum(["green", "red", "not-run"]).optional(),
      Gone: z.literal(true).optional(),
      Struck: z.strictObject({ Why: z.string(), Date: z.string() }).optional(),
    })
    .catchall(HeldSchema),
);
type Row = z.infer<typeof RowSchema>;
type Colour = NonNullable<Row["Ran"]>;

// ---------------------------------------------------------------- the records

const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const systemMessage = (error: unknown): string =>
  error instanceof Error && "errno" in error && typeof error.errno === "number" ? getSystemErrorMessage(error.errno) : messageOf(error);

const today = (): string => Temporal.Now.plainDateISO().toString();

const isFile = (file: string): boolean => {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
};

const isDir = (folder: string): boolean => {
  try {
    return statSync(folder).isDirectory();
  } catch {
    return false;
  }
};

// The absolute path with symlinks followed; a path that does not exist is only made absolute.
const resolvePath = (file: string): string => {
  const absolute = path.resolve(file);
  try {
    return realpathSync(absolute);
  } catch (error) {
    if (error instanceof Error && "errno" in error) {
      return absolute;
    }
    throw error;
  }
};

const isRelativeTo = (file: string, folder: string): boolean => {
  const between = path.relative(folder, file);
  return between !== ".." && !between.startsWith(`..${path.sep}`) && !path.isAbsolute(between);
};

// An Id and a Field as one key of a Set or a Map.
const pairKey = (rowId: string, field: string): string => JSON.stringify([rowId, field]);

const readText = (file: string): string => {
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch (error) {
    throw new RecordError([`${file}: it can't be read (${systemMessage(error)}).`]);
  }
  try {
    return UTF8.decode(bytes);
  } catch {
    throw new RecordError([`${file}: it is not UTF-8 text.`]);
  }
};

const readJsonl = (file: string): JsonObject[] => {
  const text = readText(file);
  const records: JsonObject[] = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (line.trim() === "") {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new RecordError([`${file}: line ${index + 1} is not JSON (${messageOf(error)}).`]);
    }
    const record = JsonObjectSchema.safeParse(parsed);
    if (!record.success) {
      throw new RecordError([`${file}: line ${index + 1} is not a JSON object.`]);
    }
    records.push(record.data);
  }
  return records;
};

const writeJsonl = (file: string, records: JsonObject[]): void => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, records.map((record) => `${JSON.stringify(record)}\n`).join(""), "utf8");
};

const isStr = (value: unknown): value is string => TextSchema.safeParse(value).success;

// A slice is a folder name under <pass>/filled/ (Decision 6), so it can't point anywhere else.
const isSliceName = (value: unknown): boolean => isStr(value) && value !== "." && value !== ".." && !FOLDER_UNSAFE.test(value);

// ---------------------------------------------------------------- the case

class Case {
  folder: string;
  root: string;
  frozen: Frozen | null;
  rowsCommand: string[];

  constructor(folder: string, root: string, frozen: Frozen | null, rowsCommand: string[]) {
    this.folder = folder;
    this.root = root;
    this.frozen = frozen;
    this.rowsCommand = rowsCommand;
  }

  // What a case is called in output: its folder name is always the same, so the folder it sits in comes first.
  get label(): string {
    return `${path.basename(path.dirname(this.folder))}/${path.basename(this.folder)}`;
  }

  get tablePath(): string {
    return path.join(this.folder, "table", "rows.jsonl");
  }

  get rulingsPath(): string {
    return path.join(this.folder, "rulings.md");
  }

  get frozenPath(): string {
    return path.join(this.folder, FROZEN_FILE);
  }
}

// The folder `git rev-parse --show-toplevel` prints in the case folder; the case folder when that fails.
const citationRoot = (folder: string): string => {
  const run = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: folder, encoding: "utf8" });
  if (run.error !== undefined) {
    return folder;
  }
  const top = run.stdout.trim();
  if (run.status !== 0 || top === "") {
    return folder;
  }
  let root: string;
  try {
    root = resolvePath(top);
  } catch {
    return folder;
  }
  return isDir(root) && isRelativeTo(folder, root) ? root : folder;
};

const readFrozen = (file: string): Frozen | null => {
  if (!isFile(file)) {
    return null;
  }
  const text = readText(file);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new RecordError([`${file}: it can't be read as JSON (${messageOf(error)}).`]);
  }
  const frozen = FrozenSchema.safeParse(data);
  if (!frozen.success) {
    throw new RecordError([`${file}: it must hold exactly \`date\` and \`words\`, both text, and \`script\`, holding \`file\` and \`sha256\`, both text.`]);
  }
  return frozen.data;
};

// The row script's command from oracle.conf.json: exactly one key, `rows`, a non-empty list of text.
const readConf = (folder: string): string[] => {
  const file = path.join(folder, CONF_FILE);
  if (!isFile(file)) {
    throw new RecordError([`${file} does not exist: a case holds ${CONF_FILE}, whose one key \`rows\` is the row script's command.`]);
  }
  const text = readText(file);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new RecordError([`${file}: it is not JSON (${messageOf(error)}).`]);
  }
  const conf = ConfSchema.safeParse(data);
  if (!conf.success) {
    // Other keys are named before a missing or malformed `rows`.
    const issue = conf.error.issues.find((each) => each.code === "unrecognized_keys") ?? conf.error.issues[0];
    throw new RecordError([`${file}: ${issue.message}`]);
  }
  return conf.data.rows;
};

// `readFreeze` is false only for --freeze, which replaces frozen.json and so never needs the old one to be valid.
const loadCase = (folderArg: string, readFreeze = true): Case => {
  const folder = resolvePath(folderArg);
  if (path.basename(folder) !== CASE_FOLDER) {
    throw new RecordError([`${folder}: a case is a folder named exactly ${CASE_FOLDER}, and this one is named ${inspect(path.basename(folder))}.`]);
  }
  if (!isDir(folder)) {
    throw new RecordError([`${folder} is not a folder: a case is a folder named ${CASE_FOLDER} holding ${CONF_FILE}.`]);
  }
  const frozen = readFreeze ? readFrozen(path.join(folder, FROZEN_FILE)) : null;
  return new Case(folder, citationRoot(folder), frozen, readConf(folder));
};

// ---------------------------------------------------------------- the row script's pin

// The row script's file: the first element of the rows command that names an existing file, resolved against the case folder.
const scriptFile = (theCase: Case): string | null => {
  for (const part of theCase.rowsCommand) {
    const candidate = path.resolve(theCase.folder, part);
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
};

// The row script's file (relative to the case folder) and the sha256 of its bytes, or null when the command names no file.
const scriptPin = (theCase: Case): Frozen["script"] | null => {
  const file = scriptFile(theCase);
  if (file === null) {
    return null;
  }
  return { file: path.relative(theCase.folder, file), sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
};

// Why the row script is no longer the one frozen, or null when it is, or when nothing is frozen.
const pinMismatch = (theCase: Case): string | null => {
  if (theCase.frozen === null) {
    return null;
  }
  const frozen = theCase.frozen.script;
  const now = scriptPin(theCase);
  if (now !== null && now.file === frozen.file && now.sha256 === frozen.sha256) {
    return null;
  }
  const nowText = now !== null ? `${now.file} sha256 ${now.sha256}` : "no file (the rows command names none that exists)";
  return (
    "the row script changed since the freeze, and must be frozen again.\n" +
    `  frozen:  ${frozen.file} sha256 ${frozen.sha256}\n` +
    `  now:     ${nowText}`
  );
};

const checkPass = (name: string): string => {
  if (!PASSES.includes(name)) {
    throw new RecordError([`${inspect(name)} is not a pass: the passes are ${PASSES.join(" and ")}.`]);
  }
  return name;
};

// ---------------------------------------------------------------- the table

const readTable = (theCase: Case): Row[] => {
  if (!isFile(theCase.tablePath)) {
    throw new RecordError([`${theCase.tablePath} does not exist: run \`rows\` first.`]);
  }
  const records = readJsonl(theCase.tablePath);
  const seen = new Set<string>();
  for (const record of records) {
    const rowId = record["Id"];
    if (!isStr(rowId)) {
      throw new RecordError([`${theCase.tablePath}: a row has no Id.`]);
    }
    if (seen.has(rowId)) {
      throw new RecordError([`${theCase.tablePath}: the Id ${rowId} is there twice.`]);
    }
    if (!isStr(record["Slice"])) {
      throw new RecordError([`${theCase.tablePath}: the row ${rowId} has no Slice.`]);
    }
    seen.add(rowId);
  }
  const rows: Row[] = [];
  for (const record of records) {
    for (const field of [EXPECTED, CANTHAPPEN, SHORTFALL, TEST]) {
      if (!(field in record)) {
        throw new RecordError([`${theCase.tablePath}: the row ${record["Id"]} has no ${field}.`]);
      }
    }
    const row = RowSchema.safeParse(record);
    if (!row.success) {
      throw new RecordError([`${theCase.tablePath}: the row ${record["Id"]} has a malformed ${row.error.issues[0].path.join(".")}.`]);
    }
    rows.push(row.data);
  }
  return rows;
};

const sliceOf = (row: Row): string => row.Slice;

const isValue = (fieldObject: unknown): fieldObject is Value => ValueSchema.safeParse(fieldObject).success;

const isQuestion = (fieldObject: unknown): fieldObject is Question => QuestionSchema.safeParse(fieldObject).success;

const isMerged = (fieldObject: unknown): fieldObject is Value | Question => isValue(fieldObject) || isQuestion(fieldObject);

// The fields a row has to fill: every key that holds null (not filled yet) or a merged field.
const fieldsOf = (row: Row): string[] =>
  Object.entries(row)
    .filter(([key, held]) => !ROW_KEYS.includes(key) && !LEDGER_FIELDS.includes(key) && (held === null || isMerged(held)))
    .map(([key]) => key);

const fillFieldsOf = (row: Row): string[] => fieldsOf(row).filter((field) => field !== TEST);

const passFieldsOf = (row: Row, passName: string): string[] => (passName === TEST_PASS ? [TEST] : fillFieldsOf(row));

// The fields of the fill pass that hold an expected value: every one but CantHappen and Shortfall.
const expectedFieldsOf = (row: Row): string[] => fillFieldsOf(row).filter((field) => field !== CANTHAPPEN && field !== SHORTFALL);

const hasConfirmedChain = (row: Row): boolean => isValue(row[CANTHAPPEN]);

const expectedColour = (row: Row): Colour => (isValue(row[SHORTFALL]) ? "red" : "green");

const readRulings = (theCase: Case): Set<string> => {
  if (!isFile(theCase.rulingsPath)) {
    return new Set();
  }
  return new Set(Array.from(readText(theCase.rulingsPath).matchAll(RULING_LINE), ([, rowId, field]) => pairKey(rowId, field)));
};

// ---------------------------------------------------------------- citations

const normalise = (text: string): string => text.trim().replace(/\s+/g, " ");

// Lower-case, then only letters and digits: how a test's name is matched to a row's id, in any case style.
const normaliseName = (text: string): string => text.toLowerCase().replace(NOT_ALNUM, "");

// The files a case's citations name, read once each, with whitespace runs as one space.
class Sources {
  root: string;
  cache = new Map<string, string>();

  constructor(root: string) {
    this.root = root;
  }

  // The one place a citation's File becomes a path: under root, or `meridian:<name>` in the skill's references/.
  locate(name: string): [string | null, string] {
    if (name.startsWith(MERIDIAN_PREFIX)) {
      const ruleFile = name.slice(MERIDIAN_PREFIX.length);
      if (!MERIDIAN_FILE.test(ruleFile)) {
        return [null, "is not a rules-*.md file name"];
      }
      const file = path.join(REFERENCES, ruleFile);
      if (!isFile(file)) {
        return [null, "does not exist in the skill's references/ folder"];
      }
      return [file, ""];
    }
    let file: string;
    try {
      file = resolvePath(path.resolve(this.root, name));
    } catch {
      return [null, "is not a readable path"];
    }
    if (!isRelativeTo(file, this.root)) {
      return [null, "is not under root"];
    }
    if (!isFile(file)) {
      return [null, "does not exist"];
    }
    return [file, ""];
  }

  text(file: string): string {
    let text = this.cache.get(file);
    if (text === undefined) {
      text = normalise(readFileSync(file, "utf8"));
      this.cache.set(file, text);
    }
    return text;
  }

  // The first citation of a merged field whose file is missing or whose quote is gone.
  staleCite(fieldObject: unknown): Cite | null {
    for (const cite of isValue(fieldObject) ? fieldObject.Cites : []) {
      const [file] = this.locate(cite.File);
      if (file === null || !this.text(file).includes(normalise(cite.Quote))) {
        return cite;
      }
    }
    return null;
  }
}

// The files a `written` source may not cite for a row: the row script, the file its `Where` points into, and the records.
const barredForWritten = (theCase: Case, row: Row | undefined): Set<string> => {
  const barred = new Set(RECORD_FILES.map((name) => resolvePath(path.join(theCase.folder, name))));
  const script = scriptFile(theCase);
  if (script !== null) {
    barred.add(resolvePath(script));
  }
  const where = row === undefined ? undefined : row["Where"];
  if (typeof where === "string" && where.trim() !== "") {
    const name = where.trim().replace(LINE_SUFFIX, "");
    for (const base of [theCase.folder, theCase.root]) {
      try {
        barred.add(resolvePath(path.resolve(base, name)));
      } catch {
        // Not a readable path, so there is no file to bar.
      }
    }
  }
  return barred;
};

const inRecords = (theCase: Case, file: string): boolean =>
  RECORD_FOLDERS.some((name) => isRelativeTo(file, resolvePath(path.join(theCase.folder, name))));

// ---------------------------------------------------------------- --freeze

const cmdFreeze = (caseArg: string, words: string): number => {
  const theCase = loadCase(caseArg, false);
  const pin = scriptPin(theCase);
  if (pin === null) {
    throw new RecordError([
      `${path.join(theCase.folder, CONF_FILE)}: no element of \`rows\` (${theCase.rowsCommand.join(" ")}) names an existing file when resolved against ${theCase.folder}, so the script file can't be found and there is nothing to freeze.`,
    ]);
  }
  if (!isStr(words)) {
    throw new RecordError(["--words is empty: the freeze records the user's words."]);
  }
  const frozen: Frozen = { date: today(), words, script: pin };
  writeFileSync(theCase.frozenPath, `${JSON.stringify(frozen)}\n`, "utf8");
  console.log(`${theCase.label}: row script frozen ${frozen.date}: ${frozen.words}`);
  console.log(`  pinned ${pin.file} sha256 ${pin.sha256}`);
  return 0;
};

// ---------------------------------------------------------------- --rows

const runRowScript = (theCase: Case): Row[] => {
  const command = [...theCase.rowsCommand, theCase.folder];
  const run = spawnSync(command[0], command.slice(1), { cwd: theCase.folder, stdio: ["inherit", "pipe", "pipe"], maxBuffer: Infinity });
  if (run.error !== undefined) {
    throw new RecordError([`the row script could not start (${systemMessage(run.error)}): ${command.join(" ")}`]);
  }
  let stdout: string;
  let stderr: string;
  try {
    stdout = UTF8.decode(run.stdout);
    stderr = UTF8.decode(run.stderr);
  } catch {
    throw new RecordError(["the row script's output is not UTF-8 text, on stdout or stderr."]);
  }
  process.stderr.write(stderr);
  if (run.status !== 0) {
    throw new RecordError([`the row script exited ${run.status ?? run.signal}.`]);
  }
  const problems: string[] = [];
  const rows: JsonObject[] = [];
  const seen = new Set<string>();
  const byNormal = new Map<string, string>();
  for (const [index, line] of stdout.split("\n").entries()) {
    const number = index + 1;
    if (line.trim() === "") {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      problems.push(`row script line ${number} is not JSON.`);
      continue;
    }
    const record = JsonObjectSchema.safeParse(parsed);
    if (!record.success) {
      problems.push(`row script line ${number} is not a JSON object.`);
      continue;
    }
    const row = record.data;
    const rowId = row["Id"];
    if (!isStr(rowId)) {
      problems.push(`row script line ${number} has no Id.`);
      continue;
    }
    if (/[\s\]]/.test(rowId)) {
      problems.push(`row script line ${number}: the Id ${inspect(rowId)} holds whitespace or \`]\`.`);
    }
    if (seen.has(rowId)) {
      problems.push(`row script line ${number}: the Id ${rowId} is printed twice.`);
    } else {
      const matched = normaliseName(rowId);
      const same = byNormal.get(matched);
      if (matched === "") {
        problems.push(`row script line ${number}: the Id ${inspect(rowId)} holds no letter or digit, so no test name can match it.`);
      } else if (same !== undefined) {
        problems.push(
          `row script line ${number}: the Ids ${inspect(same)} and ${inspect(rowId)} are equal once compared lower-case with only letters and digits, so a test name could not tell them apart.`,
        );
      } else {
        byNormal.set(matched, rowId);
      }
    }
    seen.add(rowId);
    for (const [key, held] of Object.entries(row)) {
      if (LEDGER_FIELDS.includes(key)) {
        problems.push(`${rowId}: the row script prints ${key}, which is the ledger's field.`);
      } else if ((key === CANTHAPPEN || key === SHORTFALL) && held !== null) {
        problems.push(`${rowId}: the row script prints ${key} with a value: it must print it as null, for the filler.`);
      } else if (hasMergedShape(held)) {
        problems.push(`${rowId}: the row script prints ${key} as an object holding Value or Question, which is the shape of a merged field.`);
      } else if (held === null && !ROW_KEYS.includes(key) && !NAME.test(key)) {
        problems.push(`${rowId}: ${inspect(key)} is printed as null, so it is a field to fill, and can't be a field name.`);
      }
    }
    const printedNull = Object.entries(row)
      .filter(([key, held]) => held === null && !ROW_KEYS.includes(key))
      .map(([key]) => key);
    if (printedNull.filter((key) => key !== TEST).length === 0) {
      problems.push(`${rowId}: the row script prints no field to fill: every field to fill is printed as null, and Test alone is not one.`);
    }
    if (row[TEST] !== null) {
      problems.push(`${rowId}: the row script must print Test as null.`);
    }
    // An expected value reaches the table only through a confirmed fill, never from the row script.
    if (row[EXPECTED] !== null) {
      problems.push(`${rowId}: the row script must print Expected as null.`);
    }
    for (const field of [CANTHAPPEN, SHORTFALL]) {
      if (!(field in row)) {
        problems.push(`${rowId}: the row script prints no ${field}: every row carries ${EXPECTED}, ${CANTHAPPEN}, ${SHORTFALL}, and ${TEST}.`);
      }
    }
    if ("Slice" in row && !isSliceName(row["Slice"])) {
      problems.push(`${rowId}: Slice ${inspect(row["Slice"])} is not a folder name: it must be text with no slash or NUL, and not \`.\` or \`..\`.`);
    }
    if (!("Slice" in row)) {
      row["Slice"] = "all";
    }
    rows.push(row);
  }
  if (problems.length > 0) {
    throw new RecordError(problems);
  }
  return rows.map((row) => RowSchema.parse(row));
};

const cmdRows = (caseArg: string, draft: boolean): number => {
  const theCase = loadCase(caseArg);
  const mismatch = pinMismatch(theCase);
  if (mismatch !== null && !draft) {
    console.log(`nothing was written: ${mismatch}`);
    return 1;
  }
  const printed = runRowScript(theCase);
  const frozen = theCase.frozen;
  if (draft || frozen === null) {
    for (const row of printed) {
      console.log(JSON.stringify(row));
    }
    if (draft) {
      if (mismatch !== null) {
        console.log(`note: ${mismatch}`);
      }
      console.log("nothing was written: --draft.");
      return 0;
    }
    console.log(`nothing was written: the case has no ${FROZEN_FILE}; the user freezes the row script first, with \`freeze\`.`);
    return 1;
  }

  const old = isFile(theCase.tablePath) ? readTable(theCase) : [];
  const printedById = new Map(printed.map((row) => [row.Id, row]));
  const oldIds = new Set(old.map((row) => row.Id));
  const rows: Row[] = [];
  const problems: string[] = [];
  for (const oldRow of old) {
    const printedRow = printedById.get(oldRow.Id);
    if (printedRow !== undefined) {
      const row = { ...printedRow };
      for (const [key, value] of Object.entries(oldRow)) {
        if (["Ran", "Struck"].includes(key)) {
          row[key] = value;
        } else if (isMerged(value)) {
          if (row[key] === undefined || row[key] === null) {
            row[key] = value;
          } else {
            problems.push(`${oldRow.Id}: the row script now prints ${key} with a value, and the table holds a merged ${key}: a merged field is never dropped.`);
          }
        }
      }
      rows.push(row);
    } else {
      rows.push({ ...oldRow, Gone: true });
    }
  }
  if (problems.length > 0) {
    throw new RecordError(problems);
  }
  const fresh = printed.filter((row) => !oldIds.has(row.Id));
  rows.push(...fresh.map((row) => ({ ...row })));

  const sources = new Sources(theCase.root);
  const emptied: string[] = [];
  for (const row of rows) {
    for (const field of fieldsOf(row)) {
      const stale = sources.staleCite(row[field]);
      if (stale !== null) {
        row[field] = null;
        emptied.push(`${row.Id}.${field} (cites ${stale.File}, and the quote is gone)`);
      }
    }
  }
  writeJsonl(theCase.tablePath, rows);

  console.log(`${theCase.label}: row script frozen ${frozen.date}: ${frozen.words}`);
  const gone = rows.filter((row) => row.Gone).length;
  console.log(`rows: ${rows.length}, new: ${fresh.length}, gone: ${gone}, fields emptied: ${emptied.length}`);
  for (const entry of emptied) {
    console.log(`  emptied ${entry}`);
  }
  return 0;
};

// ---------------------------------------------------------------- --check

const shapesOf = (record: JsonObject): Shape[] => {
  const shapes: Shape[] = [];
  if ("Value" in record || "Cites" in record) {
    shapes.push("value");
  }
  if ("Question" in record || "Recommend" in record) {
    shapes.push("question");
  }
  if ("Empty" in record) {
    shapes.push("empty");
  }
  return shapes;
};

// The parity gate: every problem of one pass's fill for one slice, and the fill records.
const parity = (theCase: Case, passName: string, sliceName: string, table: Row[]): [string[], JsonObject[]] => {
  checkPass(passName);
  const fillPath = path.join(theCase.folder, passName, "filled", sliceName, "fields.jsonl");
  if (!isFile(fillPath)) {
    return [[`${fillPath} does not exist: the filler wrote nothing for this pass and slice.`], []];
  }
  const records = readJsonl(fillPath);
  const sliceRows = new Map(table.filter((row) => sliceOf(row) === sliceName).map((row) => [row.Id, row]));
  if (sliceRows.size === 0) {
    throw new RecordError([`${theCase.tablePath}: no row has the slice ${inspect(sliceName)}.`]);
  }
  const sources = new Sources(theCase.root);
  const rulings = readRulings(theCase);
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, record] of records.entries()) {
    const rowId = record["Id"];
    const field = record["Field"];
    if (!isStr(rowId) || !isStr(field)) {
      problems.push(`record ${index + 1}: it has no Id or no Field.`);
      continue;
    }
    const label = `${rowId}.${field}`;
    const row = sliceRows.get(rowId);
    if (row === undefined) {
      problems.push(`${label}: ${rowId} is not a row of the slice ${sliceName}.`);
    } else if (!passFieldsOf(row, passName).includes(field)) {
      problems.push(`${label}: ${field} is not a field of the pass ${passName} for this row.`);
    }
    if (seen.has(pairKey(rowId, field))) {
      problems.push(`${label}: it is filled twice.`);
    }
    seen.add(pairKey(rowId, field));

    const shapes = shapesOf(record);
    if (shapes.length !== 1) {
      problems.push(`${label}: it must be exactly one of a value with citations, a question with a recommendation, or empty with a reason; it is ${shapes.length}.`);
      continue;
    }
    const shape = shapes[0];
    const extra = Object.keys(record)
      .filter((key) => key !== "Id" && key !== "Field" && !SHAPE_KEYS[shape].includes(key))
      .sort();
    if (extra.length > 0) {
      problems.push(`${label}: it has keys outside its shape: ${extra.join(", ")}.`);
    }
    if ((field === CANTHAPPEN || field === SHORTFALL) && shape !== "value") {
      problems.push(`${label}: ${field} is only ever a value with citations.`);
    }

    if (shape === "question") {
      if (!isStr(record["Question"]) || !isStr(record["Recommend"])) {
        problems.push(`${label}: a question has an empty Question or Recommend.`);
      }
    } else if (shape === "empty") {
      if (!isStr(record["Empty"])) {
        problems.push(`${label}: Empty says nothing about what stopped the filler.`);
      }
    } else {
      problems.push(...checkValue(theCase, passName, record, label, rowId, field, sources, row));
    }
  }

  for (const row of sliceRows.values()) {
    if (row.Struck || hasConfirmedChain(row)) {
      continue;
    }
    for (const field of passFieldsOf(row, passName)) {
      if (field === CANTHAPPEN || field === SHORTFALL || seen.has(pairKey(row.Id, field))) {
        continue;
      }
      const held = row[field];
      if (isValue(held) || (isQuestion(held) && !rulings.has(pairKey(row.Id, field)))) {
        continue;
      }
      problems.push(`${row.Id}.${field}: unfilled: the filler wrote no record for it.`);
    }
  }
  return [problems, records];
};

const checkValue = (
  theCase: Case,
  passName: string,
  record: JsonObject,
  label: string,
  rowId: string,
  field: string,
  sources: Sources,
  row: Row | undefined,
): string[] => {
  const problems: string[] = [];
  const expected = passName === FILL && field !== CANTHAPPEN && field !== SHORTFALL;
  const source = record["Source"];
  const words = SOURCE_WORDS.join(", ");
  const isSourceWord = SourceSchema.safeParse(source).success;
  if (source === undefined || source === null) {
    if (expected) {
      problems.push(`${label}: ${field} is an expected value and has no Source (one of ${words}).`);
    }
  } else if (!isSourceWord) {
    problems.push(`${label}: Source ${inspect(source)} is not one of ${words}.`);
  }
  const sourceFits = expected && isSourceWord;
  if (sourceFits && source === "judgement" && !isStr(record["Why"])) {
    problems.push(`${label}: Source judgement needs a Why: the judgement's reasons, in text.`);
  }
  if (!isStr(record["Value"])) {
    problems.push(`${label}: the value is empty.`);
  }
  const cites = record["Cites"];
  if (!Array.isArray(cites) || cites.length === 0) {
    problems.push(`${label}: a value has no citation.`);
    return problems;
  }
  const barred = sourceFits && source === "written" ? barredForWritten(theCase, row) : new Set<string>();
  const wellFormed: Cite[] = [];
  for (const held of cites) {
    const parsed = CiteSchema.safeParse(held);
    if (!parsed.success) {
      problems.push(`${label}: a citation must be exactly a File and a Quote, both text.`);
      continue;
    }
    const cite = parsed.data;
    wellFormed.push(cite);
    const [file, why] = sources.locate(cite.File);
    if (file === null) {
      problems.push(`${label}: it cites ${cite.File}, which ${why}.`);
      continue;
    }
    const quote = normalise(cite.Quote);
    if (quote.length < 3) {
      problems.push(`${label}: a quote from ${cite.File} is under 3 characters.`);
    } else if (!sources.text(file).includes(quote)) {
      problems.push(`${label}: the quote ${inspect(cite.Quote.slice(0, 60))} is not in ${cite.File}.`);
    }
    if (sourceFits && source === "written") {
      if (cite.File.startsWith(MERIDIAN_PREFIX)) {
        problems.push(`${label}: Source written may cite only a file under root, not ${cite.File}.`);
      } else if (file === resolvePath(theCase.rulingsPath)) {
        problems.push(`${label}: Source written may not cite rulings.md: a ruling is Source ruling.`);
      } else if (barred.has(file) || inRecords(theCase, file)) {
        problems.push(`${label}: Source written may not cite ${cite.File}: it is the row script, the code the row's Where points into, or one of the case's own records.`);
      }
    }
    if (sourceFits && source === "ruling" && file !== resolvePath(theCase.rulingsPath)) {
      problems.push(`${label}: Source ruling may cite only rulings.md, not ${cite.File}.`);
    }
  }
  const citesMeridian = cites.some((held) => {
    const cite = JsonObjectSchema.safeParse(held);
    const file = cite.success ? cite.data["File"] : undefined;
    return typeof file === "string" && file.startsWith(MERIDIAN_PREFIX);
  });
  if (sourceFits && source === "meridian" && !citesMeridian) {
    problems.push(`${label}: Source meridian needs a citation whose File is meridian:<a rules-*.md file of the skill's references/>.`);
  }
  if (field === TEST && wellFormed.length === cites.length && !wellFormed.some((cite) => normaliseName(cite.Quote).includes(normaliseName(rowId)))) {
    problems.push(`${label}: no citation's quote holds this row's id (compared lower-case, letters and digits only), so the test is not shown to name its row.`);
  }
  return problems;
};

const cmdCheck = (caseArg: string, passName: string, sliceName: string): number => {
  const theCase = loadCase(caseArg);
  checkPass(passName);
  const table = readTable(theCase);
  const [problems, records] = parity(theCase, passName, sliceName, table);
  const where = `${theCase.label} ${passName} ${sliceName}`;
  if (problems.length > 0) {
    console.log(`${where}: parity fails:\n  ${problems.join("\n  ")}`);
    return 1;
  }
  const count = (shape: Shape): number => records.filter((record) => isDeepStrictEqual(shapesOf(record), [shape])).length;
  const rows = table.filter((row) => sliceOf(row) === sliceName).length;
  console.log(
    `${where}: parity is sound: ${rows} rows, ${records.length} records (${count("value")} values, ${count("question")} questions, ${count("empty")} empty).`,
  );
  return 0;
};

// ---------------------------------------------------------------- --merge

const cmdMerge = (caseArg: string, passName: string, sliceName: string): number => {
  const theCase = loadCase(caseArg);
  checkPass(passName);
  const table = readTable(theCase);
  const [problems, records] = parity(theCase, passName, sliceName, table);
  const where = `${theCase.label} ${passName} ${sliceName}`;
  if (problems.length > 0) {
    console.log(`${where}: parity fails, so nothing merges:\n  ${problems.join("\n  ")}`);
    return 1;
  }
  const fills = records.map((record) => FillRecordSchema.parse(record));

  const verdictPath = path.join(theCase.folder, passName, "verdicts", `${sliceName}.jsonl`);
  if (!isFile(verdictPath)) {
    throw new RecordError([`${verdictPath} does not exist: no verdicts, nothing merges.`]);
  }
  const held = new Set(fills.map((record) => pairKey(record.Id, record.Field)));
  const verdicts = new Map<string, Verdict>();
  const judged = new Set<string>();
  const bad: string[] = [];
  for (const [index, record] of readJsonl(verdictPath).entries()) {
    const missing = VERDICT_KEYS.filter((key) => !(key in record));
    if (missing.length > 0) {
      bad.push(`${verdictPath}: record ${index + 1} lacks ${missing.join(", ")}.`);
      continue;
    }
    const rowId = record["Id"];
    const field = record["Field"];
    if (!isStr(rowId) || !isStr(field)) {
      bad.push(`${verdictPath}: record ${index + 1}: Id and Field must be text.`);
      continue;
    }
    const key = pairKey(rowId, field);
    const verdict = VerdictSchema.safeParse(record);
    if (!verdict.success) {
      bad.push(`${verdictPath}: ${rowId}.${field}: Verdict ${inspect(record["Verdict"])} is not one of ${VERDICTS.join(", ")}.`);
    }
    if (!held.has(key)) {
      bad.push(`${verdictPath}: ${rowId}.${field} is no record of the fill: the verdicts and the fill disagree.`);
    }
    if (judged.has(key)) {
      bad.push(`${verdictPath}: ${rowId}.${field} has two verdicts.`);
    }
    judged.add(key);
    if (verdict.success) {
      verdicts.set(key, verdict.data);
    }
  }
  if (bad.length > 0) {
    throw new RecordError(bad);
  }

  const rows = new Map(table.map((row) => [row.Id, row]));
  let merged = 0;
  let stayEmpty = 0;
  for (const record of fills) {
    if (shapesOf(record)[0] === "empty") {
      stayEmpty += 1;
      continue;
    }
    const { Id: rowId, Field: field, ...fieldObject } = record;
    const verdict = verdicts.get(pairKey(rowId, field));
    const row = rows.get(rowId);
    if (row === undefined) {
      throw new Error(`${rowId} passed the parity gate and is not a row of the table.`);
    }
    if (verdict !== undefined && verdict.Verdict === "CONFIRMED" && isDeepStrictEqual(verdict.Judged, fieldObject)) {
      row[field] = fieldObject;
      merged += 1;
    } else {
      row[field] = null;
      stayEmpty += 1;
    }
  }
  writeJsonl(theCase.tablePath, table);
  console.log(`${where}: ${merged} fields merged; ${stayEmpty} stay empty, which leaves those rows open.`);
  return 0;
};

// ---------------------------------------------------------------- --results

// The row id a test names: the one whose normalised id equals the normalised test name, or none.
// Two ids that are equal once normalised can't be in one table, because --rows refuses them, so at most one row is named.
const rowNamedBy = (testName: string, rowIds: string[]): string | null => {
  const name = normaliseName(testName);
  const hit = rowIds.find((rowId) => normaliseName(rowId) === name);
  return hit === undefined ? null : hit;
};

const hasChild = (element: Element, tag: string): boolean => Array.from(element.childNodes).some((child) => child.nodeName === tag);

// Each row a test's name equals -> red, not-run, or green, over every file of one run.
const junitResults = (files: string[], rowIds: string[]): Map<string, Colour> => {
  const colours = new Map<string, Colour[]>();
  for (const file of files) {
    let testcases: Element[];
    try {
      const tree = new DOMParser({ onError: onWarningStopParsing }).parseFromString(UTF8.decode(readFileSync(file)), "text/xml");
      testcases = Array.from(tree.getElementsByTagName("testcase"));
    } catch (error) {
      throw new RecordError([`${file}: it can't be read as JUnit XML (${messageOf(error)}).`]);
    }
    for (const testcase of testcases) {
      let colour: Colour;
      if (hasChild(testcase, "failure") || hasChild(testcase, "error")) {
        colour = "red";
      } else if (hasChild(testcase, "skipped")) {
        colour = "not-run";
      } else {
        colour = "green";
      }
      const testName = testcase.getAttribute("name") ?? "";
      const named = rowNamedBy(testName, rowIds);
      if (named !== null) {
        colours.set(named, [...(colours.get(named) ?? []), colour]);
      }
    }
  }
  return new Map(
    Array.from(colours, ([rowId, each]): [string, Colour] => [rowId, each.includes("red") ? "red" : each.includes("not-run") ? "not-run" : "green"]),
  );
};

const cmdResults = (caseArg: string, files: string[], sliceName: string | undefined): number => {
  const theCase = loadCase(caseArg);
  const table = readTable(theCase);
  const results = junitResults(
    files,
    table.map((row) => row.Id),
  );
  const scope = table.filter((row) => sliceName === undefined || sliceOf(row) === sliceName);
  if (scope.length === 0) {
    throw new RecordError([`${theCase.tablePath}: no row has the slice ${inspect(sliceName)}.`]);
  }
  for (const row of table) {
    const ran = results.get(row.Id);
    if (ran !== undefined) {
      row.Ran = ran;
    } else {
      delete row.Ran;
    }
  }
  writeJsonl(theCase.tablePath, table);

  const red: string[] = [];
  const notReady: string[] = [];
  let ready = 0;
  for (const row of scope) {
    if (row.Struck || row.Gone || hasConfirmedChain(row)) {
      continue;
    }
    const lacking = expectedFieldsOf(row).filter((field) => !isValue(row[field]));
    if (lacking.length > 0) {
      const why = lacking.map((field) => (isQuestion(row[field]) ? `${field} is a question` : `${field} is missing`)).join(", ");
      notReady.push(`${row.Id}: not ready for a test: ${why}`);
      continue;
    }
    ready += 1;
    const ran = row.Ran;
    const expects = expectedColour(row);
    if (ran === undefined) {
      red.push(`${row.Id}: no run result`);
    } else if (ran === "not-run") {
      red.push(`${row.Id}: no run result: its test was skipped`);
    } else if (ran !== expects) {
      red.push(`${row.Id}: ran ${ran}, the table expects ${expects}`);
    }
  }
  console.log(`${theCase.label}: Ran written on ${results.size} rows from ${files.length} files; ${ready} ready rows judged.`);
  for (const line of notReady) {
    console.log(`  ${line}`);
  }
  if (red.length > 0) {
    console.log("results are red:");
    for (const line of red) {
      console.log(`  ${line}`);
    }
    return 1;
  }
  console.log("results are as the table expects.");
  return 0;
};

// ---------------------------------------------------------------- --rule and --strike

const cmdRule = (caseArg: string, rowId: string, field: string, words: string): number => {
  const theCase = loadCase(caseArg);
  const table = readTable(theCase);
  const row = table.find((each) => each.Id === rowId);
  if (row === undefined) {
    throw new RecordError([`${rowId} is not a row of the table; nothing is ruled.`]);
  }
  if (!fieldsOf(row).includes(field)) {
    throw new RecordError([`${field} is not a field to fill on ${rowId}; nothing is ruled.`]);
  }
  const oneLine = words.replace(/\r\n|\r|\n/g, " ");
  let line = `- ${today()} · ${rowId} · ${field}: ${oneLine}\n`;
  const existing = isFile(theCase.rulingsPath) ? readText(theCase.rulingsPath) : "";
  if (existing !== "" && !existing.endsWith("\n")) {
    line = `\n${line}`;
  }
  appendFileSync(theCase.rulingsPath, line, "utf8");
  console.log(`${rowId}.${field}: ruled; the filler is sent again for its pass and slice, and cites this line of rulings.md.`);
  return 0;
};

const cmdStrike = (caseArg: string, rowId: string, why: string): number => {
  const theCase = loadCase(caseArg);
  const table = readTable(theCase);
  for (const row of table) {
    if (row.Id === rowId) {
      row.Struck = { Why: why, Date: today() };
      writeJsonl(theCase.tablePath, table);
      console.log(`${rowId} is struck. ${why}`);
      return 0;
    }
  }
  throw new RecordError([`${rowId} is not a row of the table; nothing is struck.`]);
};

// ---------------------------------------------------------------- --open

// Why a row is open, or null when it is closed: the first of the closing rules that holds.
const openReason = (row: Row, sources: Sources, rulings: Set<string>): string | null => {
  if (row.Struck) {
    return null;
  }
  if (row.Gone) {
    return "gone from the row script; only a strike closes it";
  }
  for (const field of fieldsOf(row)) {
    const stale = sources.staleCite(row[field]);
    if (stale !== null) {
      return `stale: ${field} cites ${stale.File}, and the quote is gone`;
    }
  }
  if (hasConfirmedChain(row)) {
    return null;
  }
  for (const field of expectedFieldsOf(row)) {
    const held = row[field];
    if (isQuestion(held) && !rulings.has(pairKey(row.Id, field))) {
      return `question for the user: ${field}`;
    }
    if (!isValue(held)) {
      return `unfilled: ${FILL}.${field}`;
    }
  }
  if (!isValue(row[TEST])) {
    return "no confirmed test";
  }
  const ran = row.Ran;
  if (ran === undefined || ran === "not-run") {
    return "no run result";
  }
  if (ran !== expectedColour(row)) {
    return `ran ${ran}, the table expects ${expectedColour(row)}`;
  }
  return null;
};

const cmdOpen = (caseArg: string): number => {
  const theCase = loadCase(caseArg);
  const table = readTable(theCase);
  if (table.length === 0) {
    console.log("the table has no rows; the row script printed none.");
    return 1;
  }
  const sources = new Sources(theCase.root);
  const rulings = readRulings(theCase);
  const openRows: [Row, string][] = [];
  for (const row of table) {
    const reason = openReason(row, sources, rulings);
    if (reason !== null) {
      openRows.push([row, reason]);
    }
  }
  if (openRows.length > 0) {
    console.log(`${openRows.length} of the case's ${table.length} rows are open:`);
    for (const [row, reason] of openRows) {
      console.log(`  ${row.Id}: ${reason}`);
    }
  } else {
    console.log("0 rows open; every row closed.");
  }
  const asks: string[] = [];
  for (const row of table) {
    // A strike retires the row's question.
    if (row.Struck) {
      continue;
    }
    for (const field of fieldsOf(row)) {
      const held = row[field];
      if (isQuestion(held) && !rulings.has(pairKey(row.Id, field))) {
        asks.push(`  ${row.Id}: ${held.Question} (recommended: ${held.Recommend})`);
      }
    }
  }
  if (asks.length > 0) {
    console.log("rows for the user:");
    for (const line of asks) {
      console.log(line);
    }
  }
  const fromToday: string[] = [];
  for (const row of table) {
    if (row.Struck || row.Gone) {
      continue;
    }
    for (const field of expectedFieldsOf(row)) {
      const held = row[field];
      if (isValue(held) && held.Source === "today") {
        fromToday.push(`  ${row.Id}: ${field}`);
      }
    }
  }
  if (fromToday.length > 0) {
    console.log("expected from today's code:");
    for (const line of fromToday) {
      console.log(line);
    }
  }
  return openRows.length > 0 ? 1 : 0;
};

// ---------------------------------------------------------------- the run

const main = (argv: string[]): number => {
  let exit = 0;
  // exitOverride comes first: each command below inherits it, so commander throws where it would exit.
  const program = new Command("ledger.ts")
    .description("Checks, merges, and lists the records of a test-oracle case: a folder named __oracle__.")
    .exitOverride();
  program
    .command("freeze <case>")
    .description("record the user's word that the row script is right, and pin the script's sha256, in frozen.json")
    .requiredOption("--words <words>", "the user's words")
    .action((caseArg: string, options: { words: string }) => {
      exit = cmdFreeze(caseArg, options.words);
    });
  program
    .command("rows <case>")
    .description("run the row script (the command in oracle.conf.json, given the case folder's path) and merge its rows into table/rows.jsonl")
    .option("--draft", "print the rows and write nothing")
    .action((caseArg: string, options: { draft?: boolean }) => {
      exit = cmdRows(caseArg, options.draft === true);
    });
  program
    .command("check <case> <pass> <slice>")
    .description("the parity gate; <pass> is fill or test")
    .action((caseArg: string, passName: string, sliceName: string) => {
      exit = cmdCheck(caseArg, passName, sliceName);
    });
  program
    .command("merge <case> <pass> <slice>")
    .description("merge the fields a verdict confirmed; <pass> is fill or test")
    .action((caseArg: string, passName: string, sliceName: string) => {
      exit = cmdMerge(caseArg, passName, sliceName);
    });
  program
    .command("results <case> <junit...>")
    .description("write Ran from JUnit XML files and judge the rows")
    .option("--slice <slice>", "judge only this slice")
    .action((caseArg: string, files: string[], options: { slice?: string }) => {
      exit = cmdResults(caseArg, files, options.slice);
    });
  program
    .command("rule <case> <id> <field>")
    .description("record the user's ruling")
    .requiredOption("--words <words>", "the user's words")
    .action((caseArg: string, rowId: string, field: string, options: { words: string }) => {
      exit = cmdRule(caseArg, rowId, field, options.words);
    });
  program
    .command("strike <case> <id>")
    .description("record the user's strike")
    .requiredOption("--why <why>", "the user's words")
    .action((caseArg: string, rowId: string, options: { why: string }) => {
      exit = cmdStrike(caseArg, rowId, options.why);
    });
  program
    .command("open <case>")
    .description("say where the case stands")
    .action((caseArg: string) => {
      exit = cmdOpen(caseArg);
    });
  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      // Commander has already printed its message. Asking for help is no error; anything else is a bad command line.
      return error.exitCode === 0 ? 0 : 2;
    }
    if (error instanceof RecordError) {
      console.error(error.problems.join("\n"));
      return 2;
    }
    throw error;
  }
  return exit;
};

process.exitCode = main(process.argv.slice(2));
