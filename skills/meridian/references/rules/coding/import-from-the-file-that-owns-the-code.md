## Import from the file that owns the code

**Default:** Import from the file that defines a thing; do not add barrel or re-export files, and delete the old file when code moves.

**When:** Any TypeScript code. Allowed entry points: a frontend feature's `app/features/<feature>/index.ts`, a workspace package's entry files named in `package.json` `exports`, and generated barrels.

Bad: `export { getInitials } from "~/features/auth/logic/auth"` left at the old page-local path after a move.
Good: The old file deleted and consumers importing the new location.
