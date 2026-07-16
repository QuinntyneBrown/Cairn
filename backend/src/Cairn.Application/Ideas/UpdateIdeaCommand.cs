using Cairn.Domain;
using MediatR;

namespace Cairn.Application.Ideas;

public record UpdateIdeaCommand(
    Guid Id,
    string Title,
    string Description,
    ResponseType ResponseType,
    DateTimeOffset OpensAt,
    DateTimeOffset ClosesAt,
    IReadOnlyList<string> Options) : IRequest;
