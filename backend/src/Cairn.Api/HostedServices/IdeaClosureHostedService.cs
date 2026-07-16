using Cairn.Application.Closing;
using MediatR;

namespace Cairn.Api.HostedServices;

/// <summary>
/// Ticks so that closures get announced to connected clients. The interval is a comfort
/// setting, not a correctness one — the server refuses late votes regardless of whether this
/// service is running at all.
/// </summary>
public class IdeaClosureHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<IdeaClosureHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                // A fresh scope per tick: the DbContext is scoped, and holding one for the
                // lifetime of the service would root it forever.
                using var scope = scopeFactory.CreateScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();

                var announced = await sender.Send(new AnnounceDueClosuresCommand(), stoppingToken);
                if (announced > 0)
                {
                    logger.LogInformation("Announced closure for {Count} idea(s).", announced);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // One bad tick must not kill the loop.
                logger.LogError(ex, "Closure announcement tick failed.");
            }
        }
    }
}
