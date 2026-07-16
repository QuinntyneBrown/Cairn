using Cairn.Domain;

namespace Cairn.Application.Abstractions;

public interface IJwtTokenIssuer
{
    /// <summary>Issues a full user session token, carrying scope=user.</summary>
    string Issue(User user);
}
