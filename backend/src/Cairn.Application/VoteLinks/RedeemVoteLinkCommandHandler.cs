using Cairn.Application.Abstractions;
using Cairn.Application.Ideas;
using Cairn.Application.Votes;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.VoteLinks;

public class RedeemVoteLinkCommandHandler(
    IAppDbContext db,
    IClock clock,
    IVoteSessionTokenIssuer tokens) : IRequestHandler<RedeemVoteLinkCommand, VoteSessionDto>
{
    public async Task<VoteSessionDto> Handle(
        RedeemVoteLinkCommand request,
        CancellationToken cancellationToken)
    {
        // Hash then seek. Constant work regardless of whether the token exists.
        var hash = SecureToken.Hash(request.Token);
        var now = clock.UtcNow;

        var link = await db.VoteLinks
            .FirstOrDefaultAsync(l => l.TokenHash == hash, cancellationToken);

        // Every rejection below throws the same exception with the same public message and
        // the same 410. Only the reason string differs, and that goes to the log alone.
        if (link is null)
        {
            throw new InvalidVoteLinkException("unknown token");
        }

        if (link.RevokedAt.HasValue)
        {
            throw new InvalidVoteLinkException($"link {link.Id} revoked");
        }

        if (link.ExpiresAt <= now)
        {
            throw new InvalidVoteLinkException($"link {link.Id} expired");
        }

        var idea = await db.Ideas
            .Include(i => i.Options)
            .FirstOrDefaultAsync(i => i.Id == link.IdeaId, cancellationToken)
            ?? throw new InvalidVoteLinkException($"link {link.Id} points at a missing idea");

        var lead = await db.Users
            .FirstOrDefaultAsync(u => u.Id == link.UserId, cancellationToken)
            ?? throw new InvalidVoteLinkException($"link {link.Id} points at a missing lead");

        // Reusable until the idea closes: revisiting the link re-mints the session, so the
        // anonymous flow gets refresh semantics without a refresh token.
        var issued = tokens.Issue(lead, idea.Id, link.ExpiresAt);

        var existingVote = await db.Votes
            .FirstOrDefaultAsync(v => v.IdeaId == idea.Id && v.VoterId == lead.Id, cancellationToken);

        return new VoteSessionDto(
            issued.AccessToken,
            issued.ExpiresAt,
            lead.DisplayName,
            IdeaMapper.ToDto(idea, now),
            existingVote is null ? null : VoteMapper.ToDto(existingVote));
    }
}
