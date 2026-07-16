using Cairn.Domain;

namespace Cairn.Application.Ideas;

public record IdeaDto(
    Guid Id,
    string Title,
    string Description,
    ResponseType ResponseType,
    IdeaStatus Status,
    DateTimeOffset OpensAt,
    DateTimeOffset ClosesAt,
    IReadOnlyList<IdeaOptionDto> Options);
