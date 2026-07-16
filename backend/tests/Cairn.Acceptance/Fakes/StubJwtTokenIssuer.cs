using Cairn.Application.Abstractions;
using Cairn.Domain;

namespace Cairn.Acceptance.Fakes;

public class StubJwtTokenIssuer : IJwtTokenIssuer
{
    public string Issue(User user) => $"access-token-for-{user.Id}";
}
