## Put transport contracts in top-level Contracts

**Tooling:** Put `[RivetContract]` classes and their request/response records in top-level `Contracts/<Feature>/`, never inside `Modules/`.

**When:** .NET Rivet APIs (write the contract first). Module published contracts for cross-module use are separate and stay in `Modules/<Feature>/Contracts/`.

Bad: `Modules/Transcriptions/TranscriptionsContract.cs`
Good:
```text
Contracts/
└── Transcriptions/
    ├── TranscriptionsContract.cs   # [RivetContract]: route constants + Define.* fields
    └── TranscriptionsModels.cs     # request/response records
```

Links: [Rivet README](https://github.com/maxanstey-meridian/rivet#readme), [contracts guide](https://maxanstey-meridian.github.io/rivet/guides/contracts)
