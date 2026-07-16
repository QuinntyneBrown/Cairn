using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Auth;

public class SignInCommandHandler(
    IAppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenIssuer tokens,
    IRefreshTokenStore refreshTokens,
    ISignInThrottle throttle) : IRequestHandler<SignInCommand, AuthResult>
{
    public async Task<AuthResult> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var decision = await throttle.CheckAsync(normalizedEmail, cancellationToken);
        if (decision.IsLocked)
        {
            throw new SignInLockedException(decision.RetryAfter);
        }

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        // Leads exist without a password and vote only through a magic link. Their hash is
        // empty, and BCrypt throws on an empty hash rather than returning false — which would
        // surface as a 500 and, worse, confirm the account exists. Check before verifying.
        var hasPassword = user is not null && !string.IsNullOrEmpty(user.PasswordHash);

        if (!hasPassword || !hasher.Verify(request.Password, user!.PasswordHash))
        {
            await throttle.RecordAttemptAsync(normalizedEmail, success: false, cancellationToken);
            throw new InvalidCredentialsException();
        }

        await throttle.RecordAttemptAsync(normalizedEmail, success: true, cancellationToken);

        var accessToken = tokens.Issue(user);
        var refresh = await refreshTokens.IssueAsync(user.Id, familyId: null, cancellationToken);

        return new AuthResult(
            accessToken,
            refresh.RawToken,
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role);
    }
}
