using System.CommandLine;
using Cairn.Application;
using Cairn.Cli.Commands;
using Cairn.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cairn.Cli;

/// <summary>
/// An explicit, namespaced entry point rather than top-level statements. Top-level statements
/// emit a global Program class, and Cairn.Api already has one for WebApplicationFactory — a
/// project referencing both then cannot resolve the name.
/// </summary>
internal static class CliEntryPoint
{
    private static async Task<int> Main(string[] args)
    {
        var builder = Host.CreateApplicationBuilder(args);

        builder.Configuration
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables("CAIRN_");

        // Quiet by default; EF's command logging would drown the output the CLI exists to show.
        builder.Logging.SetMinimumLevel(LogLevel.Warning);

        // The same Application and Infrastructure registrations the API uses, so a command
        // sends the identical CreateIdeaCommand the HTTP surface does — same validation, same
        // invariants, no second implementation to drift.
        builder.Services.AddCairnApplication();
        builder.Services.AddCairnInfrastructure(builder.Configuration);
        builder.Services.AddCliServices();

        using var host = builder.Build();
        var services = host.Services;

        var root = new RootCommand("cairn — admin CLI for the Cairn voting app");
        root.Add(ConfigCommand.Create(services));
        root.Add(DbCommand.Create(services));
        root.Add(LeadCommand.Create(services));
        root.Add(IdeaCommand.Create(services));
        root.Add(LinksCommand.Create(services));
        root.Add(ResultsCommand.Create(services));
        root.Add(DeckCommand.Create(services));

        // The exit code comes back from the action. Never Environment.Exit.
        return await root.Parse(args).InvokeAsync();
    }
}
