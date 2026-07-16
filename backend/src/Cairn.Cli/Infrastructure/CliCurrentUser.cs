using Cairn.Application.Abstractions;
using Cairn.Domain;

namespace Cairn.Cli.Infrastructure;

/// <summary>
/// The CLI's identity. There is no HTTP request and no token here — reaching the connection
/// string IS the authorisation, which is the right trust model for a tool run by whoever owns
/// the database.
///
/// Scope is always "user": the CLI is never a magic-link session, so the idea-confinement
/// checks in the handlers simply do not apply to it.
/// </summary>
public class CliCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }

    public bool IsAuthenticated => UserId.HasValue;

    public string? Role { get; set; } = Roles.Admin;

    public string? Scope => AuthScopes.User;

    public Guid? VoteLinkIdeaId => null;
}
