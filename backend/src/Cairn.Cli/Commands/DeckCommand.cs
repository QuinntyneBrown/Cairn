using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class DeckCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("deck", "Build a FaithTech-branded results deck");
        command.Add(DeckBuildCommand.Create(services));
        return command;
    }
}
