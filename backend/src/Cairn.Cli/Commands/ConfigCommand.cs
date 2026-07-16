using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class ConfigCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("config", "Inspect the CLI's resolved configuration");
        command.Add(ConfigShowCommand.Create(services));
        return command;
    }
}
