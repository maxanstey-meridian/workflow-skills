import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SpecSchema } from "../src/spec-schema.ts";
import type { Piece, Spec } from "../src/spec-schema.ts";
import { validateSpec } from "../src/spec-validate.ts";

const makePiece = (id: string, owns: string[], after: string[] = []): Piece => ({
  id,
  name: `Piece ${id}`,
  owns,
  after,
  now: "Does not exist yet.",
  reuse: "Standard library.",
  change: "Create the module.",
  proof: "Run unit tests.",
});

const makeBaseSpec = (overrides: Partial<Spec> = {}): Spec =>
  SpecSchema.parse({
    title: "Sample spec",
    status: "agreed",
    intent: "Define a sample spec for validation tests.",
    decisions: [
      {
        id: "D1",
        title: "Use strict schemas",
        what: "Reject unknown keys.",
        why: "Catch typos immediately.",
        decidedBy: "agreed",
      },
    ],
    pieces: [makePiece("P1", ["src/a.ts"]), makePiece("P2", ["src/b.ts"], ["P1"])],
    doneMeans: [{ cmd: "pnpm test", proves: "All unit tests pass." }],
    ...overrides,
  });

describe("SpecSchema", () => {
  it("parses valid specs across all four statuses", () => {
    const draft = makeBaseSpec({
      status: "draft",
      openAsks: [
        {
          id: "A1",
          question: "Should we bundle?",
          rec: "Yes",
          settledBy: "User confirmation",
        },
      ],
    });
    assert.deepEqual(validateSpec(draft), []);

    const agreed = makeBaseSpec({ status: "agreed", openAsks: [] });
    assert.deepEqual(validateSpec(agreed), []);

    const buildingWithoutAsks = makeBaseSpec({
      status: "building",
      openAsks: [],
      builtPieces: ["P1"],
    });
    assert.deepEqual(validateSpec(buildingWithoutAsks), []);

    const buildingWithAsks = makeBaseSpec({
      status: "building",
      openAsks: [
        {
          id: "A1",
          question: "Follow-up detail?",
          rec: "Keep default",
          settledBy: "User confirmation",
        },
      ],
      builtPieces: ["P1"],
    });
    assert.deepEqual(validateSpec(buildingWithAsks), []);

    const built = makeBaseSpec({
      status: "built",
      openAsks: [],
      builtPieces: ["P1", "P2"],
    });
    assert.deepEqual(validateSpec(built), []);
  });

  it("rejects unknown top-level and nested keys via .strict()", () => {
    const topLevelUnknown = SpecSchema.safeParse({
      ...makeBaseSpec(),
      extraKey: "nope",
    });
    assert.equal(topLevelUnknown.success, false);

    const nestedUnknown = SpecSchema.safeParse({
      ...makeBaseSpec(),
      pieces: [
        {
          ...makePiece("P1", ["src/a.ts"]),
          unexpectedField: true,
        },
      ],
    });
    assert.equal(nestedUnknown.success, false);

    const oracleUnknown = SpecSchema.safeParse({
      ...makeBaseSpec(),
      oracleCase: {
        path: "__oracle__/case",
        kind: "cli",
        extra: 1,
      },
    });
    assert.equal(oracleUnknown.success, false);
  });

  it("rejects malformed piece, decision, and openAsk IDs", () => {
    const badPiece = SpecSchema.safeParse({
      ...makeBaseSpec(),
      pieces: [makePiece("X1", ["src/a.ts"])],
    });
    assert.equal(badPiece.success, false);

    const badDecision = SpecSchema.safeParse({
      ...makeBaseSpec(),
      decisions: [
        {
          id: "D",
          title: "Bad ID",
          what: "What",
          why: "Why",
          decidedBy: "agreed",
        },
      ],
    });
    assert.equal(badDecision.success, false);

    const badAsk = SpecSchema.safeParse({
      ...makeBaseSpec(),
      status: "draft",
      openAsks: [
        {
          id: "Q1",
          question: "Question?",
          rec: "Yes",
          settledBy: "User",
        },
      ],
    });
    assert.equal(badAsk.success, false);
  });
});

describe("validateSpec", () => {
  it("reports duplicate decision, piece, openAsk, and builtPieces IDs", () => {
    const dupDecision = makeBaseSpec({
      decisions: [
        {
          id: "D1",
          title: "First",
          what: "One",
          why: "Reason",
          decidedBy: "agreed",
        },
        {
          id: "D1",
          title: "Second",
          what: "Two",
          why: "Reason",
          decidedBy: "agent-when-handed-back",
        },
      ],
    });
    const dupDecisionIssues = validateSpec(dupDecision);
    assert.equal(dupDecisionIssues.length, 1);
    assert.match(dupDecisionIssues[0]?.message ?? "", /duplicate decision ID "D1"/);

    const dupPiece = makeBaseSpec({
      pieces: [makePiece("P1", ["src/a.ts"]), makePiece("P1", ["src/b.ts"])],
    });
    const dupPieceIssues = validateSpec(dupPiece);
    assert.equal(dupPieceIssues.length, 1);
    assert.match(dupPieceIssues[0]?.message ?? "", /duplicate piece ID "P1"/);

    const dupAsk = makeBaseSpec({
      status: "draft",
      openAsks: [
        { id: "A1", question: "Q1?", rec: "R1", settledBy: "User" },
        { id: "A1", question: "Q2?", rec: "R2", settledBy: "User" },
      ],
    });
    const dupAskIssues = validateSpec(dupAsk);
    assert.equal(dupAskIssues.length, 1);
    assert.match(dupAskIssues[0]?.message ?? "", /duplicate openAsk ID "A1"/);

    const dupBuilt = makeBaseSpec({
      status: "building",
      builtPieces: ["P1", "P1"],
    });
    const dupBuiltIssues = validateSpec(dupBuilt);
    assert.equal(dupBuiltIssues.length, 1);
    assert.match(dupBuiltIssues[0]?.message ?? "", /duplicate builtPieces ID "P1"/);
  });

  it("enforces status vs openAsks and builtPieces rules", () => {
    const draftNoAsks = makeBaseSpec({ status: "draft", openAsks: [] });
    const draftIssues = validateSpec(draftNoAsks);
    assert.equal(draftIssues.length, 1);
    assert.equal(draftIssues[0]?.path, "openAsks");
    assert.match(draftIssues[0]?.message ?? "", /draft/);

    const agreedWithAsks = makeBaseSpec({
      status: "agreed",
      openAsks: [{ id: "A1", question: "Open?", rec: "Yes", settledBy: "User" }],
    });
    const agreedIssues = validateSpec(agreedWithAsks);
    assert.equal(agreedIssues.length, 1);
    assert.equal(agreedIssues[0]?.path, "openAsks");
    assert.match(agreedIssues[0]?.message ?? "", /agreed/);

    const builtMissingPiece = makeBaseSpec({
      status: "built",
      openAsks: [],
      builtPieces: ["P1"],
    });
    const builtMissingIssues = validateSpec(builtMissingPiece);
    assert.equal(builtMissingIssues.length, 1);
    assert.equal(builtMissingIssues[0]?.path, "builtPieces");
    assert.match(builtMissingIssues[0]?.message ?? "", /P2/);

    const builtWithAsks = makeBaseSpec({
      status: "built",
      openAsks: [{ id: "A1", question: "Still open?", rec: "No", settledBy: "User" }],
      builtPieces: ["P1", "P2"],
    });
    const builtAskIssues = validateSpec(builtWithAsks);
    assert.equal(builtAskIssues.length, 1);
    assert.equal(builtAskIssues[0]?.path, "openAsks");
    assert.match(builtAskIssues[0]?.message ?? "", /built/);
  });

  it("reports duplicate owned paths within one piece and overlaps across pieces", () => {
    const dupWithinPiece = makeBaseSpec({
      pieces: [makePiece("P1", ["src/a.ts", "./src/a.ts"])],
    });
    const withinIssues = validateSpec(dupWithinPiece);
    assert.equal(withinIssues.length, 1);
    assert.equal(withinIssues[0]?.path, "pieces[0].owns[1]");
    assert.match(withinIssues[0]?.message ?? "", /duplicate owned path "src\/a\.ts"/);

    const overlapAcrossPieces = makeBaseSpec({
      pieces: [makePiece("P1", ["./a.ts"]), makePiece("P2", ["a.ts"])],
    });
    const overlapIssues = validateSpec(overlapAcrossPieces);
    assert.equal(overlapIssues.length, 1);
    assert.equal(overlapIssues[0]?.path, "pieces[1].owns[0]");
    assert.match(overlapIssues[0]?.message ?? "", /overlaps with piece "P1"/);
  });

  it("reports missing after IDs, self-cycles, and multi-node cycles while allowing valid DAGs", () => {
    const missingAfter = makeBaseSpec({
      pieces: [makePiece("P1", ["src/a.ts"], ["P99"])],
    });
    const missingIssues = validateSpec(missingAfter);
    assert.equal(missingIssues.length, 1);
    assert.equal(missingIssues[0]?.path, "pieces[0].after[0]");
    assert.match(missingIssues[0]?.message ?? "", /unknown piece "P99"/);

    const selfCycle = makeBaseSpec({
      pieces: [makePiece("P1", ["src/a.ts"], ["P1"])],
    });
    const selfIssues = validateSpec(selfCycle);
    assert.equal(selfIssues.length, 1);
    assert.equal(selfIssues[0]?.path, "pieces[0].after[0]");
    assert.match(selfIssues[0]?.message ?? "", /cannot depend on itself/);

    const threeNodeCycle = makeBaseSpec({
      pieces: [
        makePiece("P1", ["src/a.ts"], ["P2"]),
        makePiece("P2", ["src/b.ts"], ["P3"]),
        makePiece("P3", ["src/c.ts"], ["P1"]),
      ],
    });
    const cycleIssues = validateSpec(threeNodeCycle);
    assert.equal(cycleIssues.length, 1);
    assert.match(cycleIssues[0]?.message ?? "", /P1 -> P2 -> P3 -> P1/);

    const diamondDag = makeBaseSpec({
      pieces: [
        makePiece("P1", ["src/a.ts"]),
        makePiece("P2", ["src/b.ts"], ["P1"]),
        makePiece("P3", ["src/c.ts"], ["P1"]),
        makePiece("P4", ["src/d.ts"], ["P2", "P3"]),
      ],
    });
    assert.deepEqual(validateSpec(diamondDag), []);
  });

  it("reports unknown IDs in builtPieces", () => {
    const unknownBuilt = makeBaseSpec({
      status: "building",
      builtPieces: ["P1", "P99"],
    });
    const issues = validateSpec(unknownBuilt);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.path, "builtPieces[1]");
    assert.match(issues[0]?.message ?? "", /unknown piece "P99"/);
  });
});
