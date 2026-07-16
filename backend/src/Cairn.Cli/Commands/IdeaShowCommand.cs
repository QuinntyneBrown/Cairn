using System.CommandLine;
using Cairn.Application.Comments;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;
using Cairn.Domain;

namespace Cairn.Cli.Commands;

public static class IdeaShowCommand
{
    public static Command Create(IServiceProvider services)
    {
        var idArgument = new Argument<Guid>("id") { Description = "The idea's id" };

        var command = new Command("show", "Show one idea in full");
        command.Add(idArgument);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            var id = parseResult.GetValue(idArgument);

            var idea = await scope.Mediator.Send(new GetIdeaByIdQuery(id), cancellationToken);

            scope.Console.Heading(idea.Title);
            scope.Console.Line(idea.Description);
            scope.Console.Line();
            scope.Console.Table([
                ["Status", idea.Status.ToString()],
                ["Response type", idea.ResponseType.ToString()],
                ["Opens", idea.OpensAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm")],
                ["Closes", idea.ClosesAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm")]
            ]);

            if (idea.ResponseType == ResponseType.Options)
            {
                scope.Console.Line();
                scope.Console.Line("Choices:");
                idea.Options.ToList().ForEach(o => scope.Console.Line($"  {o.SortOrder + 1}. {o.Label}"));
            }

            var comments = await scope.Mediator.Send(new ListCommentsQuery(id), cancellationToken);
            if (comments.Count > 0)
            {
                scope.Console.Line();
                scope.Console.Line($"Comments ({comments.Count}):");
                foreach (var comment in comments)
                {
                    scope.Console.Line($"  {comment.AuthorName}: {comment.Body}");
                }
            }

            return 0;
        });

        return command;
    }
}
