using Cairn.Application.Abstractions;
using Cairn.Application.Votes;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Closing;

/// <summary>
/// Announces ideas whose voting window has just elapsed.
///
/// This only ever sends a notification — it does not make an idea closed. Closure is derived
/// from the clock on every read and write, so a missed tick, a restart, or a slow timer costs
/// connected clients a few seconds of staleness and can never let a late vote through.
/// </summary>
public class AnnounceDueClosuresCommandHandler(
    IAppDbContext db,
    IClock clock,
    IVotingNotifier notifier,
    ISender sender) : IRequestHandler<AnnounceDueClosuresCommand, int>
{
    public async Task<int> Handle(AnnounceDueClosuresCommand request, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;

        // ClosedAnnouncedAt is bookkeeping, not status. Keeping it in the database rather
        // than in memory is what makes this idempotent across restarts: an idea that closed
        // while the process was down is announced on the first tick after it comes back.
        var due = await db.Ideas
            .Where(i => i.ClosesAt <= now && i.ClosedAnnouncedAt == null)
            .Select(i => i.Id)
            .ToListAsync(cancellationToken);

        foreach (var ideaId in due)
        {
            var results = await sender.Send(new GetIdeaResultsQuery(ideaId), cancellationToken);
            await notifier.VotingClosedAsync(results, cancellationToken);
        }

        if (due.Count > 0)
        {
            await db.Ideas
                .Where(i => due.Contains(i.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.ClosedAnnouncedAt, now), cancellationToken);
        }

        return due.Count;
    }
}
