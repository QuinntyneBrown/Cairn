using System.CommandLine;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;
using Cairn.Infrastructure;
using Cairn.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Cli.Commands;

public static class DbSeedCommand
{
    public static Command Create(IServiceProvider services)
    {
        var resetOption = new Option<bool>("--reset")
        {
            Description = "Drop and recreate the database first"
        };

        var forceOption = new Option<bool>("--force")
        {
            Description = "Allow --reset against a non-local server"
        };

        var command = new Command("seed", "Seed FaithTech Toronto sample data");
        command.Add(resetOption);
        command.Add(forceOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            using var scope = services.CreateScope();
            var console = scope.ServiceProvider.GetRequiredService<IConsoleWriter>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var configuration = services.GetRequiredService<IConfiguration>();
            var connectionString = configuration.GetConnectionString("Default");

            if (parseResult.GetValue(resetOption))
            {
                if (!LocalServerGuard.IsLocal(connectionString) && !parseResult.GetValue(forceOption))
                {
                    console.Error(
                        $"Refusing to reset a non-local server ({ConnectionStringMasker.Mask(connectionString)}). "
                        + "Pass --force if you are certain.");
                    return 1;
                }

                console.Warn("Dropping the database...");
                await db.Database.EnsureDeletedAsync(cancellationToken);
            }

            await db.Database.MigrateAsync(cancellationToken);

            var seeder = scope.ServiceProvider.GetRequiredService<DevDataSeeder>();
            var seeded = await seeder.SeedAsync(cancellationToken);

            if (seeded)
            {
                console.Success("Seeded sample data.");
                console.Line($"  Admin sign-in: {SampleData.AdminEmail} / {DevDataSeeder.AdminPassword}");
                console.Line("  Leads have no password — they vote via 'cairn links generate'.");
            }
            else
            {
                console.Warn("Sample data is already present. Use --reset to start over.");
            }

            return 0;
        });

        return command;
    }
}
