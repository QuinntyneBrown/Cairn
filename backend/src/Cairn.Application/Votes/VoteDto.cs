using Cairn.Domain;

namespace Cairn.Application.Votes;

/// <summary>
/// Mirrors the storage shape: exactly one value is non-null, selected by ResponseType. The
/// nullable-trio shape means no custom JSON converter and no discriminator to keep in sync —
/// the existing JsonStringEnumConverter is enough.
/// </summary>
public record VoteDto(
    Guid IdeaId,
    ResponseType ResponseType,
    bool? YesNo,
    Guid? SelectedOptionId,
    int? Scale,
    DateTimeOffset UpdatedAt);
