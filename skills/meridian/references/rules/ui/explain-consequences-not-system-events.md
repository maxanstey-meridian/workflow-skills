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
