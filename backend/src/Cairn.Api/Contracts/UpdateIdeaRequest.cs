using Cairn.Domain;

namespace Cairn.Api.Contracts;

public record UpdateIdeaRequest(
    string Title,
    string Description,
    ResponseType ResponseType,
    DateTimeOffset OpensAt,
    DateTimeOffset ClosesAt,
    IReadOnlyList<string>? Options);
