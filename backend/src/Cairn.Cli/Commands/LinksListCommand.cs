using System.CommandLine;
using Cairn.Application.VoteLinks;
using Cairn.Cli.Infrastructure;

namespace Cairn.Cli.Commands;

public static class LinksListCommand
{
    public static Command Create(IServiceProvider services)
    {
        var ideaOption = new Option<Guid>("--idea", "-i")
        {
            Description = "The idea whose links to list",
            Required = true
        };

        var command = new Command("list", "Show who has a link and who has voted");
        command.Add(ideaOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var links = await scope.Mediator.Send(
                new ListVoteLinksQuery(parseResult.GetValue(ideaOption)),
                cancellationToken);

            if (links.Count == 0)
            {
                scope.Console.Warn("No links yet. Run 'cairn links generate --idea <id>'.");
                return 0;
            }

            scope.Console.Heading($"{links.Count} link(s)");
            var rows = new List<string[]> { new[] { "NAME", "EMAIL", "VOTED", "STATUS" } };
            rows.AddRange(links.Select(l => new[]
            {
                l.DisplayName,
                l.Email,
                l.HasVoted ? "yes" : "-",
                l.IsRevoked ? "revoked" : "active"
            }));

            scope.Console.Table(rows);
            scope.Console.Line();

            // Only the hash is stored, so a URL cannot be shown after the fact.
            scope.Console.Line("URLs are not recoverable — only their hashes are stored. Regenerate to get fresh ones.");
            return 0;
        });

        return command;
    }
}
