namespace Cowork.Api.Common;

/// <summary>
/// The one error envelope for every declared failure. Shared by all transport
/// contracts; the frontend matches on <see cref="Code"/>.
/// </summary>
public sealed record ErrorResponse(
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null
);
