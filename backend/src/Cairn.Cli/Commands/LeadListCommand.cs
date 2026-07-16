using System.CommandLine;
using System.Text.Json;
using Cairn.Application.Leads;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;

namespace Cairn.Cli.Commands;

public static class LeadListCommand
{
    public static Command Create(IServiceProvider services)
    {
        var jsonOption = new Option<bool>("--json") { Description = "Emit JSON instead of a table" };

        var command = new Command("list", "List leads and admins");
        command.Add(jsonOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);
            var leads = await scope.Mediator.Send(new ListLeadsQuery(), cancellationToken);

            if (parseResult.GetValue(jsonOption))
            {
                scope.Console.Line(JsonSerializer.Serialize(leads, CliJson.Options));
                return 0;
            }

            scope.Console.Heading($"{leads.Count} people");
            var rows = new List<string[]> { new[] { "ID", "NAME", "EMAIL", "ROLE", "SIGN-IN" } };
            rows.AddRange(leads.Select(l => new[]
            {
                l.Id.ToString(),
                l.DisplayName,
                l.Email,
                l.Role,
                l.CanSignIn ? "yes" : "link only"
            }));

            scope.Console.Table(rows);
            return 0;
        });

        return command;
    }
}
