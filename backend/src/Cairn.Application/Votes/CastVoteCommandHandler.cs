using Cairn.Application.Abstractions;
using Cairn.Application.Auth;
using Cairn.Application.Ideas;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Votes;

public class CastVoteCommandHandler(
    IAppDbContext db,
    IClock clock,
    ICurrentUser currentUser,
    IVotingNotifier notifier,
    ISender sender) : IRequestHandler<CastVoteCommand, VoteDto>
{
    public async Task<VoteDto> Handle(CastVoteCommand request, CancellationToken cancellationToken)
    {
        var voterId = currentUser.UserId
            ?? throw new ForbiddenException("A voting session is required.");

        // A vote-link token's subject is a real user id, and its idea_id claim is what
        // confines it. Without this comparison, a lead holding a link for one idea could vote
        // on every other idea in the system.
        if (currentUser.Scope == AuthScopes.Vote && currentUser.VoteLinkIdeaId != request.IdeaId)
        {
            throw new ForbiddenException("This voting link is not for that idea.");
        }

        var idea = await db.Ideas
            .Include(i => i.Options)
            .FirstOrDefaultAsync(i => i.Id == request.IdeaId, cancellationToken)
            ?? throw new IdeaNotFoundException(request.IdeaId);

        var now = clock.UtcNow;

        // The window is re-checked on every write against the server's own clock. This is the
        // guarantee: a client with a wrong clock, a missed close broadcast, or no hub
        // connection at all still cannot land a late vote.
        var status = IdeaWindow.StatusOf(idea, now);
        if (status != IdeaStatus.Open)
        {
            throw new VotingClosedException(status == IdeaStatus.Draft
                ? "Voting on this idea has not opened yet."
                : "Voting on this idea has closed.");
        }

        VoteShapeRule.Check(idea.ResponseType, request.YesNo, request.SelectedOptionId, request.Scale);

        if (request.SelectedOptionId is { } optionId
            && idea.Options.TrueForAll(o => o.Id != optionId))
        {
            throw new ForbiddenException("That option does not belong to this idea.");
        }

        var vote = await db.Votes
            .FirstOrDefaultAsync(v => v.IdeaId == idea.Id && v.VoterId == voterId, cancellationToken);

        if (vote is null)
        {
            vote = new Vote
            {
                Id = Guid.NewGuid(),
                IdeaId = idea.Id,
                VoterId = voterId,
                CreatedAt = now
            };
            db.Votes.Add(vote);
        }

        // Upsert: a lead can change their mind until the idea closes.
        vote.ResponseType = idea.ResponseType;
        vote.YesNoValue = request.YesNo;
        vote.SelectedOptionId = request.SelectedOptionId;
        vote.ScaleValue = request.Scale;
        vote.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);

        // Push the whole tally rather than a delta. There are dozens of votes, not millions,
        // so a full projection is cheap — and it self-heals a client that missed a message,
        // where delta reconciliation would silently drift.
        var results = await sender.Send(new GetIdeaResultsQuery(idea.Id), cancellationToken);
        await notifier.VoteRecordedAsync(results, cancellationToken);

        return VoteMapper.ToDto(vote);
    }
}
