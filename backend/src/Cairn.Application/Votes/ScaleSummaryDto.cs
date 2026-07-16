namespace Cairn.Application.Votes;

/// <summary>
/// <paramref name="Distribution"/> always has ten entries, one per point on the scale, so the
/// UI and the deck can render a fixed axis without inferring gaps from missing keys.
/// </summary>
public record ScaleSummaryDto(double Average, IReadOnlyList<ScaleBucketDto> Distribution);
