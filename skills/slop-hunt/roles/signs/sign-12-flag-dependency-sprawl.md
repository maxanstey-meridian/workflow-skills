## Sign 12: Flag dependency sprawl

**Default:** Flag two libraries doing one job (two HTTP clients, two date libraries, or two mappers) or a package added for something the platform does in a line.

**When:** Reviewing project dependencies and imports; prove each finding by citing where each library is used and which one the house shape (the libraries by job in the design report or the single hunter's report) or the repo's instructions name.

Bad: Flagging `dayjs` without listing where `dayjs` and `date-fns` are used or which one the repo standardises on.
Good: Citing the 2 files importing `moment` alongside 18 files using `dayjs` (named in the house shape) and replacing those 2 calls with `dayjs`.
