using Cairn.Application.Ideas;
using Cairn.Domain;

namespace Cairn.Application.Votes;

/// <summary>
/// The one results projection. The admin dashboard, the SignalR broadcast, `cairn results
/// show` and the .pptx deck all consume this — the aggregation is written once.
///
/// Only the block matching <paramref name="ResponseType"/> is populated.
/// </summary>
public record IdeaResultsDto(
    Guid IdeaId,
    string Title,
    ResponseType ResponseType,
    IdeaStatus Status,
    DateTimeOffset ClosesAt,
    int TotalVotes,
    int InvitedCount,
    int? YesCount,
    int? NoCount,
    IReadOnlyList<OptionTallyDto>? Options,
    ScaleSummaryDto? Scale);
