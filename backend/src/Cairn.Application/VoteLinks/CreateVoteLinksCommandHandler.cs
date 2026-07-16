using Cairn.Application.Abstractions;
using Cairn.Application.Ideas;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.VoteLinks;

public class CreateVoteLinksCommandHandler(
    IAppDbContext db,
    IClock clock,
    IVoteLinkUrlBuilder urls,
    IVoteLinkSender sender) : IRequestHandler<CreateVoteLinksCommand, IReadOnlyList<VoteLinkDto>>
{
    public async Task<IReadOnlyList<VoteLinkDto>> Handle(
        CreateVoteLinksCommand request,
        CancellationToken cancellationToken)
    {
        var idea = await db.Ideas
            .FirstOrDefaultAsync(i => i.Id == request.IdeaId, cancellationToken)
            ?? throw new IdeaNotFoundException(request.IdeaId);

        var leads = await db.Users
            .Where(u => request.UserIds.Count == 0
                ? u.Role == Roles.Lead || u.Role == Roles.Admin
                : request.UserIds.Contains(u.Id))
            .ToListAsync(cancellationToken);

        var existing = await db.VoteLinks
            .Where(l => l.IdeaId == idea.Id)
            .ToListAsync(cancellationToken);

        var now = clock.UtcNow;
        var results = new List<VoteLinkDto>();

        foreach (var lead in leads)
        {
            var rawToken = SecureToken.Generate();
            var link = existing.FirstOrDefault(l => l.UserId == lead.Id);

            if (link is null)
            {
                link = new VoteLink
                {
                    Id = Guid.NewGuid(),
                    IdeaId = idea.Id,
                    UserId = lead.Id,
                    CreatedAt = now
                };
                db.VoteLinks.Add(link);
            }

            // Rotate in place rather than inserting a second row. This keeps (IdeaId, UserId)
            // unique for real, and the previous URL stops working the moment this saves.
            link.TokenHash = SecureToken.Hash(rawToken);
            link.RevokedAt = null;

            // The link is worthless once voting closes, so default its expiry to the close.
            // The column stays so the policy can change without a migration.
            link.ExpiresAt = idea.ClosesAt;

            var url = urls.Build(rawToken);
            await sender.SendAsync(lead.Email, idea.Id, url, cancellationToken);

            results.Add(new VoteLinkDto(
                link.Id, idea.Id, lead.Id, lead.DisplayName, lead.Email,
                link.ExpiresAt, link.CreatedAt, IsRevoked: false, HasVoted: false, url));
        }

        await db.SaveChangesAsync(cancellationToken);

        return results;
    }
}
