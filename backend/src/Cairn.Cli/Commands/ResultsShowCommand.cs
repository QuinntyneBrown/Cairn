using System.CommandLine;
using Cairn.Application.Votes;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;
using Cairn.Domain;

namespace Cairn.Cli.Commands;

/// <summary>
/// Renders exactly the projection the deck renders, in a terminal. It exists so the
/// aggregation can be checked where feedback is instant, rather than by opening PowerPoint.
/// </summary>
public static class ResultsShowCommand
{
    private const int BarWidth = 32;

    public static Command Create(IServiceProvider services)
    {
        var ideaOption = new Option<Guid>("--idea", "-i")
        {
            Description = "The idea to report on",
            Required = true
        };

        var command = new Command("show", "Show an idea's results");
        command.Add(ideaOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var results = await scope.Mediator.Send(
                new GetIdeaResultsQuery(parseResult.GetValue(ideaOption)),
                cancellationToken);

            scope.Console.Heading(results.Title);
            scope.Console.Line($"{results.Status} · {results.TotalVotes} of {results.InvitedCount} invited voted"
                + $"{Participation(results)}");
            scope.Console.Line();

            switch (results.ResponseType)
            {
                case ResponseType.YesNo:
                    WriteYesNo(scope.Console, results);
                    break;
                case ResponseType.Options:
                    WriteOptions(scope.Console, results);
                    break;
                case ResponseType.Scale:
                    WriteScale(scope.Console, results);
                    break;
            }

            return 0;
        });

        return command;
    }

    private static string Participation(IdeaResultsDto r) =>
        r.InvitedCount == 0 ? "" : $" ({r.TotalVotes * 100 / r.InvitedCount}%)";

    private static void WriteYesNo(IConsoleWriter console, IdeaResultsDto r)
    {
        var yes = r.YesCount ?? 0;
        var no = r.NoCount ?? 0;
        var total = Math.Max(yes + no, 1);

        console.Line($"Yes  {Bar(yes, total)}  {yes}");
        console.Line($"No   {Bar(no, total)}  {no}");
    }

    private static void WriteOptions(IConsoleWriter console, IdeaResultsDto r)
    {
        var options = r.Options ?? [];
        var max = Math.Max(options.Count == 0 ? 1 : options.Max(o => o.Count), 1);
        var labelWidth = options.Count == 0 ? 1 : options.Max(o => o.Label.Length);

        foreach (var option in options)
        {
            console.Line($"{option.Label.PadRight(labelWidth)}  {Bar(option.Count, max)}  {option.Count}");
        }
    }

    private static void WriteScale(IConsoleWriter console, IdeaResultsDto r)
    {
        if (r.Scale is null)
        {
            return;
        }

        var max = Math.Max(r.Scale.Distribution.Count == 0 ? 1 : r.Scale.Distribution.Max(b => b.Count), 1);

        foreach (var bucket in r.Scale.Distribution)
        {
            console.Line($"{bucket.Value,2}  {Bar(bucket.Count, max)}  {bucket.Count}");
        }

        console.Line();
        console.Line($"Average: {r.Scale.Average:0.00} / {VoteShapeRule.ScaleMax}");
    }

    private static string Bar(int value, int max)
    {
        var filled = max == 0 ? 0 : (int)Math.Round((double)value / max * BarWidth);
        return new string('█', filled).PadRight(BarWidth, '·');
    }
}
