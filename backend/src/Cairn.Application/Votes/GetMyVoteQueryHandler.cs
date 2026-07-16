using Cairn.Application.Abstractions;
using Cairn.Application.Auth;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Votes;

public class GetMyVoteQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMyVoteQuery, VoteDto?>
{
    public async Task<VoteDto?> Handle(GetMyVoteQuery request, CancellationToken cancellationToken)
    {
        var voterId = currentUser.UserId
            ?? throw new ForbiddenException("A voting session is required.");

        if (currentUser.Scope == AuthScopes.Vote && currentUser.VoteLinkIdeaId != request.IdeaId)
        {
            throw new ForbiddenException("This voting link is not for that idea.");
        }

        var vote = await db.Votes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                v => v.IdeaId == request.IdeaId && v.VoterId == voterId,
                cancellationToken);

        return vote is null ? null : VoteMapper.ToDto(vote);
    }
}
