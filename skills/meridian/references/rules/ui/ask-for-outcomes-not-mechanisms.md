## Ask For Outcomes, Not Mechanisms

Controls should ask questions the user can answer from their domain knowledge.

Bad:

- Literal
- Input
- String template
- Collision policy
- Dynamic path expression

Good:

- Save every file in the same folder
- Choose the folder using form data
- Keep the uploaded filename
- Rename the file
- Do not overwrite an existing file

Technical variants are often multiple implementations of one user intention.
Collapse them behind that intention.

For example, these are implementation mechanisms:

- fixed value
- value from one field
- template containing multiple fields

They can usually become one user action:

> Specify a value using text and form fields.

The revealed editor can support plain text, one inserted field, or several
fields without requiring the user to classify their configuration first.
