using MediatR;

namespace Cairn.Application.Ideas;

public record GetIdeaByIdQuery(Guid Id) : IRequest<IdeaDto>;
