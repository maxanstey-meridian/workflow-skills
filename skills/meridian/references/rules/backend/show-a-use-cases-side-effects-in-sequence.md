## Show a use case's side effects in sequence

**Default:** A use case (the Application code for one operation) makes its side effects visible as calls in the order they happen.

**When:** Use cases on .NET or TypeScript.

Bad: a save that fires an email from a hidden entity event handler.
Good: `await forms.Save(form); await mailer.Send(notice);` in the use case.
