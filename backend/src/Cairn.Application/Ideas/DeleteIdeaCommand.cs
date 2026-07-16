using MediatR;

namespace Cairn.Application.Ideas;

public record DeleteIdeaCommand(Guid Id) : IRequest;
