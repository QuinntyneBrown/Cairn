using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.VoteLinks;

public class RevokeVoteLinkCommandHandler(IAppDbContext db, IClock clock)
    : IRequestHandler<RevokeVoteLinkCommand>
{
    public async Task Handle(RevokeVoteLinkCommand request, CancellationToken cancellationToken)
    {
        var link = await db.VoteLinks
            .FirstOrDefaultAsync(
                l => l.Id == request.LinkId && l.IdeaId == request.IdeaId,
                cancellationToken)
            ?? throw new InvalidVoteLinkException($"link {request.LinkId} not found for revocation");

        // Note: this stops the link being redeemed again, but a vote-session token already
        // minted from it stays valid until it expires (at most an hour). Accepted — the
        // alternative is a denylist this app does not need.
        link.RevokedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }
}
