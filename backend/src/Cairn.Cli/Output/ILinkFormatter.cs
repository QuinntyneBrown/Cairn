using Cairn.Application.VoteLinks;

namespace Cairn.Cli.Output;

public interface ILinkFormatter
{
    void Write(IConsoleWriter console, string ideaTitle, IReadOnlyList<VoteLinkDto> links);
}
