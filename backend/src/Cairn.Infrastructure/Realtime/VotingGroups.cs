namespace Cairn.Infrastructure.Realtime;

internal static class VotingGroups
{
    /// <summary>Signed-in watchers. Receives full tallies.</summary>
    public static string Report(Guid ideaId) => $"idea:{ideaId}";

    /// <summary>
    /// Magic-link voters. Receives closure and comments but never a tally — seeing the crowd
    /// lean one way anchors a voter's own answer, and votes are supposed to be independent.
    /// </summary>
    public static string Voters(Guid ideaId) => $"idea:{ideaId}:voters";
}
