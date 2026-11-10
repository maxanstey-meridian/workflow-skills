## Make the final summary match what will happen

**Default:** The final review or summary states exactly what will happen when the user confirms.

**When:** Any flow that ends in a review, summary, or confirm step.

Bad: A summary "Files will be saved to Documents" when the folder rule sends them to a subfolder.
Good: A summary built from the same configuration that runs, so it names the subfolder.
