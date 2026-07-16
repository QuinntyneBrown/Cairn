using System.CommandLine;
using Cairn.Cli.Infrastructure;
using Cairn.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cairn.Cli.Commands;

/// <summary>The thing you check before running 'db reset'.</summary>
public static class ConfigShowCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("show", "Show the resolved database target and base URL");

        command.SetAction(async (_, _) =>
        {
            await using var scope = CliScope.Create(services);
            var configuration = services.GetRequiredService<IConfiguration>();
            var voteLink = services.GetRequiredService<IOptions<VoteLinkOptions>>().Value;

            scope.Console.Heading("Cairn CLI configuration");
            scope.Console.Table([
                ["Database", ConnectionStringMasker.Mask(configuration.GetConnectionString("Default"))],
                ["Vote link base URL", voteLink.BaseUrl]
            ]);

            return 0;
        });

        return command;
    }
}
