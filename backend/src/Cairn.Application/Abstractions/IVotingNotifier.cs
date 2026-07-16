using Cairn.Application.Comments;
using Cairn.Application.Votes;

namespace Cairn.Application.Abstractions;

/// <summary>
/// The only way application code reaches the real-time layer. Handlers never reference
/// SignalR, so the Application project stays free of ASP.NET.
///
/// Broadcasts are notifications, not truth: the server re-derives the voting window on every
/// read and write, so a dropped message costs a client a few seconds of staleness and nothing
/// more.
/// </summary>
public interface IVotingNotifier
{
    /// <summary>Full tallies. Report watchers only — voters must not see running results.</summary>
    Task VoteRecordedAsync(IdeaResultsDto results, CancellationToken cancellationToken);

    /// <summary>Sent to watchers and voters alike: everyone needs to know voting stopped.</summary>
    Task VotingClosedAsync(IdeaResultsDto results, CancellationToken cancellationToken);

    Task CommentAddedAsync(Guid ideaId, CommentDto comment, CancellationToken cancellationToken);
}
