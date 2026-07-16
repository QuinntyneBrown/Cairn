namespace Cairn.Application.Comments;

public record CommentDto(
    Guid Id,
    Guid IdeaId,
    Guid AuthorId,
    string AuthorName,
    string Body,
    DateTimeOffset CreatedAt);
