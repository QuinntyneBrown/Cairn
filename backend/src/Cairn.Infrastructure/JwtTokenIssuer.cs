using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Cairn.Infrastructure;

public class JwtTokenIssuer(IOptions<JwtOptions> options, IClock clock) : IJwtTokenIssuer
{
    private readonly JwtOptions _options = options.Value;

    public string Issue(User user)
    {
        var now = clock.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, user.Role),

            // The claim that separates a real session from a magic link. The default
            // authorization policy requires this value, so a vote-link token cannot satisfy
            // a bare [Authorize].
            new(AuthScopes.ClaimType, AuthScopes.User)
        };

        return JwtTokenFactory.Write(_options, claims, now, now.AddMinutes(_options.AccessTokenMinutes));
    }
}
