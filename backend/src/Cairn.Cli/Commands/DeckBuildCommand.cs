using System.CommandLine;
using System.Diagnostics;
using Cairn.Application.Comments;
using Cairn.Application.Ideas;
using Cairn.Application.Votes;
using Cairn.Cli.Deck;
using Cairn.Cli.Infrastructure;

namespace Cairn.Cli.Commands;

public static class DeckBuildCommand
{
    public static Command Create(IServiceProvider services)
    {
        var ideaOption = new Option<Guid[]>("--idea", "-i")
        {
            Description = "An idea to include. Repeat for several. Defaults to every closed idea.",
            AllowMultipleArgumentsPerToken = true
        };

        var outputOption = new Option<string>("--output", "-o")
        {
            Description = "Where to write the .pptx",
            DefaultValueFactory = _ => "cairn-results.pptx"
        };

        var titleOption = new Option<string>("--title")
        {
            Description = "The title slide's headline",
            DefaultValueFactory = _ => "Where we landed"
        };

        var openOption = new Option<bool>("--open") { Description = "Open the deck when it is written" };

        var command = new Command("build", "Generate a .pptx of the results");
        command.Add(ideaOption);
        command.Add(outputOption);
        command.Add(titleOption);
        command.Add(openOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var requested = parseResult.GetValue(ideaOption) ?? [];
            var ideaIds = requested.Length > 0
                ? requested.ToList()
                : (await scope.Mediator.Send(new ListIdeasQuery(IdeaStatus.Closed), cancellationToken))
                    .Select(i => i.Id)
                    .ToList();

            if (ideaIds.Count == 0)
            {
                scope.Console.Error(
                    "No closed ideas to report on. Pass --idea <id> to include one that is still open.");
                return 1;
            }

            var deckIdeas = new List<DeckIdea>();
            foreach (var ideaId in ideaIds)
            {
                // The same projection the dashboard and 'results show' use. The builder never
                // touches the database or MediatR — it takes DTOs and draws them.
                var results = await scope.Mediator.Send(new GetIdeaResultsQuery(ideaId), cancellationToken);
                var comments = await scope.Mediator.Send(new ListCommentsQuery(ideaId), cancellationToken);
                deckIdeas.Add(new DeckIdea(results, comments));
            }

            var output = Path.GetFullPath(parseResult.GetValue(outputOption)!);
            scope.Resolve<IDeckBuilder>().Build(output, parseResult.GetValue(titleOption)!, deckIdeas);

            scope.Console.Success($"Wrote {deckIdeas.Count + 1} slide(s) to {output}");
            WarnIfHeadingFontMissing(scope);

            if (parseResult.GetValue(openOption))
            {
                Process.Start(new ProcessStartInfo(output) { UseShellExecute = true });
            }

            return 0;
        });

        return command;
    }

    /// <summary>
    /// The deck names Inter rather than embedding it — Noi Grotesk is commercial and its
    /// licence would not cover shipping it inside every generated file, and embedded fonts are
    /// Windows-PowerPoint-only anyway. Naming it means the deck renders correctly wherever
    /// Inter is installed, so say so when it is not.
    /// </summary>
    private static void WarnIfHeadingFontMissing(CliScope scope)
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        var installed = new[]
            {
                Environment.GetFolderPath(Environment.SpecialFolder.Fonts),
                Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Microsoft", "Windows", "Fonts")
            }
            .Where(Directory.Exists)
            .SelectMany(dir => Directory.EnumerateFiles(dir, "*.tt*"))
            .Any(f => Path.GetFileName(f).StartsWith("Inter", StringComparison.OrdinalIgnoreCase));

        if (!installed)
        {
            scope.Console.Warn(
                "Inter is not installed, so PowerPoint will substitute a fallback and the deck "
                + "will look off-brand. Install Inter (free, Google Fonts) for correct rendering.");
        }
    }
}
