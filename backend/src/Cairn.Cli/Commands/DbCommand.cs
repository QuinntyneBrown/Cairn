using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class DbCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("db", "Database maintenance");
        command.Add(DbMigrateCommand.Create(services));
        command.Add(DbSeedCommand.Create(services));
        command.Add(DbResetCommand.Create(services));
        return command;
    }
}
