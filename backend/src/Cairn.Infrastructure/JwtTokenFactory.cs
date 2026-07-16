using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Cairn.Infrastructure;

/// <summary>
/// Shared signing mechanics for both token issuers. Both kinds of token are signed with the
/// same key, issuer and audience so that one AddJwtBearer registration validates both — the
/// scope claim, not a separate scheme, is what distinguishes them.
/// </summary>
internal static class JwtTokenFactory
{
    public static string Write(
        JwtOptions options,
        IEnumerable<Claim> claims,
        DateTimeOffset issuedAt,
        DateTimeOffset expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
