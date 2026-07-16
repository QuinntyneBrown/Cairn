using System.CommandLine;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;

namespace Cairn.Cli.Commands;

public static class IdeaDeleteCommand
{
    public static Command Create(IServiceProvider services)
    {
        var idArgument = new Argument<Guid>("id") { Description = "The idea's id" };
        var forceOption = new Option<bool>("--force") { Description = "Delete even if votes exist" };

        var command = new Command("delete", "Delete an idea, its votes, comments and links");
        command.Add(idArgument);
        command.Add(forceOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            var id = parseResult.GetValue(idArgument);
            var idea = await scope.Mediator.Send(new GetIdeaByIdQuery(id), cancellationToken);

            var results = await scope.Mediator.Send(
                new Application.Votes.GetIdeaResultsQuery(id), cancellationToken);

            if (results.TotalVotes > 0 && !parseResult.GetValue(forceOption))
            {
                scope.Console.Error(
                    $"'{idea.Title}' already has {results.TotalVotes} vote(s), which would be destroyed. "
                    + "Pass --force if that is what you want.");
                return 1;
            }

            await scope.Mediator.Send(new DeleteIdeaCommand(id), cancellationToken);
            scope.Console.Success($"Deleted '{idea.Title}'.");
            return 0;
        });

        return command;
    }
}
