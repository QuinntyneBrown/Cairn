using System.CommandLine;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;
using Cairn.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Cli.Commands;

public static class DbResetCommand
{
    public static Command Create(IServiceProvider services)
    {
        var forceOption = new Option<bool>("--force")
        {
            Description = "Allow this against a non-local server"
        };

        var command = new Command("reset", "Drop the database and recreate it empty");
        command.Add(forceOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            using var scope = services.CreateScope();
            var console = scope.ServiceProvider.GetRequiredService<IConsoleWriter>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var connectionString = services.GetRequiredService<IConfiguration>()
                .GetConnectionString("Default");

            if (!LocalServerGuard.IsLocal(connectionString) && !parseResult.GetValue(forceOption))
            {
                console.Error(
                    $"Refusing to drop a non-local server ({ConnectionStringMasker.Mask(connectionString)}). "
                    + "Pass --force if you are certain.");
                return 1;
            }

            console.Warn($"Dropping {ConnectionStringMasker.Mask(connectionString)}...");
            await db.Database.EnsureDeletedAsync(cancellationToken);
            await db.Database.MigrateAsync(cancellationToken);

            console.Success("Database recreated and empty.");
            return 0;
        });

        return command;
    }
}
