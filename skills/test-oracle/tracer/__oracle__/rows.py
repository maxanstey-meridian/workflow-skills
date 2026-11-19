#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["tree-sitter==0.26.1", "tree-sitter-typescript==0.23.2"]
# ///
"""Prints one row per outcome of cli.ts's `run`, read from its syntax tree.

An outcome is a `return { exit, out }` or a `throw` inside `run`. A row's Id is built from
the conditions that lead to it (the `if`s around it, and the negation of each earlier `if`
in the same block that always ends in a return or throw), never from its position.

What it writes is evidence of what the code does today, never what it should do.
Each row ends with the fields to fill, printed as null: Expected, CantHappen, Shortfall, Test.
What it can't place (a return that isn't `{ exit: <number>, out: ... }`, a `run` it can't
find) goes to unplaced.jsonl and is named on stderr.

The ledger runs it as `uv run rows.py <case folder>`, in the case folder. It reads cli.ts from the
case folder's parent, and writes unplaced.jsonl into the case folder.
"""

import json
import re
import sys
from pathlib import Path

import tree_sitter_typescript
from tree_sitter import Language, Node, Parser

if len(sys.argv) != 2:
    print("usage: rows.py <case folder>", file=sys.stderr)
    sys.exit(2)
CASE = Path(sys.argv[1]).resolve()
SOURCE = CASE.parent / "cli.ts"
UNPLACED = CASE / "unplaced.jsonl"

# The fields the ledger sends an agent to fill. Each row prints them as null: the script owns
# every other field, and the ledger reads these four names from the rows themselves.
TO_FILL = {"Expected": None, "CantHappen": None, "Shortfall": None, "Test": None}

parser = Parser(Language(tree_sitter_typescript.language_typescript()))
code = SOURCE.read_bytes()
tree = parser.parse(code)
unplaced: list[dict] = []


def text(node: Node) -> str:
    return code[node.start_byte : node.end_byte].decode()


def line(node: Node) -> int:
    return node.start_point.row + 1


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def find_run(root: Node) -> Node | None:
    """The arrow function or function bound to the exported name `run`."""
    stack = [root]
    while stack:
        node = stack.pop()
        if node.type == "variable_declarator":
            name = node.child_by_field_name("name")
            value = node.child_by_field_name("value")
            if name is not None and text(name) == "run" and value is not None:
                return value
        if node.type == "function_declaration":
            name = node.child_by_field_name("name")
            if name is not None and text(name) == "run":
                return node
        stack.extend(reversed(node.children))
    return None


def condition_parts(condition: Node) -> list[str] | None:
    """`a === "x"` gives ["a-x"]; `a && b` gives both; anything else gives None (kept as text)."""
    node = condition
    while node.type == "parenthesized_expression":
        node = node.named_children[0]
    if node.type == "unary_expression" and text(node.child_by_field_name("operator")) == "!":
        inner = node.child_by_field_name("argument")
        if inner.type == "call_expression":
            function = inner.child_by_field_name("function")
            args = inner.child_by_field_name("arguments").named_children
            if function.type == "member_expression" and text(function.child_by_field_name("property")) == "includes" and len(args) == 1:
                return [f"{slug(text(args[0]))}-not-in-{slug(text(function.child_by_field_name('object')))}"]
        return None
    if node.type == "binary_expression":
        operator = text(node.child_by_field_name("operator"))
        left = node.child_by_field_name("left")
        right = node.child_by_field_name("right")
        if operator == "||":
            left_parts = condition_parts(left)
            right_parts = condition_parts(right)
            if left_parts is not None and right_parts is not None:
                return ["-or-".join(left_parts + right_parts)]
            return None
        if operator == "&&":
            left_parts = condition_parts(left)
            right_parts = condition_parts(right)
            if left_parts is not None and right_parts is not None:
                return left_parts + right_parts
            return None
        if operator == "===" and right.type == "string":
            literal = text(right).strip("\"'`")
            if text(left) == "command":
                return [slug(literal)]
            return [f"{slug(text(left))}-{slug(literal)}"]
        if operator == "===" and right.type == "undefined":
            return [f"no-{slug(text(left))}"]
    return None


def describe(condition: Node, negated: bool) -> str:
    parts = condition_parts(condition)
    if parts is None:
        label = slug(text(condition))
        return f"not-{label}" if negated else label
    if negated:
        if len(parts) == 1 and parts[0].startswith("no-") and "-or-" not in parts[0]:
            return parts[0][3:]
        return "not-" + "-".join(parts)
    return ".".join(parts)


def always_leaves(node: Node) -> bool:
    """True when a statement ends in return or throw on every path."""
    if node.type in ("return_statement", "throw_statement"):
        return True
    if node.type == "statement_block":
        return any(always_leaves(child) for child in node.named_children)
    if node.type == "if_statement":
        consequence = node.child_by_field_name("consequence")
        alternative = node.child_by_field_name("alternative")
        return (
            consequence is not None
            and always_leaves(consequence)
            and alternative is not None
            and always_leaves(alternative.named_children[-1])
        )
    return False


def outcome(node: Node, path: list[str]) -> dict | None:
    where = f"../cli.ts:{line(node)}"
    trail = [step for step in path if step]
    if node.type == "throw_statement":
        thrown = node.named_children[0]
        message = text(thrown)
        args = thrown.child_by_field_name("arguments")
        if args is not None and args.named_children:
            message = text(args.named_children[0]).strip("`\"'")
        reason = slug(message.split(":")[0])
        return {
            "Id": ".".join(trail + [f"throws-{reason}"]),
            "When": " and ".join(trail) or "always",
            "Outcome": "throws",
            "SaysToday": message,
            "Where": where,
            **TO_FILL,
        }
    value = node.named_children[0] if node.named_children else None
    fields = {}
    if value is not None and value.type == "object":
        for pair in value.named_children:
            if pair.type == "pair":
                fields[text(pair.child_by_field_name("key"))] = pair.child_by_field_name("value")
    exit_node = fields.get("exit")
    if exit_node is None or exit_node.type != "number" or "out" not in fields:
        unplaced.append({"Where": where, "Code": text(node), "Why": "not a return of { exit: <number>, out }"})
        return None
    exit_code = int(text(exit_node))
    return {
        "Id": ".".join(trail + [f"exit-{exit_code}"]),
        "When": " and ".join(trail) or "always",
        "Outcome": f"exit {exit_code}",
        "SaysToday": text(fields["out"]),
        "Where": where,
        **TO_FILL,
    }


def walk(block: Node, path: list[str], rows: list[dict]) -> None:
    """Visits a block's statements in order, carrying the conditions that reach each one."""
    passed: list[str] = []
    for statement in block.named_children:
        here = path + passed
        if statement.type in ("return_statement", "throw_statement"):
            row = outcome(statement, here)
            if row is not None:
                rows.append(row)
            return
        if statement.type == "if_statement":
            condition = statement.child_by_field_name("condition")
            consequence = statement.child_by_field_name("consequence")
            alternative = statement.child_by_field_name("alternative")
            walk_branch(consequence, here + [describe(condition, False)], rows)
            if alternative is not None:
                walk_branch(alternative.named_children[-1], here + [describe(condition, True)], rows)
            if always_leaves(consequence):
                passed.append(describe(condition, True))
            continue
        if statement.type in ("lexical_declaration", "expression_statement"):
            continue
        unplaced.append({"Where": f"../cli.ts:{line(statement)}", "Code": text(statement)[:80], "Why": f"rows.py does not read a {statement.type}"})


def walk_branch(node: Node, path: list[str], rows: list[dict]) -> None:
    if node.type == "statement_block":
        walk(node, path, rows)
    else:
        walk_single(node, path, rows)


def walk_single(node: Node, path: list[str], rows: list[dict]) -> None:
    if node.type in ("return_statement", "throw_statement"):
        row = outcome(node, path)
        if row is not None:
            rows.append(row)
    elif node.type == "if_statement":
        walk(node.parent, path, rows)


run = find_run(tree.root_node)
rows: list[dict] = []
if run is None:
    unplaced.append({"Where": "../cli.ts", "Code": "", "Why": "no function named run"})
else:
    body = run.child_by_field_name("body")
    if body.type == "statement_block":
        walk(body, [], rows)
    else:
        row = outcome(body, [])
        if row is not None:
            rows.append(row)

UNPLACED.write_text("".join(json.dumps(entry) + "\n" for entry in unplaced))

seen: set[str] = set()
for row in rows:
    if row["Id"] in seen:
        print(f"two outcomes share the Id {row['Id']}", file=sys.stderr)
        sys.exit(1)
    seen.add(row["Id"])
    print(json.dumps(row))

print(f"read cli.ts: {len(rows)} rows from run", file=sys.stderr)
if unplaced:
    print(f"left out: {len(unplaced)}, listed in unplaced.jsonl", file=sys.stderr)
    for entry in unplaced:
        print(f"  {entry['Where']}: {entry['Why']}", file=sys.stderr)
else:
    print("left out: nothing", file=sys.stderr)
