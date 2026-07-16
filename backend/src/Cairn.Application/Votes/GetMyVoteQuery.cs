using MediatR;

namespace Cairn.Application.Votes;

public record GetMyVoteQuery(Guid IdeaId) : IRequest<VoteDto?>;
