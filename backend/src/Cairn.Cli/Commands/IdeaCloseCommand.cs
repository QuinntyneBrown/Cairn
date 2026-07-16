using System.CommandLine;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;

namespace Cairn.Cli.Commands;

/// <summary>
/// Closing is not a state transition — there is no status column to flip. It moves the close
/// time to now, and every read derives "closed" from the clock. The API's hosted service
/// notices within 30 seconds and tells connected clients.
/// </summary>
public static class IdeaCloseCommand
{
    public static Command Create(IServiceProvider services)
    {
        var idArgument = new Argument<Guid>("id") { Description = "The idea's id" };

        var command = new Command("close", "Close voting now by moving the close time to this moment");
        command.Add(idArgument);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            var id = parseResult.GetValue(idArgument);

            var idea = await scope.Mediator.Send(new GetIdeaByIdQuery(id), cancellationToken);

            if (idea.Status == IdeaStatus.Closed)
            {
                scope.Console.Warn("That idea has already closed.");
                return 0;
            }

            var now = scope.Clock.UtcNow;

            await scope.Mediator.Send(
                new UpdateIdeaCommand(
                    idea.Id,
                    idea.Title,
                    idea.Description,
                    idea.ResponseType,
                    // A Draft idea has not opened yet; pull its open time back so the window
                    // stays valid and the idea lands closed rather than rejected.
                    idea.OpensAt < now ? idea.OpensAt : now.AddSeconds(-1),
                    now,
                    idea.Options.Select(o => o.Label).ToList()),
                cancellationToken);

            scope.Console.Success($"Closed '{idea.Title}'.");
            scope.Console.Line("Connected clients are told within 30 seconds; late votes are already refused.");
            return 0;
        });

        return command;
    }
}
