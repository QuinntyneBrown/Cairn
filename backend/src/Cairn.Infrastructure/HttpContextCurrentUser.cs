using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Cairn.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace Cairn.Infrastructure;

public class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(FindFirst(JwtRegisteredClaimNames.Sub, ClaimTypes.NameIdentifier), out var id)
            ? id
            : null;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public string? Role => FindFirst(ClaimTypes.Role, "role");

    public string? Scope => FindFirst(AuthScopes.ClaimType);

    public Guid? VoteLinkIdeaId =>
        Guid.TryParse(FindFirst(AuthScopes.IdeaClaimType), out var id) ? id : null;

    /// <summary>
    /// JwtSecurityTokenHandler remaps some registered claim names to the longer
    /// ClaimTypes.* URIs, so a claim can arrive under either name depending on whether
    /// mapping is disabled. Check every candidate rather than assuming one.
    /// </summary>
    private string? FindFirst(params string[] claimTypes) =>
        claimTypes.Select(t => Principal?.FindFirst(t)?.Value).FirstOrDefault(v => v is not null);
}
