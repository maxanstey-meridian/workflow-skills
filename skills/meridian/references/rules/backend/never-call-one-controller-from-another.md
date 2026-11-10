## Never call one controller from another

**Law:** A controller or endpoint never calls, injects, inherits from, or stores another controller; share the Application capability underneath.

**When:** Transport code on .NET or TypeScript.

Bad: `ReportsController` taking `FormsController` in its constructor.
Good: both controllers calling `ListFormsQuery`.
