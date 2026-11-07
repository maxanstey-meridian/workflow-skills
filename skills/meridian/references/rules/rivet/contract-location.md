## Contract Location

Contracts live in a top-level `Contracts/{Module}/` folder with their DTOs
alongside — never inside `Modules/`.

- the contract owns route constants: `public const string CreateRoute = "/api/transcriptions";`
- minimal APIs reference them via `Contract.X.Route` (`--check` resolves it from 0.48.0, `MapGroup` prefixes included); controllers use the contract's `const string` route in attributes (a runtime `.Route` property is not an attribute constant)
- never a literal route string in `Map*(...)` or `[Http*(...)]` — routes come from the contract
- bootstrap endpoints (`Program.cs` health, root) are the one exception

```text
Contracts/
└── Transcriptions/
    ├── TranscriptionsContract.cs   # [RivetContract]: route constants + Define.* fields
    └── TranscriptionsModels.cs     # the request/response records those routes carry
```
