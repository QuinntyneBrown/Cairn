using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Ideas;

public class ListIdeasQueryHandler(IAppDbContext db, IClock clock)
    : IRequestHandler<ListIdeasQuery, IReadOnlyList<IdeaSummaryDto>>
{
    public async Task<IReadOnlyList<IdeaSummaryDto>> Handle(
        ListIdeasQuery request,
        CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;

        var rows = await db.Ideas
            .AsNoTracking()
            .OrderByDescending(i => i.ClosesAt)
            .Select(i => new
            {
                i.Id,
                i.Title,
                i.ResponseType,
                i.OpensAt,
                i.ClosesAt,
                VoteCount = i.Votes.Count(),
                InvitedCount = db.VoteLinks.Count(l => l.IdeaId == i.Id && l.RevokedAt == null)
            })
            .ToListAsync(cancellationToken);

        // Status is filtered in memory rather than in SQL because it is derived from the
        // clock, and the whole point of computing it is that it lives in one place.
        return rows
            .Select(r => new
            {
                Row = r,
                Status = r.OpensAt > now
                    ? IdeaStatus.Draft
                    : r.ClosesAt > now ? IdeaStatus.Open : IdeaStatus.Closed
            })
            .Where(x => request.Status is null || x.Status == request.Status)
            .Select(x => new IdeaSummaryDto(
                x.Row.Id,
                x.Row.Title,
                x.Row.ResponseType,
                x.Status,
                x.Row.OpensAt,
                x.Row.ClosesAt,
                x.Row.VoteCount,
                x.Row.InvitedCount))
            .ToList();
    }
}
