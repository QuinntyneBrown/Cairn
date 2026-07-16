using Cairn.Application.VoteLinks;

namespace Cairn.Cli.Output;

/// <summary>For a mail merge. Nothing but CSV goes to stdout so it can be redirected.</summary>
public class CsvLinkFormatter : ILinkFormatter
{
    public void Write(IConsoleWriter console, string ideaTitle, IReadOnlyList<VoteLinkDto> links)
    {
        console.Line("name,email,url,expires_at");

        foreach (var link in links)
        {
            console.Line(string.Join(',', [
                Quote(link.DisplayName),
                Quote(link.Email),
                Quote(link.Url ?? string.Empty),
                Quote(link.ExpiresAt.ToString("O"))
            ]));
        }
    }

    private static string Quote(string value) => $"\"{value.Replace("\"", "\"\"")}\"";
}
