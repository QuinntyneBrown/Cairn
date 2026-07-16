using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Auth;

public class RefreshTokenCommandHandler(
    IAppDbContext db,
    IJwtTokenIssuer tokens,
    IRefreshTokenStore refreshTokens) : IRequestHandler<RefreshTokenCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        // Consume handles the reuse case: presenting an already-consumed token revokes the
        // whole family, because reuse means it leaked.
        var consumed = await refreshTokens.ConsumeAsync(request.RefreshToken, cancellationToken)
            ?? throw new InvalidCredentialsException();

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == consumed.UserId, cancellationToken)
            ?? throw new InvalidCredentialsException();

        var accessToken = tokens.Issue(user);
        var rotated = await refreshTokens.IssueAsync(user.Id, consumed.FamilyId, cancellationToken);

        return new AuthResult(
            accessToken, rotated.RawToken, user.Id, user.Email, user.DisplayName, user.Role);
    }
}
