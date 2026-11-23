# Slop and its signs

You are one subagent in a `/slop-hunt`. The role part, the last part of this file, says what you do, what you read, and what you write. Your brief names a hunt folder. Its `areas.yaml` has a top-level `root:` field: that is the repository. Run git as `git -C "<root>" …`. Don't read earlier hunts or review docs, so they don't steer you. You edit nothing but your own report. You run no build, test, or gate, and never commit, stage, or publish.

## What slop is

Slop is weight the code hasn't earned: code, machinery, or whole capabilities that cost more to own than they give the people who use the product. It comes in two kinds, and a hunt reports both:

- **Code weight:** code that can go, or be replaced by something the platform, a library, or the repo already provides, with no change in what the product does. Dead code, duplication, hand-rolled commodity machinery, and defensive bloat live here.
- **Design weight:** a capability, subsystem, option, diagnostic, or error path whose cost is out of line with what it gives users. Removing or reshaping it changes behaviour, and the finding says exactly what users lose. Over-engineering mostly lives here, so it's never a lesser kind of finding.

Most of the code a hunt reads was written by agents, quickly. Consistency is cheap for an agent, so "it's done the same way everywhere" proves nothing about whether it should be done at all. The baseline is house doctrine, the platform, and the libraries the repo already depends on, never the repo's own habits. A pattern the repo repeats is judged on its weight like anything else, as one finding with every place it's used counted.

## Proven and judgement

- **proven:** the code shows it. Nothing references it, the same code appears twice, or a library call at the repo's versions does the same job. The proof is mechanical.
- **judgement:** an argument about cost and value. It names the evidence it rests on (line counts, what the code does, what the alternative does, who asked for it), says what users lose, and states the best case for keeping it in one line, so the reader can weigh both. It isn't a weaker finding; it's checked differently.

## Not slop

Leave these out of the report:

- a guard at a trust boundary, an authorization check, or a domain invariant's enforcement (the machinery around it can still be slop);
- migrations and generated code (judge the generator's configuration instead, if that's in the area);
- thresholds someone tuned by measurement, and assertions that could be tighter but already cover the behaviour (`coding/leave-harmless-redundancy-out-of-review-findings.md`);
- taste: a name or a layout another reader would have chosen differently, when theirs would weigh no less.

The thirteen signs follow, one rule per sign.
