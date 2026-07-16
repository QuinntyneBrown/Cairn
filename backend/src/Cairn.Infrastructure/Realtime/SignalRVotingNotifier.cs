using Cairn.Application.Abstractions;
using Cairn.Application.Comments;
using Cairn.Application.Votes;
using Microsoft.AspNetCore.SignalR;

namespace Cairn.Infrastructure.Realtime;

public class SignalRVotingNotifier(IHubContext<VotingHub> hub) : IVotingNotifier
{
    public Task VoteRecordedAsync(IdeaResultsDto results, CancellationToken cancellationToken) =>
        // Report group only. Voters do not get running tallies.
        hub.Clients
            .Group(VotingGroups.Report(results.IdeaId))
            .SendAsync("VoteRecorded", results, cancellationToken);

    public Task VotingClosedAsync(IdeaResultsDto results, CancellationToken cancellationToken) =>
        // Both groups: a voter staring at an open ballot needs to know it just closed.
        hub.Clients
            .Groups(VotingGroups.Report(results.IdeaId), VotingGroups.Voters(results.IdeaId))
            .SendAsync("VotingClosed", results, cancellationToken);

    public Task CommentAddedAsync(Guid ideaId, CommentDto comment, CancellationToken cancellationToken) =>
        hub.Clients
            .Groups(VotingGroups.Report(ideaId), VotingGroups.Voters(ideaId))
            .SendAsync("CommentAdded", comment, cancellationToken);
}
