namespace Cairn.Application.Abstractions;

public interface ICurrentUser
{
    Guid? UserId { get; }

    bool IsAuthenticated { get; }

    string? Role { get; }

    /// <summary>"user" for a signed-in session, "vote" for a magic-link session.</summary>
    string? Scope { get; }

    /// <summary>
    /// The single idea a vote-link session is confined to; null for user sessions. Handlers
    /// must check this against the idea they are acting on — the token's subject is a real
    /// user id, so without this check a link holder could act on any idea.
    /// </summary>
    Guid? VoteLinkIdeaId { get; }
}
