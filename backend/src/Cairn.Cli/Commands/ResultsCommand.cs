using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class ResultsCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("results", "Read results without building a deck");
        command.Add(ResultsShowCommand.Create(services));
        return command;
    }
}
