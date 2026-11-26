import type {
  AuditCommandRun,
  AuditDecision,
  AuditFinding,
  AuditNeed,
  AuditParked,
  AuditPiece,
  CycleAuditReport,
  CycleAuditSpecStatus,
  GoAuditReport,
  NotRun,
} from "./report-schemas.ts";
import { goAuditCycleBlockers } from "./report-validate.ts";
import type { Decision, ParkedItem, Spec } from "./spec-schema.ts";

const formatDecisionAuthority = (decidedBy: Decision["decidedBy"]): string =>
  decidedBy === "agreed" ? "Agreed" : "Chosen by the agent when handed back";

const formatParkedRec = (rec: ParkedItem["rec"]): string =>
  rec === "fold-in" ? "fold in" : "leave";

const formatPieceStatus = (status: AuditPiece["status"]): string => {
  if (status === "done") {
    return "done";
  }
  if (status === "not-done") {
    return "not done";
  }
  return "needs the user";
};

const formatSpecStatusTail = (specStatus: CycleAuditSpecStatus): string => {
  if (specStatus.status === "built") {
    return "built";
  }
  if (specStatus.status === "building") {
    return `building: ${specStatus.remaining}`;
  }
  return "none";
};

const renderAuditFindings = (findings: ReadonlyArray<AuditFinding>): string => {
  const lines = findings.map(
    (finding, index) => `${index + 1}. **${finding.title}:** ${finding.detail}`,
  );
  return `## Findings\n${lines.join("\n")}`;
};

const renderNeedsFromYou = (needs: ReadonlyArray<AuditNeed>): string => {
  if (needs.length === 0) {
    return "## Needs from you\nnone";
  }
  const lines = needs.map((need, index) => {
    if ("options" in need) {
      const optionLines = need.options.map((opt) => {
        const label = opt.label.trim();
        return opt.recommended === true
          ? `     - **${label} (Rec):** ${opt.summary}`
          : `     - **${label}:** ${opt.summary}`;
      });
      return [
        `${index + 1}. **${need.item}**`,
        `   - **What it is:** ${need.whatItIs}`,
        "   - **Options:**",
        ...optionLines,
      ].join("\n");
    }
    if (need.whatItIs !== undefined) {
      const structuredLines = [
        `${index + 1}. **${need.item}**`,
        `   - **What it is:** ${need.whatItIs}`,
        `   - **Action (Rec):** ${need.rec}`,
      ];
      if (need.detail !== undefined) {
        structuredLines.push(`   - **Detail:** ${need.detail}`);
      }
      return structuredLines.join("\n");
    }
    const head = `${index + 1}. **${need.item}** (rec: **${need.rec}**)`;
    if (need.detail !== undefined) {
      return `${head}\n   ${need.detail}`;
    }
    return head;
  });
  return `## Needs from you\n${lines.join("\n")}`;
};

const renderDecisionsSummary = (decisions: ReadonlyArray<AuditDecision>): string => {
  if (decisions.length === 0) {
    return "- **Decisions:** none";
  }
  const notBuilt = decisions.filter((decision) => decision.status === "not-built");
  if (notBuilt.length === 0) {
    return `- **Decisions:** All ${decisions.length} decisions honoured.`;
  }
  const honoured = decisions.filter((decision) => decision.status === "honoured");
  const parts: string[] = [];
  if (honoured.length > 0) {
    parts.push(`${honoured.map((decision) => decision.id).join(", ")} honoured`);
  }
  for (const decision of notBuilt) {
    if (decision.note !== undefined) {
      parts.push(`${decision.id} not built (${decision.note})`);
    } else {
      parts.push(`${decision.id} not built`);
    }
  }
  return `- **Decisions:** ${parts.join("; ")}.`;
};

const renderCheckedRuns = (checked: ReadonlyArray<AuditCommandRun>): string => {
  if (checked.length === 0) {
    return "- **Checked:** none";
  }
  const items = checked.map((run) => {
    const base = `\`${run.cmd}\` exit ${run.exit}`;
    if (run.note !== undefined) {
      return `${base} (${run.note})`;
    }
    return base;
  });
  return `- **Checked:** ${items.join("; ")}`;
};

const renderNotCheckedRuns = (notChecked: ReadonlyArray<NotRun>): string => {
  if (notChecked.length === 0) {
    return "- **Not checked:** none";
  }
  const items = notChecked.map((item) => `${item.check} (${item.reason})`);
  return `- **Not checked:** ${items.join("; ")}`;
};

const renderAuditParked = (parked: ReadonlyArray<AuditParked>): string => {
  const lines = parked.map(
    (entry, index) =>
      `${index + 1}. **${entry.item}** — ${entry.detail} (rec: **${formatParkedRec(entry.rec)}**, ${entry.why})`,
  );
  return `## Parked\n${lines.join("\n")}`;
};

const renderCyclePiecesSummary = (pieces: ReadonlyArray<AuditPiece>): string => {
  if (pieces.length === 0) {
    return "- **Pieces:** none";
  }
  const doneWithoutNote = pieces.filter(
    (piece) => piece.status === "done" && piece.note === undefined,
  );
  const rest = pieces.filter((piece) => piece.status !== "done" || piece.note !== undefined);
  const parts: string[] = [];
  if (doneWithoutNote.length > 0) {
    parts.push(`${doneWithoutNote.map((piece) => piece.id).join(", ")} done`);
  }
  for (const piece of rest) {
    const label = formatPieceStatus(piece.status);
    if (piece.note !== undefined) {
      parts.push(`${piece.id} ${label} (${piece.note})`);
    } else {
      parts.push(`${piece.id} ${label}`);
    }
  }
  return `- **Pieces:** ${parts.join("; ")}.`;
};

export const renderSpec = (spec: Spec): string => {
  const sections: string[] = [];

  const statusLines = [`**Status:** ${spec.status}`];
  if (spec.oracleCase !== undefined) {
    statusLines.push(`**Oracle case:** ${spec.oracleCase.path} (${spec.oracleCase.kind})`);
  }
  sections.push(`# Spec: ${spec.title}\n\n${statusLines.join("\n")}`);

  sections.push(`## Intent\n${spec.intent}`);

  if (spec.premise.length > 0) {
    const premiseLines = spec.premise.map((item) => {
      const base = `- **Assumed:** ${item.assumed} **Actual:** ${item.actual}`;
      if (item.correction !== undefined) {
        return `${base} **Correction:** ${item.correction}`;
      }
      return base;
    });
    sections.push(`## Premise\n${premiseLines.join("\n")}`);
  }

  if (spec.decisions.length > 0) {
    const decisionLines = spec.decisions.map(
      (decision, index) =>
        `${index + 1}. **${decision.title}.** ${decision.what} ${decision.why} ${formatDecisionAuthority(decision.decidedBy)}.`,
    );
    sections.push(`## Decisions\n${decisionLines.join("\n")}`);
  }

  if (spec.openAsks.length === 0) {
    sections.push("## Open asks\nnone");
  } else {
    const askLines = spec.openAsks.map(
      (ask, index) =>
        `${index + 1}. ${ask.question} (rec: ${ask.rec}; settled by ${ask.settledBy})`,
    );
    sections.push(`## Open asks\n${askLines.join("\n")}`);
  }

  const builtPiecesLine = `**Built pieces:** ${spec.builtPieces.length > 0 ? spec.builtPieces.join(", ") : "none"}`;
  const pieceBlocks = spec.pieces.map((piece) => {
    const ownsText = piece.owns.map((path) => `\`${path}\``).join(", ");
    const afterText = piece.after.length > 0 ? piece.after.join(", ") : "none";
    return [
      `### ${piece.id} ${piece.name} · owns: ${ownsText} · after: ${afterText}`,
      `- **Now:** ${piece.now}`,
      `- **Reuse:** ${piece.reuse}`,
      `- **Change:** ${piece.change}`,
      `- **Proof:** ${piece.proof}`,
    ].join("\n");
  });
  sections.push(`## Pieces\n${builtPiecesLine}\n\n${pieceBlocks.join("\n\n")}`);

  if (spec.invariantsAndDocs.length > 0) {
    const invariantLines = spec.invariantsAndDocs.map((item) => `- ${item}`);
    sections.push(`## Invariants and docs\n${invariantLines.join("\n")}`);
  }

  const doneLines = spec.doneMeans.map((item) => `- \`${item.cmd}\`: ${item.proves}`);
  const onlyUserLine = `- Only the user can: ${spec.onlyUserCan.length > 0 ? spec.onlyUserCan.join(", ") : "none"}`;
  sections.push(`## Done means\n${[...doneLines, onlyUserLine].join("\n")}`);

  if (spec.outOfScope.length === 0) {
    sections.push("## Out of scope\nnone");
  } else {
    const outOfScopeLines = spec.outOfScope.map((entry) => `- ${entry.item}: ${entry.why}`);
    sections.push(`## Out of scope\n${outOfScopeLines.join("\n")}`);
  }

  if (spec.parked.length > 0) {
    const parkedLines = spec.parked.map(
      (entry) =>
        `- ${entry.item}: ${entry.whoHits}; ${entry.fixAndSize} (rec: ${formatParkedRec(entry.rec)}, ${entry.why})`,
    );
    sections.push(`## Parked\n${parkedLines.join("\n")}`);
  }

  return `${sections.join("\n\n")}\n`;
};

export const renderGoAudit = (audit: GoAuditReport): string => {
  const sections: string[] = [];

  sections.push(`## TLDR\n${audit.tldr}`);

  if (audit.findings.length > 0) {
    sections.push(renderAuditFindings(audit.findings));
  }

  sections.push(renderNeedsFromYou(audit.needsFromYou));

  const pieceLines = audit.pieces.map((piece) => {
    const label = formatPieceStatus(piece.status);
    if (piece.note !== undefined) {
      return `- **${piece.id}** — ${label}: ${piece.note}`;
    }
    return `- **${piece.id}** — ${label}.`;
  });
  sections.push(`## What changed\n${pieceLines.join("\n")}`);

  const verificationLines = [
    renderDecisionsSummary(audit.decisions),
    renderCheckedRuns(audit.checked),
    renderNotCheckedRuns(audit.notChecked),
  ];
  sections.push(`## Verification\n${verificationLines.join("\n")}`);

  if (audit.parked.length > 0) {
    sections.push(renderAuditParked(audit.parked));
  }

  const builtTail = audit.builtPieces.length > 0 ? audit.builtPieces.join(", ") : "none";
  const cycleBlockers = goAuditCycleBlockers(audit);
  const cycleReadiness =
    cycleBlockers.length === 0 ? "ready" : `blocked (${cycleBlockers.join("; ")})`;
  sections.push(`---\n**Built pieces:** ${builtTail}\n**Cycle readiness:** ${cycleReadiness}`);

  return `${sections.join("\n\n")}\n`;
};

export const renderCycleAudit = (audit: CycleAuditReport): string => {
  const sections: string[] = [];

  sections.push(`## TLDR\n${audit.tldr}`);

  if (audit.findings.length > 0) {
    sections.push(renderAuditFindings(audit.findings));
  }

  sections.push(renderNeedsFromYou(audit.needsFromYou));

  if (audit.commits.length === 0) {
    sections.push("## What changed\nnone");
  } else {
    const commitLines = audit.commits.map((commit) => {
      const head = `- **\`${commit.sha}\`** \`${commit.subject}\``;
      if (commit.bullets.length === 0) {
        return head;
      }
      const bullets = commit.bullets.map((bullet) => `  - ${bullet}`);
      return `${head}\n${bullets.join("\n")}`;
    });
    sections.push(`## What changed\n${commitLines.join("\n")}`);
  }

  const hasSpec = audit.specStatus.status !== "none";
  const verificationLines = [
    hasSpec ? renderCyclePiecesSummary(audit.pieces) : "- **Pieces:** (none without a spec)",
    hasSpec ? renderDecisionsSummary(audit.decisions) : "- **Decisions:** (none without a spec)",
    `- **Gate:** ${audit.gate}`,
    renderCheckedRuns(audit.checked),
    renderNotCheckedRuns(audit.notChecked),
  ];
  if (audit.mutation !== undefined) {
    verificationLines.push(`- **Mutation:** ${audit.mutation}`);
  }
  sections.push(`## Verification\n${verificationLines.join("\n")}`);

  if (audit.parked.length > 0) {
    sections.push(renderAuditParked(audit.parked));
  }

  const builtTail = hasSpec && audit.builtPieces.length > 0 ? audit.builtPieces.join(", ") : "none";
  sections.push(
    `---\n**Built pieces:** ${builtTail}\n**Spec:** ${formatSpecStatusTail(audit.specStatus)}`,
  );

  return `${sections.join("\n\n")}\n`;
};
