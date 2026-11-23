import type {
  SlopAudit,
  SlopAuditAlsoNoticedItem,
  SlopAuditCleanupItem,
  SlopAuditFinding,
  SlopAuditHunted,
  SlopAuditNeed,
  SlopAuditWeightMapItem,
} from "./schemas.ts";

const FULL_CODE_FINDING_LIMIT = 25;

const formatLineCount = (lines: number): string => lines.toLocaleString("en-US");

const renderFindingsSection = (findings: ReadonlyArray<string>): string => {
  const lines = findings.map((finding, index) => `${index + 1}. ${finding}`);
  return `## Findings\n${lines.join("\n")}`;
};

const renderNeedsFromYouSection = (needs: ReadonlyArray<SlopAuditNeed>): string => {
  if (needs.length === 0) {
    return "## Needs from you\nnone";
  }
  const lines = needs.map((need, index) => {
    if (need.rec !== undefined) {
      return `${index + 1}. ${need.item} (rec: ${need.rec})`;
    }
    return `${index + 1}. ${need.item}`;
  });
  return `## Needs from you\n${lines.join("\n")}`;
};

const renderWeightMapSection = (items: ReadonlyArray<SlopAuditWeightMapItem>): string => {
  const lines = items.map((item) => {
    const statusText =
      item.status === "earned" ? `earned: ${item.earnedWhy}` : `**${item.findingId}**`;
    return `- **${item.capability}** — ${formatLineCount(item.lines)} lines (${item.sharePct}%) — ${statusText}`;
  });
  return `## Weight map\n${lines.join("\n")}`;
};

const renderFindingHeading = (finding: SlopAuditFinding): string => {
  const parts = [finding.id, `sign ${finding.sign}`, finding.kind, `risk ${finding.risk}`];
  if (finding.mootIf !== undefined) {
    parts.push(`moot if ${finding.mootIf} lands`);
  }
  const badges: string[] = [];
  if (finding.unverified === true) {
    badges.push("(unverified)");
  }
  if (finding.raisedByVerifier === true) {
    badges.push("(raised by the verifier)");
  }
  const suffix = badges.length > 0 ? ` ${badges.join(" ")}` : "";
  return `### ${parts.join(" · ")}${suffix}`;
};

const renderFindingBlock = (finding: SlopAuditFinding): string => {
  const lines: string[] = [
    renderFindingHeading(finding),
    `- **Where:** ${finding.where}`,
    `- **What:** ${finding.what}`,
    `- **Replace with:** ${finding.replaceWith}`,
    `- **Removes:** ${finding.removes}`,
    `- **Users lose:** ${finding.usersLose}`,
    `- **Proof:** ${finding.proof}`,
  ];

  if (finding.against !== undefined && finding.verifierAdds !== undefined) {
    lines.push(`- **Against:** ${finding.against} Verifier adds: ${finding.verifierAdds}`);
  } else if (finding.against !== undefined) {
    lines.push(`- **Against:** ${finding.against}`);
  } else if (finding.verifierAdds !== undefined) {
    lines.push(`- **Verifier adds:** ${finding.verifierAdds}`);
  }

  lines.push(`- **Protected by:** ${finding.protectedBy}`);

  if (finding.hunterNotes !== undefined && finding.hunterNotes.length > 0) {
    if (finding.hunterNotes.length === 1) {
      lines.push(`- **Hunter notes:** ${finding.hunterNotes[0]}`);
    } else {
      lines.push("- **Hunter notes:**");
      for (const note of finding.hunterNotes) {
        lines.push(`  - ${note}`);
      }
    }
  }

  return lines.join("\n");
};

const renderOverflowBullet = (finding: SlopAuditFinding): string => {
  const tags: string[] = [finding.kind, `risk ${finding.risk}`];
  if (finding.mootIf !== undefined) {
    tags.push(`moot if ${finding.mootIf} lands`);
  }
  if (finding.unverified === true) {
    tags.push("unverified");
  }
  if (finding.raisedByVerifier === true) {
    tags.push("raised by the verifier");
  }
  return `- **${finding.id}** (${finding.where}) — ${finding.what} Replace with: ${finding.replaceWith}. Removes: ${finding.removes}. (${tags.join("; ")})`;
};

const renderCodeSection = (findings: ReadonlyArray<SlopAuditFinding>): string => {
  const full = findings.slice(0, FULL_CODE_FINDING_LIMIT);
  const overflow = findings.slice(FULL_CODE_FINDING_LIMIT);
  const blocks = full.map(renderFindingBlock);

  if (overflow.length > 0) {
    const bySign = new Map<number, SlopAuditFinding[]>();
    for (const finding of overflow) {
      const group = bySign.get(finding.sign);
      if (group !== undefined) {
        group.push(finding);
      } else {
        bySign.set(finding.sign, [finding]);
      }
    }
    const sortedSigns = [...bySign.keys()].sort((a, b) => a - b);
    for (const sign of sortedSigns) {
      const group = bySign.get(sign);
      if (group === undefined) {
        continue;
      }
      const bullets = group.map(renderOverflowBullet);
      blocks.push(`### Sign ${sign}\n${bullets.join("\n")}`);
    }
  }

  return `## Code\n${blocks.join("\n\n")}`;
};

const renderCleanupSection = (items: ReadonlyArray<SlopAuditCleanupItem>): string => {
  const lines = items.map((item) => {
    const prefix = item.id !== undefined ? `${item.id} ` : "";
    return `- ${prefix}\`${item.where}\` — ${item.what} (replace with: ${item.replaceWith})`;
  });
  return `## Cleanup\n${lines.join("\n")}`;
};

const renderAlsoNoticedSection = (items: ReadonlyArray<SlopAuditAlsoNoticedItem>): string => {
  const lines = items.map((item) => {
    const verificationLabel = item.verification === "kept" ? "kept by a verifier" : "unchecked";
    const tagLabel =
      item.tag === "data-loss" ? "data loss" : item.tag === "security" ? "security" : undefined;
    const meta = tagLabel !== undefined ? `${tagLabel}, ${verificationLabel}` : verificationLabel;
    return `- \`${item.where}\` — ${item.what} (${meta})`;
  });
  return `## Also noticed\n${lines.join("\n")}`;
};

const renderHuntedSection = (hunted: SlopAuditHunted): string => {
  const notRead =
    hunted.notReadInFull.length > 0
      ? hunted.notReadInFull.map((filePath) => `\`${filePath}\``).join(", ")
      : "none";
  const leftOut =
    hunted.leftOut.length > 0
      ? hunted.leftOut.map((filePath) => `\`${filePath}\``).join(", ")
      : "none";
  const runPart =
    hunted.findersRun.length > 0
      ? hunted.findersRun.map((name) => `\`${name}\``).join(", ")
      : "none";
  const skippedPart =
    hunted.skipped.length > 0
      ? hunted.skipped.map((entry) => `\`${entry.name}\` (${entry.why})`).join(", ")
      : "none";

  const lines = [
    `- **Commit:** \`${hunted.repo}@${hunted.head}\``,
    `- **Not read in full:** ${notRead}`,
    `- **Left out:** ${leftOut}`,
    `- **Finders:** ${runPart}; skipped: ${skippedPart}`,
  ];
  return `## Hunted\n${lines.join("\n")}`;
};

export const renderSlopAudit = (audit: SlopAudit): string => {
  const sections: string[] = [`## TLDR\n${audit.tldr}`];

  if (audit.findings.length > 0) {
    sections.push(renderFindingsSection(audit.findings));
  }

  sections.push(renderNeedsFromYouSection(audit.needsFromYou));
  sections.push(renderWeightMapSection(audit.weightMap));

  if (audit.design.length > 0) {
    sections.push(`## Design\n${audit.design.map(renderFindingBlock).join("\n\n")}`);
  }

  if (audit.code.length > 0) {
    sections.push(renderCodeSection(audit.code));
  }

  if (audit.cleanup.length > 0) {
    sections.push(renderCleanupSection(audit.cleanup));
  }

  if (audit.alsoNoticed.length > 0) {
    sections.push(renderAlsoNoticedSection(audit.alsoNoticed));
  }

  sections.push(renderHuntedSection(audit.hunted));

  return `${sections.join("\n\n")}\n`;
};
