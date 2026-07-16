using MediatR;

namespace Cairn.Application.Ideas;

/// <summary>Null <paramref name="Status"/> lists everything.</summary>
public record ListIdeasQuery(IdeaStatus? Status = null) : IRequest<IReadOnlyList<IdeaSummaryDto>>;
