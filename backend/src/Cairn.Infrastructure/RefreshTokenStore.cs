using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Infrastructure;

public class RefreshTokenStore(IAppDbContext db, IClock clock) : IRefreshTokenStore
{
    private static readonly TimeSpan DefaultLifetime = TimeSpan.FromDays(14);

    public async Task<IssuedRefreshToken> IssueAsync(
        Guid userId,
        Guid? familyId,
        CancellationToken cancellationToken)
    {
        var rawToken = SecureToken.Generate();
        var now = clock.UtcNow;

        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = SecureToken.Hash(rawToken),
            FamilyId = familyId ?? Guid.NewGuid(),
            IssuedAt = now,
            ExpiresAt = now.Add(DefaultLifetime)
        };

        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync(cancellationToken);

        return new IssuedRefreshToken(rawToken, token);
    }

    public async Task<RefreshToken?> ConsumeAsync(string rawToken, CancellationToken cancellationToken)
    {
        var hash = SecureToken.Hash(rawToken);
        var now = clock.UtcNow;

        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (token is null || token.RevokedAt.HasValue || token.ExpiresAt <= now)
        {
            return null;
        }

        if (token.ConsumedAt.HasValue)
        {
            // A consumed token being presented again means it leaked: the legitimate holder
            // already rotated it. Revoke the whole chain rather than just this one.
            await RevokeFamilyAsync(token.FamilyId, cancellationToken);
            return null;
        }

        token.ConsumedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return token;
    }

    public async Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), cancellationToken);
    }

    public async Task RevokeByPresentedTokenAsync(string rawToken, CancellationToken cancellationToken)
    {
        var hash = SecureToken.Hash(rawToken);

        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (token is not null)
        {
            await RevokeFamilyAsync(token.FamilyId, cancellationToken);
        }
    }
}
