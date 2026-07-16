using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.VoteLinks;

public class ListVoteLinksQueryHandler(IAppDbContext db)
    : IRequestHandler<ListVoteLinksQuery, IReadOnlyList<VoteLinkDto>>
{
    public async Task<IReadOnlyList<VoteLinkDto>> Handle(
        ListVoteLinksQuery request,
        CancellationToken cancellationToken)
    {
        return await db.VoteLinks
            .AsNoTracking()
            .Where(l => l.IdeaId == request.IdeaId)
            .Join(db.Users, l => l.UserId, u => u.Id, (l, u) => new { Link = l, User = u })
            .OrderBy(x => x.User.DisplayName)
            .Select(x => new VoteLinkDto(
                x.Link.Id,
                x.Link.IdeaId,
                x.User.Id,
                x.User.DisplayName,
                x.User.Email,
                x.Link.ExpiresAt,
                x.Link.CreatedAt,
                x.Link.RevokedAt != null,
                db.Votes.Any(v => v.IdeaId == x.Link.IdeaId && v.VoterId == x.User.Id),
                // Only the hash is stored, so the URL cannot be reconstructed. Regenerate to
                // get a fresh one.
                null))
            .ToListAsync(cancellationToken);
    }
}
