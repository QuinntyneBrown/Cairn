using System.CommandLine;
using Cairn.Cli.Output;
using Cairn.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Cli.Commands;

public static class DbMigrateCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("migrate", "Apply any outstanding EF Core migrations");

        command.SetAction(async (_, cancellationToken) =>
        {
            using var scope = services.CreateScope();
            var console = scope.ServiceProvider.GetRequiredService<IConsoleWriter>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
            if (pending.Count == 0)
            {
                console.Success("Database is already up to date.");
                return 0;
            }

            console.Line($"Applying {pending.Count} migration(s):");
            pending.ForEach(m => console.Line($"  {m}"));

            await db.Database.MigrateAsync(cancellationToken);
            console.Success("Done.");
            return 0;
        });

        return command;
    }
}
