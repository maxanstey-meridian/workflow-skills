## Results vs exceptions

Declared failures are results;
undeclared failures are exceptions. If the contract declares the failure
(`.Returns<ErrorResponse>(4xx)`), the use case returns it as a value and the
endpoint maps it — declared failures are control flow the caller must handle,
and values make that visible. Exceptions are reserved for "this should never
happen" and are translated once by the error middleware. Do not throw for
outcomes the API contract promises; do not return result objects for genuine
programmer errors.

FluentResults (`Result` / `Result<T>`) is the default Application result carrier
when a use case has a small open set of ordinary failures. It is not Domain
furniture. Domain decisions with a closed set of meaningful outcomes should
return domain-specific result records or sealed outcome types so callers can
handle them explicitly. Do not hand-roll a generic Result library per repo.

A decider's refusal (`invariants/invariant-enforcement.md`, `invariants/deciders.md`)
is such a closed domain outcome. Each decider has one mapping from refusal to
declared failure, which owns the error codes and wording, and every use case goes
through it. Do not construct the failure for a refusal at the call site.

Authorization follows the same split. The endpoint applies the authentication
requirement and the named authorization policy unconditionally (`[Authorize]`,
`.RequireAuthorization()`, or a fallback policy); a decision that needs the
resource or its state is made in the use case, never in a controller.
