using Cairn.Domain;

namespace Cairn.Application.Abstractions;

/// <summary>
/// Mints the short-lived token an anonymous magic-link visitor uses for both the API and the
/// SignalR hub. Deliberately separate from <see cref="IJwtTokenIssuer"/>: these tokens carry
/// scope=vote and are confined to a single idea.
/// </summary>
public interface IVoteSessionTokenIssuer
{
    IssuedVoteSessionToken Issue(User lead, Guid ideaId, DateTimeOffset expiresAt);
}
