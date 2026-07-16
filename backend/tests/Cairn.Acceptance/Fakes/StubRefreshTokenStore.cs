using Cairn.Application.Abstractions;
using Cairn.Domain;

namespace Cairn.Acceptance.Fakes;

public class StubRefreshTokenStore : IRefreshTokenStore
{
    public Task<IssuedRefreshToken> IssueAsync(Guid userId, Guid? familyId, CancellationToken cancellationToken) =>
        Task.FromResult(new IssuedRefreshToken("raw-refresh-token", new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FamilyId = familyId ?? Guid.NewGuid()
        }));

    public Task<RefreshToken?> ConsumeAsync(string rawToken, CancellationToken cancellationToken) =>
        Task.FromResult<RefreshToken?>(null);

    public Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task RevokeByPresentedTokenAsync(string rawToken, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
