# Outcome-Oriented UI

## Purpose

Use this when designing or reviewing pages, forms, setup flows, configuration
screens, and low-code interfaces.

The objective is not merely to make backend capability accessible. The UI must
translate that capability into a clear sequence of decisions expressed in the
user's language.

This is especially important for public-sector and low-code products. Users may
configure something only once, but infrequent tasks require more explanation,
not less. They cannot be expected to remember the product's internal model.

## Core Law

**The API is not the information architecture.**

UI structure, terminology, grouping, and ordering follow the user's journey and
desired outcomes. They do not follow:

- API call order
- DTO or database field order
- configuration object shape
- provider implementation boundaries
- technical mechanism variants
- the order in which the backend happens to validate or persist data

Backend structure may constrain what is possible. It does not determine how the
product explains it.

## Start With The User's Job

Before designing controls, state:

1. Who is doing this?
2. What outcome are they trying to achieve?
3. What decisions must they make?
4. Which decisions depend on earlier decisions?
5. What does the user need to see to trust the result?

Turn those answers into the page structure.

A setup flow should read as a coherent journey when its headings alone are read
from top to bottom.

Good:

1. Name this export
2. Choose where it should send files
3. Choose which data forms will provide
4. Decide where and how files should be saved
5. Review the resulting destination

Bad:

1. Create contract
2. Select handler
3. Resolve resource
4. Configure expressions
5. Set collision policy

The bad sequence describes the implementation. The good sequence describes the
user's task.

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

## Order By The User Journey

Order decisions according to how users reason about the task:

1. Establish context.
2. Make the primary choice.
3. Configure only what that choice requires.
4. Handle exceptional behaviour.
5. Review the result.
6. Confirm or save.

Do not make users answer downstream questions before they have enough context.

Keep dependent controls adjacent to the choice that reveals them. Do not split
one conceptual decision across separate cards merely because separate
operations or models implement it.

A useful test is:

> Would the user describe these as separate decisions?

If not, they should not appear as separate steps.

## Prefer Progressive Disclosure

The common path should be immediately understandable. Advanced capability
should appear only when selected or needed.

Example:

```text
Where should files be saved?

(o) At the top of the document library
( ) In a folder
```

Selecting `In a folder` reveals a folder builder. The initial screen does not
need separate choices for fixed folders, data-derived folders, and templates.

Progressive disclosure is not hiding necessary information. It is presenting
information at the point where it becomes relevant.

Do not:

- show every technical mode simultaneously
- display empty advanced editors by default
- make uncommon complexity compete visually with the recommended path
- disable an unexplained control and expect the user to infer its prerequisite

## Make The Default Legible

A selected default must communicate its resulting behaviour.

Weak:

```text
(o) Library root
```

Better:

```text
(o) At the top of the Documents library
    Files will be saved directly in Documents.
```

Use recommended defaults where the product has a safe, common choice. Explain
why the default is suitable when the consequences are not obvious.

Defaults must be safe. A convenient default that silently overwrites data,
broadens access, or loses information is not a good default.

## Explain Consequences, Not System Events

Labels should express what will happen to the user's work.

Weak:

- Stop with an error
- Replace
- Fail
- Use literal

Better:

- Do not overwrite the existing file
- Replace the existing file
- Keep the uploaded filename
- Use the same folder every time

Supporting text should explain material consequences:

```text
Do not overwrite the existing file
The export will fail and the existing SharePoint file will remain unchanged.
```

Do not use help text to paraphrase the label. Use it to answer the next question
the user is likely to have.

## Show The Result

Configuration interfaces should make the resulting outcome visible whenever the
user would otherwise need to mentally execute the rules.

Examples:

- final file path
- generated filename
- recipient summary
- permission effect
- schedule
- filter result
- mapped data preview

For a file destination:

```text
Example destination

Documents / Applications / ABC-123 / evidence.pdf
```

The preview should update as configuration changes and use representative sample
values. Clearly distinguish an example or preview from a live operation.

A preview closes the gap between configuring rules and understanding their
effect.

## Use Domain Language

Prefer terminology users encounter in their work over terminology from the
implementation.

Use:

- form data
- uploaded file
- document library
- existing file
- service area
- case reference

Avoid unless the intended user genuinely uses them:

- payload
- expression
- handler
- literal
- interpolation
- configuration version
- resource identifier

Technical accuracy is necessary, but internal terminology is not inherently
more accurate for users.

When a precise technical term is unavoidable, introduce it through familiar
language rather than making the user decode it.

## Treat Disabled States As Explanations

A disabled control must have an evident reason and a clear route to enabling it.

Prefer:

- hiding an irrelevant control until its prerequisite is selected
- showing the prerequisite beside the disabled control
- explaining the required action in direct language

Weak:

> Add a compatible input in step 3.

Better:

> To choose a folder from form data, first add a Text field under Data to export.

Use step numbers only as secondary navigation aids. Describe the actual action
because numbering changes and users think in tasks, not indices.

## Group One Decision At A Time

A visual section should answer one user question.

Good section headings:

- Which file should be uploaded?
- Where should files be saved?
- How should files be named?
- What should happen if the file already exists?

Avoid grouping controls merely because their values occupy the same backend
object.

Related questions may share a card, but each question needs a clear label,
short explanation where necessary, and visible selected outcome.

## Review Method

When asked to "look at this UI", review it in this order:

1. State the user's job and intended outcome.
2. Read headings and labels as a journey.
3. Identify controls named after implementation mechanisms.
4. Identify sections ordered after API or data-model structure.
5. Merge mechanisms that express the same user intention.
6. Establish the safe common path and default.
7. Progressively disclose uncommon or advanced choices.
8. Rewrite labels around outcomes and consequences.
9. Add examples or previews where users otherwise simulate rules mentally.
10. Check prerequisites, disabled states, validation, and recovery instructions.
11. Check that the final review or summary matches what will actually happen.

Do not begin with visual polish. Correct the conceptual model and information
hierarchy first. Styling a mechanism-oriented interface does not make it
user-centred.

## Review Questions

- Can the intended user understand every choice without knowing the API?
- Are we asking for a user decision or exposing a technical representation?
- Does the order match how the task is performed and understood?
- Are conceptually identical decisions presented consistently?
- Can multiple technical modes become one progressive editor?
- Is the recommended path obvious?
- Are destructive, security-sensitive, or failure consequences explicit?
- Can the user see an example of the resulting outcome?
- Does help text explain something useful rather than restating the label?
- Could a user return six months later and understand the configuration?

If the answer to any of these is no, treat it as a product-design problem, not a
copy-editing problem.

## Testing Bias

Prefer tests that verify:

- journey prerequisites and ordering
- the common path
- progressive disclosure
- visible outcomes and previews
- material consequences
- validation and recovery guidance

Avoid tests coupled to accidental control topology or implementation
terminology. Test what the user can accomplish and understand.
