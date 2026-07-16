using System.CommandLine;
using Cairn.Application.Ideas;
using Cairn.Application.VoteLinks;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Cli.Commands;

/// <summary>
/// The primary distribution mechanism, since links are copied by hand rather than emailed.
/// </summary>
public static class LinksGenerateCommand
{
    public static Command Create(IServiceProvider services)
    {
        var ideaOption = new Option<Guid>("--idea", "-i")
        {
            Description = "The idea to mint links for",
            Required = true
        };

        var leadOption = new Option<Guid?>("--lead", "-l")
        {
            Description = "One lead only. Prints the bare URL, so it pipes into clip."
        };

        var formatOption = new Option<string>("--format", "-f")
        {
            Description = "text | csv | md",
            DefaultValueFactory = _ => "text"
        };
        formatOption.AcceptOnlyFromAmong("text", "csv", "md");

        var command = new Command("generate", "Mint a voting link for each lead");
        command.Add(ideaOption);
        command.Add(leadOption);
        command.Add(formatOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var ideaId = parseResult.GetValue(ideaOption);
            var leadId = parseResult.GetValue(leadOption);
            var idea = await scope.Mediator.Send(new GetIdeaByIdQuery(ideaId), cancellationToken);

            // Regenerating rotates each link's hash in place, so any previously shared URL
            // for that lead stops working the moment this runs.
            var links = await scope.Mediator.Send(
                new CreateVoteLinksCommand(ideaId, leadId.HasValue ? [leadId.Value] : []),
                cancellationToken);

            if (links.Count == 0)
            {
                scope.Console.Error("No matching leads. Check 'cairn lead list'.");
                return 1;
            }

            // A single lead prints nothing but the URL, so `... --lead <id> | clip` works.
            // That composes with the shell better than a --copy flag ever could.
            if (leadId.HasValue)
            {
                scope.Console.Line(links[0].Url!);
                return 0;
            }

            var formatter = scope.Resolve<IServiceProvider>()
                .GetRequiredKeyedService<ILinkFormatter>(parseResult.GetValue(formatOption));

            formatter.Write(scope.Console, idea.Title, links);
            return 0;
        });

        return command;
    }
}
