---
name: slop-hunt
description: Use when the user runs /slop-hunt or asks for a slop hunt, slop review, anti-slop sweep, or over-engineering review. A read-only hunt over the current repository for weight the code hasn't earned, from whole capabilities down to dead code. Each finding is argued, says what users would lose, and is ranked by the weight it removes.
---
# Slop hunt

A hunt finds weight the code hasn't earned: code, machinery, or whole capabilities that cost more to own than they give users. You dispatch. You don't hunt, check, rank, or write the report: subagents do, each from one role file. You write only in `<run>` (and the one exclude line in step 1), and run no restore, build, test, or gate. `/slop-hunt` takes no arguments; given one, say so and stop. If you can't start subagents, say so and stop.

- `<skill>` is the folder this SKILL.md was loaded from.
- `<root>` is the repository being hunted, and `<main>` is its main checkout.
- `<run>` is the run folder.

`<root>`, `<main>`, and `<run>` are absolute paths step 1 finds: write them out in full, and in double quotes, in every later command. A brief is exactly these four lines, with nothing added:

```
Read <skill>/references/<role>.md in full, then do what it says.
Hunt folder: <run>
Yours: <name>
Report: <absolute path>
```

Start each subagent fresh: a new agent that has only its brief, not a fork of this conversation. A subagent replies with its report path. If it replies with the report instead, save the reply unchanged to that path. No file, or a file whose last line is not the one the role must end on, is a miss: start the role once more with the same brief; a second miss is not retried. Only a hunter's report has a required last line: `Not read in full:`.

After a compaction, `<run>` is the folder the waypoint names. Never run steps 1 to 6 again; carry on at the first of steps 7 to 10 whose report files are missing.

1. **Locate.** Run `git rev-parse --show-toplevel` (this is `<root>`; if it fails, stop), then `dirname "$(git -C "<root>" rev-parse --path-format=absolute --git-common-dir)"` (this is `<main>`). `<run>` is `<main>/.plans/scratch/slop-hunt-` plus the output of `date +%Y%m%d-%H%M%S`. Run `git -C "<main>" check-ignore -q .plans/ || echo '.plans/' >> "$(git -C "<main>" rev-parse --path-format=absolute --git-path info/exclude)"`, then `mkdir -p "<run>"`. Tell the user the path.
   Done when: `<run>` exists.
2. **List the files.** The list is what gets read; data, lockfiles, and generated code are left out on purpose. Run:
   ```
   dirs='(^|/)(Migrations|migrations|generated|vendor|__snapshots__|__fixtures__|fixtures|\.nuxt)/'; { git -C "<root>" -c core.quotePath=false grep -I -l --untracked -e '' -- . | grep -vE "$dirs|\.(g|Designer)\.cs\$|(lock\.json|\.lock|-lock\.yaml|\.snap|\.txt|\.csv|\.tsv)\$"; git -C "<root>" -c core.quotePath=false grep -I -l --untracked -e '' -- '*CMakeLists.txt' '*requirements*.txt' | grep -vE "$dirs"; } | LC_ALL=C sort -u > "<run>/scope.txt"
   ```
   The second `git grep` adds back the `.txt` build files, which are code, through the folder filter only; both lists include untracked files.
   Done when: `scope.txt` is non-empty.
3. **Size them.** Run:
   ```
   cd "<root>" && tr '\n' '\0' < "<run>/scope.txt" | LC_ALL=en_US.UTF-8 xargs -0 wc -l | awk '{n=$1; sub(/^ *[0-9]+ /,""); if ($0!="total") print n "\t" $0}' > "<run>/sizes.txt"
   sort -rn "<run>/sizes.txt" | head -15
   ```
   A hand-kept data file over 2,000 lines in that list (seeds, i18n files, GeoJSON) is not code: remove its line from `scope.txt` with your file-editing tool, run `printf '%s\n' '<path>' >> "<run>/left-out.txt"`, and run this step again.
   Done when: no data file over 2,000 lines is among the 15 biggest.
4. **Churn.** Run:
   ```
   git -C "<root>" -c core.quotePath=false log --since=12.months --no-renames --format= --name-only -- . | grep -Fxf "<run>/scope.txt" | sort | uniq -c | sort -rn | head -40 > "<run>/churn.txt"
   ```
   Done when: the file exists (it may be empty).
5. **Run the finders** the repo already has, as leads and nothing more. Run each from `<root>`. Never add a config file, package, or setting to the repo, and never restore, build, or `nuxi prepare` to make one run: run `echo 'skipped: <why>' > "<run>/leads-<tool>.txt"` instead.
   - `knip`, when `<root>/package.json` exists. On Nuxt (a `nuxt.config.*` file), only when `<root>/.nuxt` exists, since without it every auto-import reads as unused. Run `cd "<root>" && { if [ -x node_modules/.bin/knip ]; then node_modules/.bin/knip; else npx --yes knip@5; fi; } > "<run>/leads-knip.txt" 2>&1`.
   - `jscpd`, for any stack. It reads the files of `scope.txt` and nothing else, so it skips what step 2 left out and what step 3 moved to `left-out.txt`. Run `jq -R -s --arg root "<root>" '{path: (split("\n") | map(select(length > 0) | $root + "/" + .))}' "<run>/scope.txt" > "<run>/jscpd.json" && cd "<root>" && npx --yes jscpd@5 --config "<run>/jscpd.json" --reporters console > "<run>/leads-jscpd.txt" 2>&1`.
   - .NET, only if `find "<root>" -path '*/obj/project.assets.json' | head -1` prints a path. With `<solution>` the `.sln` or `.slnx` file (each in turn if there are several), run `cd "<root>" && dotnet format style "<solution>" --verify-no-changes --no-restore --severity hidden --diagnostics IDE0051 IDE0052 IDE0060 --include . 2>&1 | grep -E 'IDE00(51|52|60)' >> "<run>/leads-dotnet-format.txt"`; and, if `jb` is installed, `jb inspectcode "<solution>" --no-build --swea -o="<run>/leads-inspectcode.txt"`.
   - The repo's own linter or doctrine checker, in check mode, when its instructions name one: run that command with `> "<run>/leads-lint.txt" 2>&1` after it.

   Done when: every finder above that applies to the repo's stack has a leads file.
6. **Split into areas.** Start `areas.md` and the function that adds an area (`area` takes a name and a regex that matches the start of its files' paths; each file must match exactly one area):
   ```
   { echo "Root: <root>"; echo "Head: $(git -C "<root>" rev-parse --short HEAD)"; } > "<run>/areas.md"
   cat > "<run>/area.sh" <<'EOF'
   area() { n=$(p="$2" awk -F'\t' '$2 ~ ENVIRON["p"] {s+=$1} END{print s+0}' sizes.txt); { echo; echo "## $1 · $n"; p="$2" awk -F'\t' '$2 ~ ENVIRON["p"] {print "- " $2}' sizes.txt; } >> areas.md; }
   EOF
   ```
   Then split the files in `sizes.txt` into areas: one per module or package, about 8,000 lines at most. Split a bigger module along its folders, merge small neighbours up to the limit, and give a single file over the limit its own area. Scripts, docs, and config go with the nearest module. With more than one area, add a `cross-cutting` one for shared kernel and infrastructure files. Area names are lowercase words joined by hyphens. Add the areas in one command that loads `area.sh` first (a shell keeps no function between commands); the `area` calls below are an example:
   ```
   cd "<run>" && . ./area.sh && area api '^src/Api/' && area web '^(web|e2e)/'
   ```
   Then check the split:
   ```
   cd "<run>" && grep '^- ' areas.md | cut -c3- | LC_ALL=C sort | diff - scope.txt
   ```
   Done when: the check prints nothing. A `<` line is a file in two areas, a `>` line a file in none. If it prints anything, run this step again from the `areas.md` start command (it empties the file, so never call `area` again without it) with corrected patterns, at most three tries in all. If the check still prints anything after the third try, stop and tell the user what it printed.
7. **Design reader.** If `areas.md` has more than one `## ` heading, start one subagent: role `design-reader`, Yours `design`, Report `<run>/report-design.md`.
   Done when: that file exists, there is one area, or the design reader was started twice.
8. **Hunters.** Start one subagent per `## ` heading in `areas.md`, at most 8 running at once: role `hunter`, Yours the heading's name, Report `<run>/report-<name>.md`. When a report exists, run `tail -n 1 "<run>/report-<name>.md"`. If that line names files after `Not read in full:`, add them to `areas.md` as a `-rest` area, with `<name>` the area's name and the paths on that line separated by `, `, and start one hunter for it (Yours `<name>-rest`, Report `<run>/report-<name>-rest.md`):
   ```
   cd "<run>" && . ./area.sh && area <name>-rest "^($(tail -n 1 "report-<name>.md" | sed 's/^Not read in full: //; s/[][\.*^$+?(){}|]/\\&/g; s/, /|/g'))\$"
   ```
   That adds the heading `## <name>-rest · <their sizes added up>` with each file on a `- <path>` line. Never do this for a `-rest` area.
   Done when: every area has a report file, or was started twice.
9. **Verifiers.** For each `<run>/report-<x>.md`, start one subagent, at most 8 running at once: role `verifier`, Yours `report-<x>.md`, Report `<run>/verify-<x>.md`.
   Done when: each report has its `verify-` file, or its verifier was started twice.
10. **Reporter.** Start one subagent: role `reporter`, Yours `all`, Report `<run>/report.md`. A second miss: tell the user and stop.
    Done when: `<run>/report.md` exists.
11. **Relay.** Run `cat "<run>/report.md"`. Your reply is that output, word for word, then one line: `Report file: <run>/report.md`. Add no finding, ranking, or recommendation of your own.
