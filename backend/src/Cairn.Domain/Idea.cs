namespace Cairn.Domain;

public class Idea
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public ResponseType ResponseType { get; set; }

    public DateTimeOffset OpensAt { get; set; }

    public DateTimeOffset ClosesAt { get; set; }

    /// <summary>
    /// Stamped once the closure has been broadcast. This is announcement bookkeeping, not
    /// status — status is always computed from the clock, never read from a column.
    /// </summary>
    public DateTimeOffset? ClosedAnnouncedAt { get; set; }

    public Guid CreatedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<IdeaOption> Options { get; set; } = [];

    public List<Vote> Votes { get; set; } = [];

    public List<Comment> Comments { get; set; } = [];
}
