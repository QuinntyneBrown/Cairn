using System.CommandLine;
using Cairn.Application.Ideas;
using Cairn.Cli.Infrastructure;
using Cairn.Domain;

namespace Cairn.Cli.Commands;

public static class IdeaCreateCommand
{
    public static Command Create(IServiceProvider services)
    {
        var titleOption = new Option<string>("--title", "-t")
        {
            Description = "The idea's title",
            Required = true
        };

        var descriptionOption = new Option<string>("--description", "-d")
        {
            Description = "What leads are being asked to weigh in on",
            Required = true
        };

        // An enum option gives parsing, validation and shell completions for free.
        var responseTypeOption = new Option<ResponseType>("--response-type", "-r")
        {
            Description = "YesNo | Options | Scale",
            Required = true
        };

        var choiceOption = new Option<string[]>("--choice")
        {
            Description = "A choice for an Options idea. Repeat for each one.",
            AllowMultipleArgumentsPerToken = true
        };

        var opensAtOption = new Option<DateTimeOffset>("--opens-at")
        {
            Description = "When voting opens (default: now)",
            DefaultValueFactory = _ => DateTimeOffset.Now
        };

        var closesAtOption = new Option<DateTimeOffset>("--closes-at")
        {
            Description = "When voting closes (default: 7 days from now)",
            DefaultValueFactory = _ => DateTimeOffset.Now.AddDays(7)
        };

        var command = new Command("create", "Create a new idea");
        command.Add(titleOption);
        command.Add(descriptionOption);
        command.Add(responseTypeOption);
        command.Add(choiceOption);
        command.Add(opensAtOption);
        command.Add(closesAtOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            if (!await scope.ActAsAdminAsync(cancellationToken))
            {
                return 1;
            }

            // The same command the HTTP API sends — same validator, same invariants.
            var id = await scope.Mediator.Send(
                new CreateIdeaCommand(
                    parseResult.GetValue(titleOption)!,
                    parseResult.GetValue(descriptionOption)!,
                    parseResult.GetValue(responseTypeOption),
                    parseResult.GetValue(opensAtOption),
                    parseResult.GetValue(closesAtOption),
                    parseResult.GetValue(choiceOption) ?? []),
                cancellationToken);

            scope.Console.Success($"Created idea {id}");
            scope.Console.Line($"Next: cairn links generate --idea {id}");
            return 0;
        });

        return command;
    }
}
