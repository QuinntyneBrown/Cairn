using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class LinksCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("links", "Generate the voting links you hand to leads");
        command.Add(LinksGenerateCommand.Create(services));
        command.Add(LinksListCommand.Create(services));
        return command;
    }
}
