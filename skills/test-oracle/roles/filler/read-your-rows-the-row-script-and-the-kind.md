## Read your rows, the row script, and the kind

**Default:** Know what your pass asks: read each row of your slice in the table — the fields it holds as `null` are your pass's fields, and the fields that hold a value are the script's own — read the row script (the program named by the `rows` command in `oracle.conf.json` in the case folder) for what the rows are read from, and read the kind reference, if there is one.

**When:** Before you fill a single field.

Bad: Filling a field from the row's text alone, with the row script unread, so a field the script reads from a config file is filled from a guess.
Good: The same field filled after the row script is read, from the config file it reads, cited.
