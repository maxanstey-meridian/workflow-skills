## Judge test code by the testing rules only

**Default:** Test code may import whatever it needs and is judged by the testing rules (double names, mock density, location), not by the production rules on layer purity, module shape, or .NET style.

**When:** Reviewing test source on any stack. The ban on type assertions still covers TypeScript test code.

Bad: a review finding "test class is not `sealed`" or "test imports Infrastructure".
Good: no finding.
