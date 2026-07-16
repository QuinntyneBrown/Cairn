using Cairn.Domain;

namespace Cairn.Application.Ideas;

public record IdeaSummaryDto(
    Guid Id,
    string Title,
    ResponseType ResponseType,
    IdeaStatus Status,
    DateTimeOffset OpensAt,
    DateTimeOffset ClosesAt,
    int VoteCount,
    int InvitedCount);
