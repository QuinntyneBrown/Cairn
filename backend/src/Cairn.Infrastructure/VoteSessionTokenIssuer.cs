using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.Extensions.Options;

namespace Cairn.Infrastructure;

public class VoteSessionTokenIssuer(IOptions<JwtOptions> options, IClock clock) : IVoteSessionTokenIssuer
{
    private readonly JwtOptions _options = options.Value;

    public IssuedVoteSessionToken Issue(User lead, Guid ideaId, DateTimeOffset expiresAt)
    {
        var now = clock.UtcNow;
        var ceiling = now.AddMinutes(_options.VoteSessionMaxMinutes);
        var effectiveExpiry = expiresAt < ceiling ? expiresAt : ceiling;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, lead.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),

            // scope=vote, never scope=user. The default authorization policy demands
            // scope=user, so this token cannot satisfy a bare [Authorize] — which matters
            // because Sub below is a real user id.
            new(AuthScopes.ClaimType, AuthScopes.Vote),

            // Confines the token to one idea. Handlers compare this against the idea they are
            // acting on; without that check a link holder could act on any idea.
            new(AuthScopes.IdeaClaimType, ideaId.ToString())
        };

        var accessToken = JwtTokenFactory.Write(_options, claims, now, effectiveExpiry);
        return new IssuedVoteSessionToken(accessToken, effectiveExpiry);
    }
}
