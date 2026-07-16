using Cairn.Domain;

namespace Cairn.Application.Ideas;

/// <summary>
/// The voting window rule. Pure, so it is unit-testable with no infrastructure, and it is the
/// single definition of "is this idea open" — consulted on every read and every write.
/// </summary>
public static class IdeaWindow
{
    public static IdeaStatus StatusOf(Idea idea, DateTimeOffset now)
    {
        if (now < idea.OpensAt)
        {
            return IdeaStatus.Draft;
        }

        return now < idea.ClosesAt ? IdeaStatus.Open : IdeaStatus.Closed;
    }

    public static bool IsOpen(Idea idea, DateTimeOffset now) => StatusOf(idea, now) == IdeaStatus.Open;
}
