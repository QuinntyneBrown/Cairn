using MediatR;

namespace Cairn.Application.Comments;

public record AddCommentCommand(Guid IdeaId, string Body) : IRequest<CommentDto>;
