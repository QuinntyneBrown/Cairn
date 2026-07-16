using System.CommandLine;
using System.Text.Json;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;

namespace Cairn.Cli.Commands;

public static class IdeaListCommand
{
    public static Command Create(IServiceProvider services)
    {
        var statusOption = new Option<IdeaStatus?>("--status", "-s")
        {
            Description = "Draft | Open | Closed. Omit for all."
        };

        var jsonOption = new Option<bool>("--json") { Description = "Emit JSON instead of a table" };

        var command = new Command("list", "List ideas");
        command.Add(statusOption);
        command.Add(jsonOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var ideas = await scope.Mediator.Send(
                new ListIdeasQuery(parseResult.GetValue(statusOption)),
                cancellationToken);

            if (parseResult.GetValue(jsonOption))
            {
                scope.Console.Line(JsonSerializer.Serialize(ideas, CliJson.Options));
                return 0;
            }

            if (ideas.Count == 0)
            {
                scope.Console.Warn("No ideas yet. Try 'cairn idea create' or 'cairn db seed'.");
                return 0;
            }

            scope.Console.Heading($"{ideas.Count} idea(s)");
            var rows = new List<string[]> { new[] { "ID", "STATUS", "TYPE", "VOTES", "TITLE", "CLOSES" } };
            rows.AddRange(ideas.Select(i => new[]
            {
                i.Id.ToString(),
                i.Status.ToString(),
                i.ResponseType.ToString(),
                $"{i.VoteCount}/{i.InvitedCount}",
                Truncate(i.Title, 44),
                i.ClosesAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm")
            }));

            scope.Console.Table(rows);
            return 0;
        });

        return command;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";
}
