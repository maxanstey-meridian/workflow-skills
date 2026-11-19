#!/usr/bin/env python3
"""The test-oracle ledger: checks, merges, and lists the records of a case.

A case is a folder named `__oracle__`, placed next to what it pins down. It holds
oracle.conf.json, whose one key `rows` is the row script's command, and the records. The
ledger runs that command with the case folder's absolute path as its last argument, in the
case folder. The row script prints the rows, each with every field to be filled present as
null; this script writes them into table/rows.jsonl. `--freeze` pins the row script's file
by its sha256 in frozen.json, and `--rows` refuses when the file has changed since. A filler
agent writes fill records, a disprover agent writes verdicts, and a
field reaches the table only when its verdict is CONFIRMED and the verdict's `Judged` equals the
fill record as it stands. `--open` is the only statement of where a case stands, and its exit 0
is the only "done".

There is nothing to write by hand but oracle.conf.json and the row script. The row script decides which rows exist and which fields they carry:
a field printed as null is a field to fill, and every other field is the script's own. There
are two passes, `fill` and `test`; `test` owns the field Test, and `fill` owns every other
null field. Cited files are relative to the citation root: the folder `git rev-parse
--show-toplevel` prints in the case folder, or the case folder itself when that fails.

    ledger.py --freeze <case> --words "<the user's words>"
    ledger.py --rows <case> [--draft]
    ledger.py --check <case> <pass> <slice>
    ledger.py --merge <case> <pass> <slice>
    ledger.py --results <case> <junit file>... [--slice <slice>]
    ledger.py --rule <case> <id> <field> --words "<the user's words>"
    ledger.py --strike <case> <id> --why "<the user's words>"
    ledger.py --open <case>

Exit codes: 0 fine; 1 a gate is red; 2 an input can't be read or is malformed, and then nothing
is written.

Why this is our own code and not a maintained tool (Meridian: record why no library fits). The
need is a table that merges a field only when a second party's verdict confirms it, that goes
stale when a quote leaves its file, and that treats a failing test as the expected result for a
row with a known shortfall. Checked against it:

- Doorstop: its review state is one fingerprint over a whole item, so it cannot confirm one
  field at a time, and its `import` deletes fields added afterwards.
- OpenFastTrace: it traces a tag that says a test exists, not that the test ran, and it stores no
  fields.
- reqcov, trace-matrix-check, and reqstool: none can treat a failing test as the expected
  result (that last claim is a Sonnet subagent's, not checked here).

What this script does take from the standard library: `json` reads the records, and
`xml.etree.ElementTree` the test results. `subprocess` runs the row script and git, and
`hashlib` pins the row script. It uses nothing else.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date
from pathlib import Path

VERDICTS = ("CONFIRMED", "PARTLY", "WRONG", "CAN'T TELL")
VERDICT_KEYS = ("Id", "Field", "Verdict", "Evidence", "Judged")
# Fields the ledger alone writes, which a row script may never print.
LEDGER_FIELDS = ("Gone", "Ran", "Struck")
# Fields on every row that are neither the script's fields to fill nor the ledger's.
ROW_KEYS = ("Id", "Slice")
# Fields the ledger gives a meaning to; every other field is the script's.
CANTHAPPEN = "CantHappen"
SHORTFALL = "Shortfall"
TEST = "Test"
# The two passes. `test` owns the field Test; `fill` owns every other field the script printed as null.
FILL = "fill"
TEST_PASS = "test"
PASSES = (FILL, TEST_PASS)
# A case is a folder with exactly this name, placed next to what it pins down.
CASE_FOLDER = "__oracle__"
# Its one config file: {"rows": [<the row script's command, run in the case folder>]}.
CONF_FILE = "oracle.conf.json"
FROZEN_FILE = "frozen.json"
NAME = re.compile(r"[A-Za-z][A-Za-z0-9_-]*")
FOLDER_UNSAFE = re.compile(r"[/\\\x00]")
RULING_LINE = re.compile(r"^- \S+ · (\S+) · ([A-Za-z0-9_-]+): ", re.MULTILINE)
NOT_ALNUM = re.compile(r"[^a-z0-9]")
LINE_SUFFIX = re.compile(r"(:\d+(-\d+)?)+$")
# Where an expected value came from: a value record of an expected field carries one of these as `Source`.
SOURCE_WORDS = ("written", "ruling", "meridian", "today", "judgement")
# A citation's File may name one of the skill's own rule files as `meridian:<name>`.
MERIDIAN_PREFIX = "meridian:"
REFERENCES = Path(__file__).resolve().parent.parent / "references"
MERIDIAN_FILE = re.compile(r"rules-[A-Za-z0-9_.-]*\.md")
# Under the case folder, what a `written` source may never cite: the records are agents' and the ledger's own words.
RECORD_FOLDERS = ("table", FILL, TEST_PASS, "reports")
RECORD_FILES = ("rulings.md", FROZEN_FILE, CONF_FILE)


class RecordError(Exception):
    """An input can't be read or is malformed: exit 2, and nothing is written."""

    def __init__(self, problems):
        super().__init__("; ".join(problems))
        self.problems = list(problems)


# ---------------------------------------------------------------- the records


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RecordError([f"{path}: it can't be read ({exc.strerror})."])
    except UnicodeDecodeError:
        raise RecordError([f"{path}: it is not UTF-8 text."])


def read_jsonl(path: Path) -> list[dict]:
    text = read_text(path)
    records = []
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise RecordError([f"{path}: line {number} is not JSON ({exc})."])
        if not isinstance(record, dict):
            raise RecordError([f"{path}: line {number} is not a JSON object."])
        records.append(record)
    return records


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")


def is_str(value) -> bool:
    return isinstance(value, str) and value.strip() != ""


def is_slice_name(value) -> bool:
    """A slice is a folder name under <pass>/filled/ (Decision 6), so it can't point anywhere else."""
    return is_str(value) and value not in (".", "..") and FOLDER_UNSAFE.search(value) is None


# ---------------------------------------------------------------- the case


@dataclass
class Case:
    folder: Path
    root: Path
    frozen: dict | None
    rows_command: list[str]

    @property
    def label(self) -> str:
        """What a case is called in output: its folder name is always the same, so the folder it sits in comes first."""
        return f"{self.folder.parent.name}/{self.folder.name}"

    @property
    def table_path(self) -> Path:
        return self.folder / "table" / "rows.jsonl"

    @property
    def rulings_path(self) -> Path:
        return self.folder / "rulings.md"

    @property
    def frozen_path(self) -> Path:
        return self.folder / FROZEN_FILE


def citation_root(folder: Path) -> Path:
    """The folder `git rev-parse --show-toplevel` prints in the case folder; the case folder when that fails."""
    try:
        run = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=folder, capture_output=True, text=True)
    except OSError:
        return folder
    top = run.stdout.strip()
    if run.returncode != 0 or not top:
        return folder
    try:
        root = Path(top).resolve()
    except (ValueError, OSError):
        return folder
    return root if root.is_dir() and folder.is_relative_to(root) else folder


def read_frozen(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        raise RecordError([f"{path}: it can't be read as JSON ({exc})."])
    script = data.get("script") if isinstance(data, dict) else None
    well_formed = (
        isinstance(data, dict)
        and set(data) == {"date", "words", "script"}
        and is_str(data["date"])
        and is_str(data["words"])
        and isinstance(script, dict)
        and set(script) == {"file", "sha256"}
        and is_str(script["file"])
        and is_str(script["sha256"])
    )
    if not well_formed:
        raise RecordError([f"{path}: it must hold exactly `date` and `words`, both text, and `script`, holding `file` and `sha256`, both text."])
    return data


def read_conf(folder: Path) -> list[str]:
    """The row script's command from oracle.conf.json: exactly one key, `rows`, a non-empty list of text."""
    path = folder / CONF_FILE
    if not path.is_file():
        raise RecordError([f"{path} does not exist: a case holds {CONF_FILE}, whose one key `rows` is the row script's command."])
    try:
        conf = json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        raise RecordError([f"{path}: it is not JSON ({exc})."])
    if not isinstance(conf, dict):
        raise RecordError([f"{path}: it must be a JSON object holding exactly one key, `rows`."])
    if set(conf) != {"rows"}:
        extra = sorted(set(conf) - {"rows"})
        raise RecordError([f"{path}: it must hold exactly one key, `rows`" + (f"; it also holds {', '.join(extra)}." if extra else "; it holds no `rows`.")])
    rows = conf["rows"]
    if not (isinstance(rows, list) and rows and all(isinstance(part, str) and part != "" for part in rows)):
        raise RecordError([f"{path}: `rows` must be a non-empty list of text, the row script's command."])
    return rows


def load_case(folder_arg: str, read_freeze: bool = True) -> Case:
    """`read_freeze` is False only for --freeze, which replaces frozen.json and so never needs the old one to be valid."""
    folder = Path(folder_arg).resolve()
    if folder.name != CASE_FOLDER:
        raise RecordError([f"{folder}: a case is a folder named exactly {CASE_FOLDER}, and this one is named {folder.name!r}."])
    if not folder.is_dir():
        raise RecordError([f"{folder} is not a folder: a case is a folder named {CASE_FOLDER} holding {CONF_FILE}."])
    frozen = read_frozen(folder / FROZEN_FILE) if read_freeze else None
    return Case(folder=folder, root=citation_root(folder), frozen=frozen, rows_command=read_conf(folder))


# ---------------------------------------------------------------- the row script's pin


def script_file(case: Case) -> Path | None:
    """The row script's file: the first element of the rows command that names an existing file, resolved against the case folder."""
    for part in case.rows_command:
        candidate = Path(os.path.normpath(case.folder / part))
        if candidate.is_file():
            return candidate
    return None


def script_pin(case: Case) -> dict | None:
    """The row script's file (relative to the case folder) and the sha256 of its bytes, or None when the command names no file."""
    file = script_file(case)
    if file is None:
        return None
    return {"file": os.path.relpath(file, case.folder), "sha256": hashlib.sha256(file.read_bytes()).hexdigest()}


def pin_mismatch(case: Case) -> str | None:
    """Why the row script is no longer the one frozen, or None when it is, or when nothing is frozen."""
    if case.frozen is None:
        return None
    frozen = case.frozen["script"]
    now = script_pin(case)
    if now == frozen:
        return None
    now_text = f"{now['file']} sha256 {now['sha256']}" if now else "no file (the rows command names none that exists)"
    return (
        f"the row script changed since the freeze, and must be frozen again.\n"
        f"  frozen:  {frozen['file']} sha256 {frozen['sha256']}\n"
        f"  now:     {now_text}"
    )


def check_pass(name: str) -> str:
    if name not in PASSES:
        raise RecordError([f"{name!r} is not a pass: the passes are {' and '.join(PASSES)}."])
    return name


# ---------------------------------------------------------------- the table


def read_table(case: Case) -> list[dict]:
    if not case.table_path.is_file():
        raise RecordError([f"{case.table_path} does not exist: run --rows first."])
    rows = read_jsonl(case.table_path)
    seen: set[str] = set()
    for row in rows:
        row_id = row.get("Id")
        if not is_str(row_id):
            raise RecordError([f"{case.table_path}: a row has no Id."])
        if row_id in seen:
            raise RecordError([f"{case.table_path}: the Id {row_id} is there twice."])
        if not is_str(row.get("Slice")):
            raise RecordError([f"{case.table_path}: the row {row_id} has no Slice."])
        seen.add(row_id)
    return rows


def slice_of(row: dict) -> str:
    return row["Slice"]


def is_value(field_object) -> bool:
    return isinstance(field_object, dict) and "Value" in field_object


def is_question(field_object) -> bool:
    return isinstance(field_object, dict) and "Question" in field_object


def is_merged(field_object) -> bool:
    return is_value(field_object) or is_question(field_object)


def fields_of(row: dict) -> list[str]:
    """The fields a row has to fill: every key that holds null (not filled yet) or a merged field."""
    return [key for key, held in row.items() if key not in ROW_KEYS and key not in LEDGER_FIELDS and (held is None or is_merged(held))]


def fill_fields_of(row: dict) -> list[str]:
    return [field for field in fields_of(row) if field != TEST]


def pass_fields_of(row: dict, pass_name: str) -> list[str]:
    return [TEST] if pass_name == TEST_PASS else fill_fields_of(row)


def expected_fields_of(row: dict) -> list[str]:
    """The fields of the fill pass that hold an expected value: every one but CantHappen and Shortfall."""
    return [field for field in fill_fields_of(row) if field not in (CANTHAPPEN, SHORTFALL)]


def has_confirmed_chain(row: dict) -> bool:
    return is_value(row.get(CANTHAPPEN))


def expected_colour(row: dict) -> str:
    return "red" if is_value(row.get(SHORTFALL)) else "green"


def read_rulings(case: Case) -> set[tuple[str, str]]:
    if not case.rulings_path.is_file():
        return set()
    return {(row_id, field) for row_id, field in RULING_LINE.findall(read_text(case.rulings_path))}


# ---------------------------------------------------------------- citations


def normalise(text: str) -> str:
    return " ".join(text.split())


def normalise_name(text: str) -> str:
    """Lower-case, then only letters and digits: how a test's name is matched to a row's id, in any case style."""
    return NOT_ALNUM.sub("", text.lower())


class Sources:
    """The files a case's citations name, read once each, with whitespace runs as one space."""

    def __init__(self, root: Path):
        self.root = root
        self.cache: dict[Path, str] = {}

    def locate(self, name: str) -> tuple[Path | None, str]:
        """The one place a citation's File becomes a path: under root, or `meridian:<name>` in the skill's references/."""
        if name.startswith(MERIDIAN_PREFIX):
            rule_file = name[len(MERIDIAN_PREFIX):]
            if MERIDIAN_FILE.fullmatch(rule_file) is None:
                return None, "is not a rules-*.md file name"
            path = REFERENCES / rule_file
            if not path.is_file():
                return None, "does not exist in the skill's references/ folder"
            return path, ""
        try:
            path = (self.root / name).resolve()
        except (ValueError, OSError):
            return None, "is not a readable path"
        if not path.is_relative_to(self.root):
            return None, "is not under root"
        if not path.is_file():
            return None, "does not exist"
        return path, ""

    def text(self, path: Path) -> str:
        if path not in self.cache:
            self.cache[path] = normalise(path.read_text(encoding="utf-8", errors="replace"))
        return self.cache[path]

    def stale_cite(self, field_object) -> dict | None:
        """The first citation of a merged field whose file is missing or whose quote is gone."""
        for cite in field_object.get("Cites", []) if isinstance(field_object, dict) else []:
            path, _why = self.locate(cite["File"])
            if path is None or normalise(cite["Quote"]) not in self.text(path):
                return cite
        return None


def barred_for_written(case: Case, row: dict | None) -> set[Path]:
    """The files a `written` source may not cite for a row: the row script, the file its `Where` points into, and the records."""
    barred = {(case.folder / name).resolve() for name in RECORD_FILES}
    script = script_file(case)
    if script is not None:
        barred.add(script.resolve())
    where = row.get("Where") if row else None
    if isinstance(where, str) and where.strip():
        name = LINE_SUFFIX.sub("", where.strip())
        for base in (case.folder, case.root):
            try:
                barred.add((base / name).resolve())
            except (ValueError, OSError):
                pass
    return barred


def in_records(case: Case, path: Path) -> bool:
    return any(path.is_relative_to((case.folder / name).resolve()) for name in RECORD_FOLDERS)


# ---------------------------------------------------------------- --freeze


def cmd_freeze(case_arg: str, words: str) -> int:
    case = load_case(case_arg, read_freeze=False)
    pin = script_pin(case)
    if pin is None:
        raise RecordError([f"{case.folder / CONF_FILE}: no element of `rows` ({' '.join(case.rows_command)}) names an existing file when resolved against {case.folder}, so the script file can't be found and there is nothing to freeze."])
    if not is_str(words):
        raise RecordError(["--words is empty: the freeze records the user's words."])
    frozen = {"date": date.today().isoformat(), "words": words, "script": pin}
    case.frozen_path.write_text(json.dumps(frozen, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{case.label}: row script frozen {frozen['date']}: {frozen['words']}")
    print(f"  pinned {pin['file']} sha256 {pin['sha256']}")
    return 0


# ---------------------------------------------------------------- --rows


def run_row_script(case: Case) -> list[dict]:
    command = [*case.rows_command, str(case.folder)]
    try:
        run = subprocess.run(command, cwd=case.folder, capture_output=True)
    except OSError as exc:
        raise RecordError([f"the row script could not start ({exc.strerror}): {' '.join(command)}"])
    try:
        stdout, stderr = run.stdout.decode("utf-8"), run.stderr.decode("utf-8")
    except UnicodeDecodeError:
        raise RecordError(["the row script's output is not UTF-8 text, on stdout or stderr."])
    sys.stderr.write(stderr)
    if run.returncode != 0:
        raise RecordError([f"the row script exited {run.returncode}."])
    problems: list[str] = []
    rows: list[dict] = []
    seen: set[str] = set()
    by_normal: dict[str, str] = {}
    for number, line in enumerate(stdout.splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            problems.append(f"row script line {number} is not JSON.")
            continue
        if not isinstance(row, dict):
            problems.append(f"row script line {number} is not a JSON object.")
            continue
        row_id = row.get("Id")
        if not is_str(row_id):
            problems.append(f"row script line {number} has no Id.")
            continue
        if re.search(r"[\s\]]", row_id):
            problems.append(f"row script line {number}: the Id {row_id!r} holds whitespace or `]`.")
        if row_id in seen:
            problems.append(f"row script line {number}: the Id {row_id} is printed twice.")
        else:
            matched = normalise_name(row_id)
            if matched == "":
                problems.append(f"row script line {number}: the Id {row_id!r} holds no letter or digit, so no test name can match it.")
            elif matched in by_normal:
                problems.append(f"row script line {number}: the Ids {by_normal[matched]!r} and {row_id!r} are equal once compared lower-case with only letters and digits, so a test name could not tell them apart.")
            else:
                by_normal[matched] = row_id
        seen.add(row_id)
        for key, held in row.items():
            if key in LEDGER_FIELDS:
                problems.append(f"{row_id}: the row script prints {key}, which is the ledger's field.")
            elif key in (CANTHAPPEN, SHORTFALL) and held is not None:
                problems.append(f"{row_id}: the row script prints {key} with a value: it must print it as null, for the filler.")
            elif is_merged(held):
                problems.append(f"{row_id}: the row script prints {key} as an object holding Value or Question, which is the shape of a merged field.")
            elif held is None and key not in ROW_KEYS and NAME.fullmatch(key) is None:
                problems.append(f"{row_id}: {key!r} is printed as null, so it is a field to fill, and can't be a field name.")
        printed_null = [key for key, held in row.items() if held is None and key not in ROW_KEYS]
        if not [key for key in printed_null if key != TEST]:
            problems.append(f"{row_id}: the row script prints no field to fill: every field to fill is printed as null, and Test alone is not one.")
        if TEST not in row or row[TEST] is not None:
            problems.append(f"{row_id}: the row script must print Test as null.")
        if "Slice" in row and not is_slice_name(row["Slice"]):
            problems.append(f"{row_id}: Slice {row['Slice']!r} is not a folder name: it must be text with no slash or NUL, and not `.` or `..`.")
        row.setdefault("Slice", "all")
        rows.append(row)
    if problems:
        raise RecordError(problems)
    return rows


def cmd_rows(case_arg: str, draft: bool) -> int:
    case = load_case(case_arg)
    mismatch = pin_mismatch(case)
    if mismatch is not None and not draft:
        print(f"nothing was written: {mismatch}")
        return 1
    printed = run_row_script(case)
    if draft or case.frozen is None:
        for row in printed:
            print(json.dumps(row, ensure_ascii=False))
        if draft:
            if mismatch is not None:
                print(f"note: {mismatch}")
            print("nothing was written: --draft.")
            return 0
        print(f"nothing was written: the case has no {FROZEN_FILE}; the user freezes the row script first, with --freeze.")
        return 1

    old = read_table(case) if case.table_path.is_file() else []
    printed_by_id = {row["Id"]: row for row in printed}
    old_ids = {row["Id"] for row in old}
    rows: list[dict] = []
    problems: list[str] = []
    for old_row in old:
        if old_row["Id"] in printed_by_id:
            row = dict(printed_by_id[old_row["Id"]])
            for key, value in old_row.items():
                if key in ("Ran", "Struck"):
                    row[key] = value
                elif is_merged(value):
                    if row.get(key) is None:
                        row[key] = value
                    else:
                        problems.append(f"{old_row['Id']}: the row script now prints {key} with a value, and the table holds a merged {key}: a merged field is never dropped.")
        else:
            row = dict(old_row)
            row["Gone"] = True
        rows.append(row)
    if problems:
        raise RecordError(problems)
    new = [row for row in printed if row["Id"] not in old_ids]
    rows.extend(dict(row) for row in new)

    sources = Sources(case.root)
    emptied: list[str] = []
    for row in rows:
        for field in fields_of(row):
            stale = sources.stale_cite(row[field])
            if stale is not None:
                row[field] = None
                emptied.append(f"{row['Id']}.{field} (cites {stale['File']}, and the quote is gone)")
    write_jsonl(case.table_path, rows)

    print(f"{case.label}: row script frozen {case.frozen['date']}: {case.frozen['words']}")
    gone = sum(1 for row in rows if row.get("Gone"))
    print(f"rows: {len(rows)}, new: {len(new)}, gone: {gone}, fields emptied: {len(emptied)}")
    for entry in emptied:
        print(f"  emptied {entry}")
    return 0


# ---------------------------------------------------------------- --check


def shapes_of(record: dict) -> list[str]:
    shapes = []
    if "Value" in record or "Cites" in record:
        shapes.append("value")
    if "Question" in record or "Recommend" in record:
        shapes.append("question")
    if "Empty" in record:
        shapes.append("empty")
    return shapes


SHAPE_KEYS = {"value": {"Value", "Cites", "Source", "Why"}, "question": {"Question", "Recommend"}, "empty": {"Empty"}}


def parity(case: Case, pass_name: str, slice_name: str, table: list[dict]) -> tuple[list[str], list[dict]]:
    """The parity gate: every problem of one pass's fill for one slice, and the fill records."""
    check_pass(pass_name)
    fill_path = case.folder / pass_name / "filled" / slice_name / "fields.jsonl"
    if not fill_path.is_file():
        return [f"{fill_path} does not exist: the filler wrote nothing for this pass and slice."], []
    records = read_jsonl(fill_path)
    slice_rows = {row["Id"]: row for row in table if slice_of(row) == slice_name}
    if not slice_rows:
        raise RecordError([f"{case.table_path}: no row has the slice {slice_name!r}."])
    sources = Sources(case.root)
    rulings = read_rulings(case)
    problems: list[str] = []
    seen: set[tuple[str, str]] = set()

    for number, record in enumerate(records, 1):
        row_id, field = record.get("Id"), record.get("Field")
        label = f"{row_id}.{field}" if is_str(row_id) and is_str(field) else f"record {number}"
        if not is_str(row_id) or not is_str(field):
            problems.append(f"{label}: it has no Id or no Field.")
            continue
        if row_id not in slice_rows:
            problems.append(f"{label}: {row_id} is not a row of the slice {slice_name}.")
        elif field not in pass_fields_of(slice_rows[row_id], pass_name):
            problems.append(f"{label}: {field} is not a field of the pass {pass_name} for this row.")
        if (row_id, field) in seen:
            problems.append(f"{label}: it is filled twice.")
        seen.add((row_id, field))

        shapes = shapes_of(record)
        if len(shapes) != 1:
            problems.append(f"{label}: it must be exactly one of a value with citations, a question with a recommendation, or empty with a reason; it is {len(shapes)}.")
            continue
        shape = shapes[0]
        extra = sorted(set(record) - {"Id", "Field"} - SHAPE_KEYS[shape])
        if extra:
            problems.append(f"{label}: it has keys outside its shape: {', '.join(extra)}.")
        if field in (CANTHAPPEN, SHORTFALL) and shape != "value":
            problems.append(f"{label}: {field} is only ever a value with citations.")

        if shape == "question":
            if not is_str(record.get("Question")) or not is_str(record.get("Recommend")):
                problems.append(f"{label}: a question has an empty Question or Recommend.")
        elif shape == "empty":
            if not is_str(record.get("Empty")):
                problems.append(f"{label}: Empty says nothing about what stopped the filler.")
        else:
            problems.extend(check_value(case, pass_name, record, label, row_id, field, sources, slice_rows.get(row_id)))

    for row in slice_rows.values():
        if row.get("Struck") or has_confirmed_chain(row):
            continue
        for field in pass_fields_of(row, pass_name):
            if field in (CANTHAPPEN, SHORTFALL) or (row["Id"], field) in seen:
                continue
            held = row.get(field)
            if is_value(held) or (is_question(held) and (row["Id"], field) not in rulings):
                continue
            problems.append(f"{row['Id']}.{field}: unfilled: the filler wrote no record for it.")
    return problems, records


def check_value(case, pass_name, record, label, row_id, field, sources, row) -> list[str]:
    problems: list[str] = []
    expected = pass_name == FILL and field not in (CANTHAPPEN, SHORTFALL)
    source = record.get("Source")
    words = ", ".join(SOURCE_WORDS)
    if source is None:
        if expected:
            problems.append(f"{label}: {field} is an expected value and has no Source (one of {words}).")
    elif source not in SOURCE_WORDS:
        problems.append(f"{label}: Source {source!r} is not one of {words}.")
    source_fits = expected and source in SOURCE_WORDS
    if source_fits and source == "judgement" and not is_str(record.get("Why")):
        problems.append(f"{label}: Source judgement needs a Why: the judgement's reasons, in text.")
    if not is_str(record.get("Value")):
        problems.append(f"{label}: the value is empty.")
    cites = record.get("Cites")
    if not isinstance(cites, list) or not cites:
        problems.append(f"{label}: a value has no citation.")
        return problems
    barred = barred_for_written(case, row) if source_fits and source == "written" else set()
    well_formed = True
    for cite in cites:
        if not (isinstance(cite, dict) and set(cite) == {"File", "Quote"} and isinstance(cite["File"], str) and isinstance(cite["Quote"], str)):
            problems.append(f"{label}: a citation must be exactly a File and a Quote, both text.")
            well_formed = False
            continue
        path, why = sources.locate(cite["File"])
        if path is None:
            problems.append(f"{label}: it cites {cite['File']}, which {why}.")
            continue
        quote = normalise(cite["Quote"])
        if len(quote) < 3:
            problems.append(f"{label}: a quote from {cite['File']} is under 3 characters.")
        elif quote not in sources.text(path):
            problems.append(f"{label}: the quote {cite['Quote'][:60]!r} is not in {cite['File']}.")
        if source_fits and source == "written":
            if cite["File"].startswith(MERIDIAN_PREFIX):
                problems.append(f"{label}: Source written may cite only a file under root, not {cite['File']}.")
            elif path == case.rulings_path.resolve():
                problems.append(f"{label}: Source written may not cite rulings.md: a ruling is Source ruling.")
            elif path in barred or in_records(case, path):
                problems.append(f"{label}: Source written may not cite {cite['File']}: it is the row script, the code the row's Where points into, or one of the case's own records.")
        if source_fits and source == "ruling" and path != case.rulings_path.resolve():
            problems.append(f"{label}: Source ruling may cite only rulings.md, not {cite['File']}.")
    if source_fits and source == "meridian" and not any(isinstance(cite, dict) and isinstance(cite.get("File"), str) and cite["File"].startswith(MERIDIAN_PREFIX) for cite in cites):
        problems.append(f"{label}: Source meridian needs a citation whose File is meridian:<a rules-*.md file of the skill's references/>.")
    if field == TEST and well_formed and not any(normalise_name(row_id) in normalise_name(cite["Quote"]) for cite in cites):
        problems.append(f"{label}: no citation's quote holds this row's id (compared lower-case, letters and digits only), so the test is not shown to name its row.")
    return problems


def cmd_check(case_arg: str, pass_name: str, slice_name: str) -> int:
    case = load_case(case_arg)
    check_pass(pass_name)
    table = read_table(case)
    problems, records = parity(case, pass_name, slice_name, table)
    where = f"{case.label} {pass_name} {slice_name}"
    if problems:
        print(f"{where}: parity fails:\n  " + "\n  ".join(problems))
        return 1
    counts = {shape: sum(1 for record in records if shapes_of(record) == [shape]) for shape in SHAPE_KEYS}
    rows = sum(1 for row in table if slice_of(row) == slice_name)
    print(f"{where}: parity is sound: {rows} rows, {len(records)} records ({counts['value']} values, {counts['question']} questions, {counts['empty']} empty).")
    return 0


# ---------------------------------------------------------------- --merge


def cmd_merge(case_arg: str, pass_name: str, slice_name: str) -> int:
    case = load_case(case_arg)
    check_pass(pass_name)
    table = read_table(case)
    problems, fills = parity(case, pass_name, slice_name, table)
    where = f"{case.label} {pass_name} {slice_name}"
    if problems:
        print(f"{where}: parity fails, so nothing merges:\n  " + "\n  ".join(problems))
        return 1

    verdict_path = case.folder / pass_name / "verdicts" / f"{slice_name}.jsonl"
    if not verdict_path.is_file():
        raise RecordError([f"{verdict_path} does not exist: no verdicts, nothing merges."])
    held = {(record["Id"], record["Field"]) for record in fills}
    verdicts: dict[tuple[str, str], dict] = {}
    bad: list[str] = []
    for number, verdict in enumerate(read_jsonl(verdict_path), 1):
        missing = [key for key in VERDICT_KEYS if key not in verdict]
        if missing:
            bad.append(f"{verdict_path}: record {number} lacks {', '.join(missing)}.")
            continue
        if not is_str(verdict["Id"]) or not is_str(verdict["Field"]):
            bad.append(f"{verdict_path}: record {number}: Id and Field must be text.")
            continue
        key = (verdict["Id"], verdict["Field"])
        if verdict["Verdict"] not in VERDICTS:
            bad.append(f"{verdict_path}: {key[0]}.{key[1]}: Verdict {verdict['Verdict']!r} is not one of {', '.join(VERDICTS)}.")
        if key not in held:
            bad.append(f"{verdict_path}: {key[0]}.{key[1]} is no record of the fill: the verdicts and the fill disagree.")
        if key in verdicts:
            bad.append(f"{verdict_path}: {key[0]}.{key[1]} has two verdicts.")
        verdicts[key] = verdict
    if bad:
        raise RecordError(bad)

    rows = {row["Id"]: row for row in table}
    merged = stay_empty = 0
    for record in fills:
        key = (record["Id"], record["Field"])
        shape = shapes_of(record)[0]
        if shape == "empty":
            stay_empty += 1
            continue
        field_object = {name: record[name] for name in record if name not in ("Id", "Field")}
        verdict = verdicts.get(key)
        row = rows[key[0]]
        if verdict is not None and verdict["Verdict"] == "CONFIRMED" and verdict["Judged"] == field_object:
            row[key[1]] = field_object
            merged += 1
        else:
            row[key[1]] = None
            stay_empty += 1
    write_jsonl(case.table_path, table)
    print(f"{where}: {merged} fields merged; {stay_empty} stay empty, which leaves those rows open.")
    return 0


# ---------------------------------------------------------------- --results


def row_named_by(test_name: str, row_ids: list[str]) -> list[str]:
    """The row ids a test names: those whose normalised id is inside the normalised test name, longest only; more than one is a tie."""
    name = normalise_name(test_name)
    inside = [(len(normalise_name(row_id)), row_id) for row_id in row_ids if normalise_name(row_id) in name]
    if not inside:
        return []
    longest = max(length for length, _row_id in inside)
    return [row_id for length, row_id in inside if length == longest]


def junit_results(files: list[str], row_ids: list[str]) -> dict[str, str]:
    """Each row id a test's name holds -> red, not-run, or green, over every file of one run."""
    colours: dict[str, list[str]] = {}
    ties: list[str] = []
    for file in files:
        try:
            tree = ET.parse(file)
        except (OSError, ET.ParseError) as exc:
            raise RecordError([f"{file}: it can't be read as JUnit XML ({exc})."])
        for testcase in tree.iter("testcase"):
            if testcase.find("failure") is not None or testcase.find("error") is not None:
                colour = "red"
            elif testcase.find("skipped") is not None:
                colour = "not-run"
            else:
                colour = "green"
            test_name = " ".join(part for part in (testcase.get("name", ""), testcase.get("classname", "")) if part)
            named = row_named_by(test_name, row_ids)
            if len(named) > 1:
                ties.append(f"{file}: the test {test_name!r} holds the Ids {', '.join(repr(row_id) for row_id in named)}, which are equally long once compared lower-case with only letters and digits, so it names no one row: nothing written.")
            for row_id in named:
                colours.setdefault(row_id, []).append(colour)
    if ties:
        raise RecordError(ties)
    return {
        row_id: "red" if "red" in each else "not-run" if "not-run" in each else "green"
        for row_id, each in colours.items()
    }


def cmd_results(case_arg: str, files: list[str], slice_name: str | None) -> int:
    case = load_case(case_arg)
    table = read_table(case)
    results = junit_results(files, [row["Id"] for row in table])
    scope = [row for row in table if slice_name is None or slice_of(row) == slice_name]
    if not scope:
        raise RecordError([f"{case.table_path}: no row has the slice {slice_name!r}."])
    for row in table:
        if row["Id"] in results:
            row["Ran"] = results[row["Id"]]
        else:
            row.pop("Ran", None)
    write_jsonl(case.table_path, table)

    red: list[str] = []
    not_ready: list[str] = []
    ready = 0
    for row in scope:
        if row.get("Struck") or row.get("Gone") or has_confirmed_chain(row):
            continue
        lacking = [field for field in expected_fields_of(row) if not is_value(row.get(field))]
        if lacking:
            why = ", ".join(f"{field} is a question" if is_question(row.get(field)) else f"{field} is missing" for field in lacking)
            not_ready.append(f"{row['Id']}: not ready for a test: {why}")
            continue
        ready += 1
        ran, expects = row.get("Ran"), expected_colour(row)
        if ran is None:
            red.append(f"{row['Id']}: no run result")
        elif ran == "not-run":
            red.append(f"{row['Id']}: no run result: its test was skipped")
        elif ran != expects:
            red.append(f"{row['Id']}: ran {ran}, the table expects {expects}")
    print(f"{case.label}: Ran written on {len(results)} rows from {len(files)} files; {ready} ready rows judged.")
    for line in not_ready:
        print(f"  {line}")
    if red:
        print("results are red:")
        for line in red:
            print(f"  {line}")
        return 1
    print("results are as the table expects.")
    return 0


# ---------------------------------------------------------------- --rule and --strike


def cmd_rule(case_arg: str, row_id: str, field: str, words: str) -> int:
    case = load_case(case_arg)
    table = read_table(case)
    rows = {row["Id"]: row for row in table}
    if row_id not in rows:
        raise RecordError([f"{row_id} is not a row of the table; nothing is ruled."])
    if field not in fields_of(rows[row_id]):
        raise RecordError([f"{field} is not a field to fill on {row_id}; nothing is ruled."])
    one_line = re.sub(r"\r\n|\r|\n", " ", words)
    line = f"- {date.today().isoformat()} · {row_id} · {field}: {one_line}\n"
    existing = read_text(case.rulings_path) if case.rulings_path.is_file() else ""
    if existing and not existing.endswith("\n"):
        line = "\n" + line
    with case.rulings_path.open("a", encoding="utf-8") as handle:
        handle.write(line)
    print(f"{row_id}.{field}: ruled; the filler is sent again for its pass and slice, and cites this line of rulings.md.")
    return 0


def cmd_strike(case_arg: str, row_id: str, why: str) -> int:
    case = load_case(case_arg)
    table = read_table(case)
    for row in table:
        if row["Id"] == row_id:
            row["Struck"] = {"Why": why, "Date": date.today().isoformat()}
            write_jsonl(case.table_path, table)
            print(f"{row_id} is struck. {why}")
            return 0
    raise RecordError([f"{row_id} is not a row of the table; nothing is struck."])


# ---------------------------------------------------------------- --open


def open_reason(row: dict, sources: Sources, rulings: set) -> str | None:
    """Why a row is open, or None when it is closed: the first of the closing rules that holds."""
    if row.get("Struck"):
        return None
    if row.get("Gone"):
        return "gone from the row script; only a strike closes it"
    for field in fields_of(row):
        stale = sources.stale_cite(row[field])
        if stale is not None:
            return f"stale: {field} cites {stale['File']}, and the quote is gone"
    if has_confirmed_chain(row):
        return None
    for field in expected_fields_of(row):
        held = row.get(field)
        if is_question(held) and (row["Id"], field) not in rulings:
            return f"question for the user: {field}"
        if not is_value(held):
            return f"unfilled: {FILL}.{field}"
    if not is_value(row.get(TEST)):
        return "no confirmed test"
    ran = row.get("Ran")
    if ran is None or ran == "not-run":
        return "no run result"
    if ran != expected_colour(row):
        return f"ran {ran}, the table expects {expected_colour(row)}"
    return None


def cmd_open(case_arg: str) -> int:
    case = load_case(case_arg)
    table = read_table(case)
    if not table:
        print("the table has no rows; the row script printed none.")
        return 1
    sources = Sources(case.root)
    rulings = read_rulings(case)
    open_rows = []
    for row in table:
        reason = open_reason(row, sources, rulings)
        if reason is not None:
            open_rows.append((row, reason))
    if open_rows:
        print(f"{len(open_rows)} of the case's {len(table)} rows are open:")
        for row, reason in open_rows:
            print(f"  {row['Id']}: {reason}")
    else:
        print("0 rows open; every row closed.")
    asks = []
    for row in table:
        if row.get("Struck"):  # a strike retires the row's question
            continue
        for field in fields_of(row):
            held = row.get(field)
            if is_question(held) and (row["Id"], field) not in rulings:
                asks.append(f"  {row['Id']}: {held['Question']} (recommended: {held['Recommend']})")
    if asks:
        print("rows for the user:")
        for line in asks:
            print(line)
    from_today = [
        f"  {row['Id']}: {field}"
        for row in table
        if not row.get("Struck") and not row.get("Gone")
        for field in expected_fields_of(row)
        if is_value(row.get(field)) and row[field].get("Source") == "today"
    ]
    if from_today:
        print("expected from today's code:")
        for line in from_today:
            print(line)
    return 1 if open_rows else 0


# ---------------------------------------------------------------- the run


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ledger.py", allow_abbrev=False, description="Checks, merges, and lists the records of a test-oracle case: a folder named __oracle__.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--freeze", metavar="CASE", help="record the user's word that the row script is right, and pin the script's sha256, in frozen.json (with --words)")
    mode.add_argument("--rows", metavar="CASE", help="run the row script (the command in oracle.conf.json, given the case folder's path) and merge its rows into table/rows.jsonl")
    mode.add_argument("--check", nargs=3, metavar=("CASE", "PASS", "SLICE"), help="the parity gate; PASS is fill or test")
    mode.add_argument("--merge", nargs=3, metavar=("CASE", "PASS", "SLICE"), help="merge the fields a verdict confirmed; PASS is fill or test")
    mode.add_argument("--results", nargs="+", metavar=("CASE", "JUNIT"), help="write Ran from JUnit XML files and judge the rows")
    mode.add_argument("--rule", nargs=3, metavar=("CASE", "ID", "FIELD"), help="record the user's ruling (with --words)")
    mode.add_argument("--strike", nargs=2, metavar=("CASE", "ID"), help="record the user's strike (with --why)")
    mode.add_argument("--open", metavar="CASE", help="say where the case stands")
    parser.add_argument("--draft", action="store_true", help="with --rows: print the rows and write nothing")
    parser.add_argument("--slice", help="with --results: judge only this slice")
    parser.add_argument("--words", help="with --freeze or --rule: the user's words")
    parser.add_argument("--why", help="with --strike: the user's words")
    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.draft and not args.rows:
        parser.error("--draft goes with --rows")
    if args.slice and not args.results:
        parser.error("--slice goes with --results")
    if args.words is not None and not (args.rule or args.freeze):
        parser.error("--words goes with --freeze or --rule")
    if args.why is not None and not args.strike:
        parser.error("--why goes with --strike")
    if args.freeze and args.words is None:
        parser.error("--freeze needs --words")
    if args.rule and args.words is None:
        parser.error("--rule needs --words")
    if args.strike and args.why is None:
        parser.error("--strike needs --why")
    if args.results and len(args.results) < 2:
        parser.error("--results needs a case folder and at least one JUnit file")
    try:
        if args.freeze:
            return cmd_freeze(args.freeze, args.words)
        if args.rows:
            return cmd_rows(args.rows, args.draft)
        if args.check:
            return cmd_check(*args.check)
        if args.merge:
            return cmd_merge(*args.merge)
        if args.results:
            return cmd_results(args.results[0], args.results[1:], args.slice)
        if args.rule:
            return cmd_rule(*args.rule, args.words)
        if args.strike:
            return cmd_strike(*args.strike, args.why)
        return cmd_open(args.open)
    except RecordError as exc:
        print("\n".join(exc.problems), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
