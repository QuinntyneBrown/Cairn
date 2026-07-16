using Cairn.Application.Abstractions;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Auth;

public class RegisterCommandHandler(
    IAppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenIssuer tokens,
    IRefreshTokenStore refreshTokens,
    IClock clock) : IRequestHandler<RegisterCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existing = await db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (existing is not null)
        {
            // A lead may already exist as a passwordless row. Registering with that address
            // claims the account and keeps their id, so votes they already cast still belong
            // to them. Anything with a password set is a genuine duplicate.
            if (!string.IsNullOrEmpty(existing.PasswordHash))
            {
                throw new EmailAlreadyRegisteredException();
            }

            existing.PasswordHash = hasher.Hash(request.Password);
            existing.DisplayName = request.DisplayName.Trim();
            await db.SaveChangesAsync(cancellationToken);

            return await IssueAsync(existing, cancellationToken);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = hasher.Hash(request.Password),
            Role = Roles.Lead,
            CreatedAt = clock.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return await IssueAsync(user, cancellationToken);
    }

    private async Task<AuthResult> IssueAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = tokens.Issue(user);
        var refresh = await refreshTokens.IssueAsync(user.Id, familyId: null, cancellationToken);
        return new AuthResult(
            accessToken, refresh.RawToken, user.Id, user.Email, user.DisplayName, user.Role);
    }
}
