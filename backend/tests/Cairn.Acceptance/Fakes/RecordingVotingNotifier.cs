using Cairn.Application.Abstractions;
using Cairn.Application.Comments;
using Cairn.Application.Votes;

namespace Cairn.Acceptance.Fakes;

public class RecordingVotingNotifier : IVotingNotifier
{
    public List<IdeaResultsDto> VoteRecorded { get; } = [];

    public List<IdeaResultsDto> VotingClosed { get; } = [];

    public List<CommentDto> CommentsAdded { get; } = [];

    public Task VoteRecordedAsync(IdeaResultsDto results, CancellationToken cancellationToken)
    {
        VoteRecorded.Add(results);
        return Task.CompletedTask;
    }

    public Task VotingClosedAsync(IdeaResultsDto results, CancellationToken cancellationToken)
    {
        VotingClosed.Add(results);
        return Task.CompletedTask;
    }

    public Task CommentAddedAsync(Guid ideaId, CommentDto comment, CancellationToken cancellationToken)
    {
        CommentsAdded.Add(comment);
        return Task.CompletedTask;
    }
}
