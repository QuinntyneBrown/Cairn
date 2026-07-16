using Cairn.Application.Abstractions;
using Microsoft.Extensions.Options;

namespace Cairn.Infrastructure;

public class VoteLinkUrlBuilder(IOptions<VoteLinkOptions> options) : IVoteLinkUrlBuilder
{
    public string Build(string rawToken) =>
        $"{options.Value.BaseUrl.TrimEnd('/')}/vote/{rawToken}";
}
