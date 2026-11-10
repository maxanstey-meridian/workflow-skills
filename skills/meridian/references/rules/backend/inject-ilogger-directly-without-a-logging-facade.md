## Inject ILogger directly without a logging facade

**Default:** Inject `ILogger<T>` directly; do not write a custom logging facade.

**When:** C# Application and Infrastructure code; Domain does not log.

Bad: `IAppLogger` wrapping `ILogger` with the same three methods.
Good: `ILogger<CreateFormUseCase>` in the constructor.
