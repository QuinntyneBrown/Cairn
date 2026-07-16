namespace Cairn.Application.Ideas;

/// <summary>
/// Always computed from the clock, never stored. A stored status drifts the moment a
/// scheduler misses a tick or a process restarts; a computed one cannot.
/// </summary>
public enum IdeaStatus
{
    Draft,
    Open,
    Closed
}
