using MediatR;

namespace Cairn.Application.Votes;

public record GetIdeaResultsQuery(Guid IdeaId) : IRequest<IdeaResultsDto>;
