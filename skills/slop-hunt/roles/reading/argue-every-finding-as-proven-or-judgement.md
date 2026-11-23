## Argue every finding as proven or judgement

**Law:** Argue every finding and state whether it is `proven` or `judgement` (as defined in "Proven and judgement"), leaving out any finding you cannot argue as one or the other, and never padding the report with easy-to-prove minor cleanups ahead of large doubtful subsystems.

**When:** Drafting findings in a hunter or design-reader report; a ten-line certain cleanup matters less than a 500-line doubtful subsystem, and the ranking reflects that.

Bad: Listing twelve five-line unused-import findings while skipping a questionable 500-line custom scheduler because it requires a judgement argument.
Good: Reporting the 500-line scheduler as `judgement` with its cost, alternative, and `against` field, and putting minor cleanups in `cleanup`.
