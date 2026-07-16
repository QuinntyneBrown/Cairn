using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class IdeaCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("idea", "Create and manage ideas");
        command.Add(IdeaCreateCommand.Create(services));
        command.Add(IdeaListCommand.Create(services));
        command.Add(IdeaShowCommand.Create(services));
        command.Add(IdeaCloseCommand.Create(services));
        command.Add(IdeaReopenCommand.Create(services));
        command.Add(IdeaDeleteCommand.Create(services));
        return command;
    }
}
