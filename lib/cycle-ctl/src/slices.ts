import { z } from "zod";
import type { ReviewReport } from "../../contracts/src/report-schemas.ts";

export const AUTO_SLICE_LIMIT = 15;
export const MAX_PATHS_PER_LIST = 25;

const FRONTEND_EXT_RE = /\.(vue|tsx|jsx|css|scss|sass|less|html)$/;
const FRONTEND_DIR_RE = /(^|\/)(web|frontend|ui|client|app\/(components|pages|composables))\//;

export const SliceEntrySchema = z
  .object({
    id: z.number().int().positive(),
    files: z.array(z.string().min(1)).min(1).max(MAX_PATHS_PER_LIST),
  })
  .strict();
export type SliceEntry = z.infer<typeof SliceEntrySchema>;

export const SlicesFileSchema = z
  .object({
    slices: z.array(SliceEntrySchema).min(1),
    stacks: z
      .object({
        backend: z.array(z.array(z.string().min(1)).min(1).max(MAX_PATHS_PER_LIST)),
        frontend: z.array(z.array(z.string().min(1)).min(1).max(MAX_PATHS_PER_LIST)),
      })
      .strict(),
  })
  .strict();
export type SlicesFile = z.infer<typeof SlicesFileSchema>;

export const isFrontendPath = (filePath: string): boolean =>
  FRONTEND_EXT_RE.test(filePath) || FRONTEND_DIR_RE.test(filePath);

const sortPaths = (paths: Iterable<string>): string[] =>
  [...new Set(paths)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const formatZodPath = (pathParts: ReadonlyArray<PropertyKey>): string => {
  if (pathParts.length === 0) {
    return "(root)";
  }
  return pathParts
    .map((part, index) => {
      if (typeof part === "number") {
        return `[${part}]`;
      }
      const key = String(part);
      return index === 0 ? key : `.${key}`;
    })
    .join("");
};

export const autoSlice = (scope: ReadonlyArray<string>): SlicesFile | null => {
  const uniqueScope = sortPaths(scope);
  if (uniqueScope.length === 0 || uniqueScope.length > AUTO_SLICE_LIMIT) {
    return null;
  }

  const backend: string[] = [];
  const frontend: string[] = [];
  for (const filePath of uniqueScope) {
    if (isFrontendPath(filePath)) {
      frontend.push(filePath);
    } else {
      backend.push(filePath);
    }
  }

  return {
    slices: [{ id: 1, files: uniqueScope }],
    stacks: {
      backend: backend.length > 0 ? [backend] : [],
      frontend: frontend.length > 0 ? [frontend] : [],
    },
  };
};

export const validateSlices = (
  slicesYaml: unknown,
  scope: ReadonlyArray<string>,
): { ok: true; data: SlicesFile } | { ok: false; errors: string[] } => {
  const parsed = SlicesFileSchema.safeParse(slicesYaml);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `${formatZodPath(issue.path)}: ${issue.message}`,
    );
    return { ok: false, errors };
  }

  const data = parsed.data;
  const errors: string[] = [];
  const scopeSet = new Set(scope);

  // Check unique slice IDs and slice path disjointness / coverage.
  const seenSliceIds = new Set<number>();
  const seenInSlices = new Map<string, number>();

  for (let i = 0; i < data.slices.length; i += 1) {
    const entry = data.slices[i];
    if (entry === undefined) {
      continue;
    }
    if (seenSliceIds.has(entry.id)) {
      errors.push(`slices[${i}].id: duplicate slice ID ${entry.id}`);
    } else {
      seenSliceIds.add(entry.id);
    }

    for (let j = 0; j < entry.files.length; j += 1) {
      const filePath = entry.files[j];
      if (filePath === undefined) {
        continue;
      }
      if (!scopeSet.has(filePath)) {
        errors.push(`slices[${i}].files[${j}]: path "${filePath}" is not in scope`);
        continue;
      }
      const prevSlice = seenInSlices.get(filePath);
      if (prevSlice !== undefined) {
        errors.push(
          `slices[${i}].files[${j}]: path "${filePath}" already appears in slice ${prevSlice}`,
        );
      } else {
        seenInSlices.set(filePath, entry.id);
      }
    }
  }

  for (const scopePath of scope) {
    if (!seenInSlices.has(scopePath)) {
      errors.push(`slices: missing scope path "${scopePath}"`);
    }
  }

  // Check stack path disjointness / coverage across backend and frontend.
  const seenInStacks = new Map<string, string>();
  const stackGroups: ReadonlyArray<{
    stackName: "backend" | "frontend";
    lists: ReadonlyArray<ReadonlyArray<string>>;
  }> = [
    { stackName: "backend", lists: data.stacks.backend },
    { stackName: "frontend", lists: data.stacks.frontend },
  ];

  for (const { stackName, lists } of stackGroups) {
    for (let i = 0; i < lists.length; i += 1) {
      const list = lists[i];
      if (list === undefined) {
        continue;
      }
      const listLabel = `stacks.${stackName}[${i}]`;
      for (let j = 0; j < list.length; j += 1) {
        const filePath = list[j];
        if (filePath === undefined) {
          continue;
        }
        if (!scopeSet.has(filePath)) {
          errors.push(`${listLabel}[${j}]: path "${filePath}" is not in scope`);
          continue;
        }
        const prevStack = seenInStacks.get(filePath);
        if (prevStack !== undefined) {
          errors.push(`${listLabel}[${j}]: path "${filePath}" already appears in ${prevStack}`);
        } else {
          seenInStacks.set(filePath, listLabel);
        }
      }
    }
  }

  for (const scopePath of scope) {
    if (!seenInStacks.has(scopePath)) {
      errors.push(`stacks: missing scope path "${scopePath}"`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
};

export type SliceMerge = {
  from: number;
  into: number;
};

export type FixSlicePlan = {
  slices: Record<string, string[]>;
  merges: SliceMerge[];
  hitSliceIds: number[];
  hitPaths: string[];
};

const parseNumericSliceEntries = (
  slices: Readonly<Record<string, ReadonlyArray<string>>>,
): Map<number, string[]> => {
  const result = new Map<number, string[]>();
  const keys = Object.keys(slices)
    .map((key) => Number(key))
    .filter((id) => Number.isInteger(id) && id >= 0)
    .sort((a, b) => a - b);

  for (const id of keys) {
    const files = slices[String(id)];
    if (files !== undefined) {
      result.set(id, [...new Set(files)]);
    }
  }
  return result;
};

export const planFixSlices = (
  slices: Readonly<Record<string, ReadonlyArray<string>>>,
  reviewReports: ReadonlyArray<ReviewReport>,
  leftOut: ReadonlySet<string>,
  existingPaths: ReadonlySet<string>,
): FixSlicePlan => {
  const working = parseNumericSliceEntries(slices);
  const merges: SliceMerge[] = [];
  const hitPathSet = new Set<string>();

  for (const report of reviewReports) {
    for (const finding of report.findings) {
      if (finding.do !== "fix") {
        continue;
      }

      const blockPaths = [...new Set([finding.file, ...finding.files])];
      for (const p of blockPaths) {
        hitPathSet.add(p);
      }

      const holders: number[] = [];
      const sortedIds = [...working.keys()].sort((a, b) => a - b);
      for (const id of sortedIds) {
        const files = working.get(id);
        if (files !== undefined && blockPaths.some((p) => files.includes(p))) {
          holders.push(id);
        }
      }

      const home = holders[0];
      if (home === undefined) {
        continue;
      }

      const homeFiles = working.get(home);
      if (homeFiles === undefined) {
        continue;
      }
      const homeSet = new Set(homeFiles);

      for (const other of holders.slice(1)) {
        const otherFiles = working.get(other);
        if (otherFiles !== undefined) {
          for (const p of otherFiles) {
            if (!homeSet.has(p)) {
              homeFiles.push(p);
              homeSet.add(p);
            }
          }
        }
        working.delete(other);
        merges.push({ from: other, into: home });
      }

      for (const p of blockPaths) {
        if (!homeSet.has(p) && !leftOut.has(p) && existingPaths.has(p)) {
          homeFiles.push(p);
          homeSet.add(p);
        }
      }
    }
  }

  const hitPaths = sortPaths(hitPathSet);
  const hitSliceIds: number[] = [];
  const nextSlices: Record<string, string[]> = {};

  for (const id of [...working.keys()].sort((a, b) => a - b)) {
    const files = working.get(id);
    if (files === undefined) {
      continue;
    }
    nextSlices[String(id)] = files;
    if (files.some((p) => hitPathSet.has(p))) {
      hitSliceIds.push(id);
    }
  }

  return {
    slices: nextSlices,
    merges,
    hitSliceIds,
    hitPaths,
  };
};

export type SortedPathsResult = {
  scope: string[];
  leftOut: string[];
  addedToScope: string[];
  addedToLeftOut: string[];
  fixed: string[];
};

export const sortNewPaths = (
  uncommitted: ReadonlyArray<string>,
  scope: ReadonlyArray<string>,
  leftOut: ReadonlyArray<string>,
  fixerChangedFiles: ReadonlyArray<string>,
): SortedPathsResult => {
  const scopeSet = new Set(scope);
  const leftOutSet = new Set(leftOut);
  const fixerSet = new Set(fixerChangedFiles);

  const addedToScope: string[] = [];
  const addedToLeftOut: string[] = [];

  for (const filePath of sortPaths(uncommitted)) {
    if (leftOutSet.has(filePath) || scopeSet.has(filePath)) {
      continue;
    }
    if (fixerSet.has(filePath)) {
      scopeSet.add(filePath);
      addedToScope.push(filePath);
    } else {
      leftOutSet.add(filePath);
      addedToLeftOut.push(filePath);
    }
  }

  const nextScope = sortPaths(scopeSet);
  const nextLeftOut = sortPaths(leftOutSet);
  const fixed = sortPaths(uncommitted).filter((p) => !leftOutSet.has(p));

  return {
    scope: nextScope,
    leftOut: nextLeftOut,
    addedToScope,
    addedToLeftOut,
    fixed,
  };
};

export const assignNewPathsToSlices = (
  fixedPaths: ReadonlyArray<string>,
  slices: Readonly<Record<string, ReadonlyArray<string>>>,
  fixerChangedFilesBySlice: Readonly<Record<string, ReadonlyArray<string>>>,
): Record<string, string[]> => {
  const working = parseNumericSliceEntries(slices);
  const allSliced = new Set<string>();
  for (const files of working.values()) {
    for (const p of files) {
      allSliced.add(p);
    }
  }

  const fixedSet = new Set(fixedPaths);
  const fixerSliceIds = Object.keys(fixerChangedFilesBySlice)
    .map((key) => Number(key))
    .filter((id) => Number.isInteger(id) && id >= 0)
    .sort((a, b) => a - b);

  for (const sliceId of fixerSliceIds) {
    const sliceFiles = working.get(sliceId);
    const changed = fixerChangedFilesBySlice[String(sliceId)];
    if (sliceFiles === undefined || changed === undefined) {
      continue;
    }
    for (const p of changed) {
      if (fixedSet.has(p) && !allSliced.has(p)) {
        sliceFiles.push(p);
        allSliced.add(p);
      }
    }
  }

  const unassigned = sortPaths(fixedPaths).filter((p) => !allSliced.has(p));
  if (unassigned.length > 0) {
    const sliceZero = working.get(0) ?? [];
    for (const p of unassigned) {
      sliceZero.push(p);
    }
    working.set(0, sliceZero);
  }

  const result: Record<string, string[]> = {};
  for (const id of [...working.keys()].sort((a, b) => a - b)) {
    const files = working.get(id);
    if (files !== undefined) {
      result[String(id)] = files;
    }
  }
  return result;
};
