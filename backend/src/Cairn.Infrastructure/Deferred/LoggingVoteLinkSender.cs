using Cairn.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace Cairn.Infrastructure.Deferred;

/// <summary>
/// Stands in for email delivery, which was deliberately deferred. Swap this registration for
/// an SMTP sender when links should be emailed rather than copied.
/// </summary>
public class LoggingVoteLinkSender(ILogger<LoggingVoteLinkSender> logger) : IVoteLinkSender
{
    public Task SendAsync(string email, Guid ideaId, string url, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Vote link for idea {IdeaId} ready for {Email}: {Url}", ideaId, email, url);

        return Task.CompletedTask;
    }
}
