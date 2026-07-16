using MediatR;

namespace Cairn.Application.VoteLinks;

/// <summary>
/// Mints (or rotates) a link per lead. An empty <paramref name="UserIds"/> means every lead.
/// The response carries the raw URLs — the only time they exist — so the admin can copy them.
/// </summary>
public record CreateVoteLinksCommand(Guid IdeaId, IReadOnlyList<Guid> UserIds)
    : IRequest<IReadOnlyList<VoteLinkDto>>;
