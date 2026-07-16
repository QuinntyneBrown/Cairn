using System.CommandLine;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;

namespace Cairn.Cli.Commands;

public static class IdeaReopenCommand
{
    public static Command Create(IServiceProvider services)
    {
        var idArgument = new Argument<Guid>("id") { Description = "The idea's id" };

        var closesAtOption = new Option<DateTimeOffset>("--closes-at")
        {
            Description = "The new close time (default: 7 days from now)",
            DefaultValueFactory = _ => DateTimeOffset.Now.AddDays(7)
        };

        var command = new Command("reopen", "Reopen a closed idea by pushing its close time out");
        command.Add(idArgument);
        command.Add(closesAtOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            var id = parseResult.GetValue(idArgument);
            var idea = await scope.Mediator.Send(new GetIdeaByIdQuery(id), cancellationToken);

            // The update handler clears ClosedAnnouncedAt when the close moves forward, so the
            // next closure gets announced rather than being suppressed by the old stamp.
            await scope.Mediator.Send(
                new UpdateIdeaCommand(
                    idea.Id,
                    idea.Title,
                    idea.Description,
                    idea.ResponseType,
                    idea.OpensAt,
                    parseResult.GetValue(closesAtOption),
                    idea.Options.Select(o => o.Label).ToList()),
                cancellationToken);

            var reopened = await scope.Mediator.Send(new GetIdeaByIdQuery(id), cancellationToken);
            scope.Console.Success(
                $"'{reopened.Title}' is now {reopened.Status}, closing {reopened.ClosesAt.ToLocalTime():yyyy-MM-dd HH:mm}.");
            return 0;
        });

        return command;
    }
}
