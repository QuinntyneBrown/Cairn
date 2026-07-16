using Cairn.Application.Abstractions;
using Cairn.Cli.Deck;
using Cairn.Cli.Infrastructure;
using Cairn.Cli.Output;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cairn.Cli;

public static class DependencyInjection
{
    public static IServiceCollection AddCliServices(this IServiceCollection services)
    {
        services.AddSingleton<IConsoleWriter, ConsoleWriter>();
        services.AddSingleton<IDeckBuilder, OpenXmlDeckBuilder>();

        // Interface-segregated on purpose: --format picks an implementation, and adding a
        // fourth format is a new file plus one registration.
        services.AddKeyedSingleton<ILinkFormatter, TextLinkFormatter>("text");
        services.AddKeyedSingleton<ILinkFormatter, CsvLinkFormatter>("csv");
        services.AddKeyedSingleton<ILinkFormatter, MarkdownLinkFormatter>("md");

        // The CLI is not an HTTP host, so it supplies its own versions of the two
        // abstractions the API fulfils from the request pipeline.
        services.AddScoped<CliCurrentUser>();
        services.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<CliCurrentUser>());
        services.TryAddSingleton<IVotingNotifier, NoOpVotingNotifier>();

        return services;
    }
}
