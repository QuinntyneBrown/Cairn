using Cairn.Domain;

namespace Cairn.Application.Abstractions;

public interface IRefreshTokenStore
{
    Task<IssuedRefreshToken> IssueAsync(Guid userId, Guid? familyId, CancellationToken cancellationToken);

    /// <summary>
    /// Marks a token consumed and returns it, or null when it is unknown, expired, revoked,
    /// or already consumed. Reuse of a consumed token revokes its whole family.
    /// </summary>
    Task<RefreshToken?> ConsumeAsync(string rawToken, CancellationToken cancellationToken);

    Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken);

    Task RevokeByPresentedTokenAsync(string rawToken, CancellationToken cancellationToken);
}
