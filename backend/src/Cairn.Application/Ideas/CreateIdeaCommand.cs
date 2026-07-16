using Cairn.Domain;
using MediatR;

namespace Cairn.Application.Ideas;

public record CreateIdeaCommand(
    string Title,
    string Description,
    ResponseType ResponseType,
    DateTimeOffset OpensAt,
    DateTimeOffset ClosesAt,
    IReadOnlyList<string> Options) : IRequest<Guid>;
