using Cairn.Application.VoteLinks;

namespace Cairn.Cli.Output;

/// <summary>For pasting into Slack or Notion.</summary>
public class MarkdownLinkFormatter : ILinkFormatter
{
    public void Write(IConsoleWriter console, string ideaTitle, IReadOnlyList<VoteLinkDto> links)
    {
        console.Line($"**{ideaTitle}**");
        console.Line();

        foreach (var link in links)
        {
            console.Line($"- [{link.DisplayName}]({link.Url})");
        }
    }
}
