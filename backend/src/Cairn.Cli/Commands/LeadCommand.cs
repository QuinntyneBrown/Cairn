using System.CommandLine;

namespace Cairn.Cli.Commands;

public static class LeadCommand
{
    public static Command Create(IServiceProvider services)
    {
        var command = new Command("lead", "Manage team leads");
        command.Add(LeadCreateCommand.Create(services));
        command.Add(LeadListCommand.Create(services));
        return command;
    }
}
