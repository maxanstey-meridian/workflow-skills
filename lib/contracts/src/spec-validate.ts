import type { Piece, Spec, ValidationIssue } from "./spec-schema.ts";

const UNVISITED = 0;
const VISITING = 1;
const VISITED = 2;

type VisitState = typeof UNVISITED | typeof VISITING | typeof VISITED;

const normalizeOwnedPath = (rawPath: string): string => rawPath.replace(/^(?:\.\/)+/, "");

const checkUniqueIds = (
  ids: ReadonlyArray<string>,
  pathAt: (index: number) => string,
  label: string,
  issues: ValidationIssue[],
): void => {
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    if (id === undefined) {
      continue;
    }
    if (seen.has(id)) {
      issues.push({
        path: pathAt(i),
        message: `duplicate ${label} ID "${id}"`,
      });
    } else {
      seen.add(id);
    }
  }
};

export const validateSpec = (spec: Spec): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  checkUniqueIds(
    spec.decisions.map((decision) => decision.id),
    (i) => `decisions[${i}].id`,
    "decision",
    issues,
  );
  checkUniqueIds(
    spec.openAsks.map((ask) => ask.id),
    (i) => `openAsks[${i}].id`,
    "openAsk",
    issues,
  );
  checkUniqueIds(
    spec.pieces.map((piece) => piece.id),
    (i) => `pieces[${i}].id`,
    "piece",
    issues,
  );
  checkUniqueIds(spec.builtPieces, (i) => `builtPieces[${i}]`, "builtPieces", issues);

  const pieceById = new Map<string, { piece: Piece; index: number }>();
  for (let i = 0; i < spec.pieces.length; i += 1) {
    const piece = spec.pieces[i];
    if (piece !== undefined && !pieceById.has(piece.id)) {
      pieceById.set(piece.id, { piece, index: i });
    }
  }

  if (spec.status === "draft" && spec.openAsks.length === 0) {
    issues.push({
      path: "openAsks",
      message: 'status "draft" requires at least one open ask',
    });
  } else if (spec.status === "agreed" && spec.openAsks.length > 0) {
    issues.push({
      path: "openAsks",
      message: 'status "agreed" requires openAsks to be empty',
    });
  } else if (spec.status === "built") {
    if (spec.openAsks.length > 0) {
      issues.push({
        path: "openAsks",
        message: 'status "built" requires openAsks to be empty',
      });
    }
    const builtSet = new Set(spec.builtPieces);
    for (const piece of spec.pieces) {
      if (!builtSet.has(piece.id)) {
        issues.push({
          path: "builtPieces",
          message: `status "built" requires builtPieces to include piece "${piece.id}"`,
        });
      }
    }
  }

  const ownedBy = new Map<string, string>();
  for (let pieceIndex = 0; pieceIndex < spec.pieces.length; pieceIndex += 1) {
    const piece = spec.pieces[pieceIndex];
    if (piece === undefined) {
      continue;
    }
    for (let ownsIndex = 0; ownsIndex < piece.owns.length; ownsIndex += 1) {
      const rawPath = piece.owns[ownsIndex];
      if (rawPath === undefined) {
        continue;
      }
      const normalized = normalizeOwnedPath(rawPath);
      const existingOwner = ownedBy.get(normalized);
      if (existingOwner !== undefined) {
        if (existingOwner === piece.id) {
          issues.push({
            path: `pieces[${pieceIndex}].owns[${ownsIndex}]`,
            message: `duplicate owned path "${normalized}" within piece "${piece.id}"`,
          });
        } else {
          issues.push({
            path: `pieces[${pieceIndex}].owns[${ownsIndex}]`,
            message: `owned path "${normalized}" in piece "${piece.id}" overlaps with piece "${existingOwner}"`,
          });
        }
      } else {
        ownedBy.set(normalized, piece.id);
      }
    }
  }

  for (let pieceIndex = 0; pieceIndex < spec.pieces.length; pieceIndex += 1) {
    const piece = spec.pieces[pieceIndex];
    if (piece === undefined) {
      continue;
    }
    for (let afterIndex = 0; afterIndex < piece.after.length; afterIndex += 1) {
      const depId = piece.after[afterIndex];
      if (depId === undefined) {
        continue;
      }
      if (depId === piece.id) {
        issues.push({
          path: `pieces[${pieceIndex}].after[${afterIndex}]`,
          message: `piece "${piece.id}" cannot depend on itself`,
        });
      } else if (!pieceById.has(depId)) {
        issues.push({
          path: `pieces[${pieceIndex}].after[${afterIndex}]`,
          message: `piece "${piece.id}" references unknown piece "${depId}" in after`,
        });
      }
    }
  }

  const visitState = new Map<string, VisitState>();
  const stack: string[] = [];

  const visit = (pieceId: string): void => {
    const entry = pieceById.get(pieceId);
    if (entry === undefined) {
      return;
    }
    visitState.set(pieceId, VISITING);
    stack.push(pieceId);

    for (const depId of entry.piece.after) {
      if (depId === pieceId || !pieceById.has(depId)) {
        continue;
      }
      const depState = visitState.get(depId) ?? UNVISITED;
      if (depState === VISITING) {
        const cycleStart = stack.indexOf(depId);
        const cyclePath = [...stack.slice(cycleStart), depId].join(" -> ");
        issues.push({
          path: `pieces[${entry.index}].after`,
          message: `dependency cycle in after: ${cyclePath}`,
        });
      } else if (depState === UNVISITED) {
        visit(depId);
      }
    }

    stack.pop();
    visitState.set(pieceId, VISITED);
  };

  for (const piece of spec.pieces) {
    if ((visitState.get(piece.id) ?? UNVISITED) === UNVISITED) {
      visit(piece.id);
    }
  }

  for (let i = 0; i < spec.builtPieces.length; i += 1) {
    const builtId = spec.builtPieces[i];
    if (builtId !== undefined && !pieceById.has(builtId)) {
      issues.push({
        path: `builtPieces[${i}]`,
        message: `builtPieces references unknown piece "${builtId}"`,
      });
    }
  }

  return issues;
};
