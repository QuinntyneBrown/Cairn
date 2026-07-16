using MediatR;

namespace Cairn.Application.VoteLinks;

public record ListVoteLinksQuery(Guid IdeaId) : IRequest<IReadOnlyList<VoteLinkDto>>;
