namespace Cairn.Application.VoteLinks;

/// <summary>
/// <paramref name="Url"/> is populated only in the response to creating or regenerating a
/// link — that is the one moment the raw token exists. Listing links returns it as null,
/// because only the hash is stored and the original cannot be recovered.
/// </summary>
public record VoteLinkDto(
    Guid Id,
    Guid IdeaId,
    Guid UserId,
    string DisplayName,
    string Email,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt,
    bool IsRevoked,
    bool HasVoted,
    string? Url);
