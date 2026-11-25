import { z } from "zod";
import {
  AuditNeedActionSchema,
  AuditNeedDecisionSchema,
  AuditNeedSchema,
} from "../../contracts/src/report-schemas.ts";

type BaseSchema = z.core.JSONSchema.BaseSchema;

const AuditNeedUnionSchema = z.union([AuditNeedDecisionSchema, AuditNeedActionSchema]);

const isSchemaObject = (value: unknown): value is BaseSchema =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toJsonSchemaNode = (schema: z.ZodType): BaseSchema =>
  z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    override: (ctx) => {
      if (ctx.zodSchema === AuditNeedSchema) {
        const unionNode = z.toJSONSchema(AuditNeedUnionSchema, {
          io: "input",
          unrepresentable: "throw",
        });
        delete unionNode.$schema;
        for (const key of Object.keys(ctx.jsonSchema)) {
          delete ctx.jsonSchema[key];
        }
        Object.assign(ctx.jsonSchema, unionNode);
      }
    },
  });

const formatLiteral = (value: unknown): string => {
  if (typeof value === "string") {
    if (
      value === "" ||
      value.startsWith("-") ||
      /[:#\s"'{}[\],&*?|>!%@`]/.test(value) ||
      /^(true|false|null)$/i.test(value)
    ) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
};

const getUnionBranches = (node: BaseSchema): ReadonlyArray<BaseSchema> | null => {
  const raw = node.anyOf ?? node.oneOf;
  if (!Array.isArray(raw)) {
    return null;
  }
  return raw.filter(isSchemaObject);
};

const isScalarNode = (node: BaseSchema): boolean => {
  if (node.const !== undefined || node.enum !== undefined) {
    return true;
  }
  if (
    node.type === "string" ||
    node.type === "integer" ||
    node.type === "number" ||
    node.type === "boolean" ||
    node.type === "null"
  ) {
    return true;
  }
  const branches = getUnionBranches(node);
  return branches !== null && branches.every(isScalarNode);
};

const formatScalar = (node: BaseSchema, context: string): string => {
  if (node.const !== undefined) {
    return formatLiteral(node.const);
  }
  if (node.enum !== undefined) {
    return node.enum.map(formatLiteral).join(" | ");
  }
  const branches = getUnionBranches(node);
  if (branches !== null) {
    return branches.map((b, i) => formatScalar(b, `${context}[${i}]`)).join(" | ");
  }
  if (node.type === "string") {
    if (typeof node.pattern === "string") {
      return `<string matching /${node.pattern}/>`;
    }
    if (typeof node.minLength === "number" && node.minLength >= 1) {
      return "<non-empty string>";
    }
    return "<string>";
  }
  if (node.type === "integer" || node.type === "number") {
    const kind = node.type;
    const min =
      typeof node.minimum === "number" && node.minimum !== Number.MIN_SAFE_INTEGER
        ? node.minimum
        : undefined;
    const max =
      typeof node.maximum === "number" && node.maximum !== Number.MAX_SAFE_INTEGER
        ? node.maximum
        : undefined;
    if (min !== undefined && max !== undefined) {
      return `<${kind} ${min}..${max}>`;
    }
    if (min !== undefined) {
      return `<${kind} >= ${min}>`;
    }
    if (max !== undefined) {
      return `<${kind} <= ${max}>`;
    }
    return `<${kind}>`;
  }
  if (node.type === "boolean") {
    return "<boolean>";
  }
  if (node.type === "null") {
    return "null";
  }
  throw new Error(`Unsupported JSON Schema scalar node at ${context}: ${JSON.stringify(node)}`);
};

const buildComments = (node: BaseSchema, isRequired: boolean): string => {
  const parts: string[] = [];
  if (!isRequired) {
    if (Array.isArray(node.default) && node.default.length === 0) {
      parts.push("optional, default []");
    } else if (node.default !== undefined) {
      parts.push(`optional, default ${JSON.stringify(node.default)}`);
    } else {
      parts.push("optional");
    }
  }
  if (node.type === "array" && typeof node.minItems === "number" && node.minItems >= 1) {
    parts.push(node.minItems === 1 ? "non-empty list" : `at least ${node.minItems} items`);
  }
  if (typeof node.description === "string" && node.description.length > 0) {
    parts.push(node.description);
  }
  return parts.length > 0 ? ` # ${parts.join("; ")}` : "";
};

const getProperties = (node: BaseSchema): Record<string, BaseSchema> | null => {
  if (node.type !== "object" || !isSchemaObject(node.properties)) {
    return null;
  }
  const result: Record<string, BaseSchema> = {};
  for (const [key, value] of Object.entries(node.properties)) {
    if (isSchemaObject(value)) {
      result[key] = value;
    }
  }
  return result;
};

const findDiscriminatorLabel = (branch: BaseSchema): string | null => {
  const props = getProperties(branch);
  if (props === null) {
    return null;
  }
  for (const [key, prop] of Object.entries(props)) {
    if (prop.const !== undefined) {
      return `${key}: ${formatLiteral(prop.const)}`;
    }
  }
  return null;
};

const renderObjectProperties = (
  node: BaseSchema,
  indent: number,
  context: string,
  firstPrefix?: string,
): string[] => {
  const props = getProperties(node);
  if (props === null) {
    throw new Error(`Expected object schema with properties at ${context}`);
  }
  const requiredSet = new Set(Array.isArray(node.required) ? node.required : []);
  const pad = " ".repeat(indent);
  const lines: string[] = [];

  for (const [i, [key, prop]] of Object.entries(props).entries()) {
    const propCtx = `${context}.${key}`;
    const isReq = requiredSet.has(key);
    const prefix = i === 0 && firstPrefix !== undefined ? firstPrefix : pad;

    if (isScalarNode(prop)) {
      const comment = buildComments(prop, isReq);
      lines.push(`${prefix}${key}: ${formatScalar(prop, propCtx)}${comment}`);
      continue;
    }

    if (getProperties(prop) !== null) {
      const comment = buildComments(prop, isReq);
      lines.push(`${prefix}${key}:${comment}`);
      lines.push(...renderObjectProperties(prop, indent + 2, propCtx));
      continue;
    }

    if (prop.type === "array" && isSchemaObject(prop.items)) {
      const comment = buildComments(prop, isReq);
      lines.push(`${prefix}${key}:${comment}`);
      const item = prop.items;
      const itemCtx = `${propCtx}[]`;
      if (isScalarNode(item)) {
        const itemNote =
          typeof item.description === "string" && item.description.length > 0
            ? ` # ${item.description}`
            : "";
        lines.push(`${pad}  - ${formatScalar(item, itemCtx)}${itemNote}`);
      } else if (getProperties(item) !== null) {
        if (typeof item.description === "string" && item.description.length > 0) {
          lines.push(`${pad}  # ${item.description}`);
        }
        lines.push(...renderObjectProperties(item, indent + 4, itemCtx, `${pad}  - `));
      } else {
        const itemBranches = getUnionBranches(item);
        if (itemBranches === null) {
          throw new Error(`Unsupported array item schema at ${itemCtx}: ${JSON.stringify(item)}`);
        }
        for (const [b, branch] of itemBranches.entries()) {
          const label = findDiscriminatorLabel(branch);
          const desc =
            typeof branch.description === "string" && branch.description.length > 0
              ? ` — ${branch.description}`
              : "";
          const header = label
            ? `# Option ${b + 1} (${label})${desc}:`
            : `# Option ${b + 1}${desc}:`;
          lines.push(`${pad}  ${header}`);
          lines.push(
            ...renderObjectProperties(branch, indent + 4, `${itemCtx}[${b}]`, `${pad}  - `),
          );
        }
      }
      continue;
    }

    const propBranches = getUnionBranches(prop);
    if (propBranches !== null) {
      const comment = buildComments(prop, isReq);
      lines.push(`${prefix}${key}:${comment}`);
      for (const [b, branch] of propBranches.entries()) {
        const label = findDiscriminatorLabel(branch);
        const header = label ? `# Variant ${b + 1} (${label}):` : `# Variant ${b + 1}:`;
        lines.push(`${pad}  ${header}`);
        lines.push(...renderObjectProperties(branch, indent + 2, `${propCtx}[${b}]`));
      }
      continue;
    }

    throw new Error(`Unsupported JSON Schema property at ${propCtx}: ${JSON.stringify(prop)}`);
  }

  return lines;
};

const renderRootUnion = (branches: ReadonlyArray<BaseSchema>, schemaName: string): string[] => {
  const lines: string[] = [];
  const firstProps = branches[0] ? getProperties(branches[0]) : null;

  for (const [i, branch] of branches.entries()) {
    const label = findDiscriminatorLabel(branch);
    const header = label ? `# Variant ${i + 1} (${label}):` : `# Variant ${i + 1}:`;
    if (i > 0) {
      lines.push("");
    }
    lines.push(header);

    const branchProps = getProperties(branch);
    if (i > 0 && firstProps !== null && branchProps !== null) {
      const firstKeys = Object.keys(firstProps);
      const sharedKeys = firstKeys.filter(
        (k) => k in branchProps && JSON.stringify(firstProps[k]) === JSON.stringify(branchProps[k]),
      );
      if (sharedKeys.length >= 3 && sharedKeys.length === firstKeys.length - 1) {
        lines.push("# Same base fields as Variant 1, with:");
        const diffProps: Record<string, BaseSchema> = {};
        for (const [k, v] of Object.entries(branchProps)) {
          if (!sharedKeys.includes(k)) {
            diffProps[k] = v;
          }
        }
        const diffNode: BaseSchema = {
          type: "object",
          properties: diffProps,
          required: (Array.isArray(branch.required) ? branch.required : []).filter(
            (k) => k in diffProps,
          ),
        };
        lines.push(...renderObjectProperties(diffNode, 0, `${schemaName}[${i}]`));
        continue;
      }
    }

    lines.push(...renderObjectProperties(branch, 0, `${schemaName}[${i}]`));
  }

  return lines;
};

export const renderZodSchemaToYaml = (schemaName: string, schema: z.ZodType): string => {
  const root = toJsonSchemaNode(schema);
  const lines: string[] = ["# Strict YAML — unknown keys are rejected."];

  if (getProperties(root) !== null) {
    if (typeof root.description === "string" && root.description.length > 0) {
      lines.push(`# ${root.description}`);
    }
    lines.push(...renderObjectProperties(root, 0, schemaName));
  } else {
    const branches = getUnionBranches(root);
    if (branches === null) {
      throw new Error(`Unsupported root JSON Schema for ${schemaName}: ${JSON.stringify(root)}`);
    }
    lines.push(...renderRootUnion(branches, schemaName));
  }

  return ["```yaml", ...lines, "```"].join("\n");
};
