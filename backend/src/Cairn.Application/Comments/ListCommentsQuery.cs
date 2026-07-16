using MediatR;

namespace Cairn.Application.Comments;

public record ListCommentsQuery(Guid IdeaId) : IRequest<IReadOnlyList<CommentDto>>;
