using Cairn.Application.Abstractions;
using Cairn.Application.Comments;
using Cairn.Application.Votes;

namespace Cairn.Cli.Infrastructure;

/// <summary>
/// The CLI has no SignalR hub to broadcast into. Handlers still call the notifier, so this
/// absorbs it. Nothing is lost: the API re-derives state on every read, so a client that was
/// connected while the CLI changed something sees the truth on its next fetch.
/// </summary>
public class NoOpVotingNotifier : IVotingNotifier
{
    public Task VoteRecordedAsync(IdeaResultsDto results, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    public Task VotingClosedAsync(IdeaResultsDto results, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    public Task CommentAddedAsync(Guid ideaId, CommentDto comment, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
