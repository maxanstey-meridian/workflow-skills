## Put transport contracts in top-level Contracts

**Tooling:** A transport contract (a `[RivetContract]` class of route definitions) and the request and response records its routes carry live in the top-level `Contracts/<Feature>/` folder, never inside `Modules/`.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response; write the contract first. A module's published contract (the types it deliberately exposes to other modules) is a different thing and does live in `Modules/<Feature>/Contracts/`.

Bad: `Modules/Transcriptions/TranscriptionsContract.cs`
Good:
```text
Contracts/
└── Transcriptions/
    ├── TranscriptionsContract.cs   # [RivetContract]: route constants + Define.* fields
    └── TranscriptionsModels.cs     # the request/response records those routes carry
```

Links: [Rivet README](https://github.com/maxanstey-meridian/rivet#readme), [contracts guide](https://maxanstey-meridian.github.io/rivet/guides/contracts)
