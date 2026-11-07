## Risk and Test Shape

Do not pursue one universal test pyramid or direct branch coverage quota. Match
the test to the failure risk:

- pure decision errors → focused unit tests
- application orchestration errors → behavior tests through ports
- persistence/protocol errors → real adapter integration tests
- wiring errors → host/page composition tests
- critical user journeys → a small number of end-to-end tests
