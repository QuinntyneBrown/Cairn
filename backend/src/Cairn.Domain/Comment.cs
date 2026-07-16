namespace Cairn.Domain;

public class Comment
{
    public Guid Id { get; set; }

    public Guid IdeaId { get; set; }

    public Guid AuthorId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
