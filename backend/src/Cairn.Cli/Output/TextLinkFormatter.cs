using Cairn.Application.VoteLinks;

namespace Cairn.Cli.Output;

public class TextLinkFormatter : ILinkFormatter
{
    public void Write(IConsoleWriter console, string ideaTitle, IReadOnlyList<VoteLinkDto> links)
    {
        console.Heading(ideaTitle);

        if (links.Count == 0)
        {
            console.Warn("No leads matched, so no links were generated.");
            return;
        }

        console.Line($"Links expire {links[0].ExpiresAt.ToLocalTime():yyyy-MM-dd HH:mm}");
        console.Line();
        console.Table(links.Select(l => new[] { l.DisplayName, l.Url ?? "(regenerate to see)" }).ToList());
        console.Line();
        console.Success($"{links.Count} link(s) generated.");
    }
}
