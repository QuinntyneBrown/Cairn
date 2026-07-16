namespace Cairn.Application.Abstractions;

/// <summary>
/// The seam for delivering a vote link. Links are currently generated and copied by hand, so
/// the only implementation logs them — but handlers depend on this rather than on nothing, so
/// adding SMTP later is a DI registration change and touches no domain or handler code.
/// </summary>
public interface IVoteLinkSender
{
    Task SendAsync(string email, Guid ideaId, string url, CancellationToken cancellationToken);
}
