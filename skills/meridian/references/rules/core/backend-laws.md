## Backend Laws

Each line is a summary; the file in brackets (a rule file, or a design document
and the heading in it) states it in full. These Laws apply together with the
cross-stack Laws in the Laws file beside this one.

- declared failures are results; undeclared failures are exceptions
  [`backend/results-vs-exceptions.md`]
- modules integrate through consumer-owned required ports, provider-owned
  published contracts, or a deliberately shared kernel; Domain never consumes
  a sibling's published contract [`backend/dependency-rules.md`]
- adapter integration tests run on the production database engine — EF
  InMemory is banned (a fake engine manufactures confidence); fake the port
  when the adapter is not under test [`tests/test-substrate.md`]
