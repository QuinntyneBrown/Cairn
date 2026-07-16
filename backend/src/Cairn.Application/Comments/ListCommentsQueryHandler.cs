using Cairn.Application.Abstractions;
using Cairn.Application.Auth;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Comments;

public class ListCommentsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListCommentsQuery, IReadOnlyList<CommentDto>>
{
    public async Task<IReadOnlyList<CommentDto>> Handle(
        ListCommentsQuery request,
        CancellationToken cancellationToken)
    {
        if (currentUser.Scope == AuthScopes.Vote && currentUser.VoteLinkIdeaId != request.IdeaId)
        {
            throw new ForbiddenException("This voting link is not for that idea.");
        }

        return await db.Comments
            .AsNoTracking()
            .Where(c => c.IdeaId == request.IdeaId)
            .Join(db.Users, c => c.AuthorId, u => u.Id, (c, u) => new { Comment = c, Author = u })
            .OrderBy(x => x.Comment.CreatedAt)
            .Select(x => new CommentDto(
                x.Comment.Id,
                x.Comment.IdeaId,
                x.Author.Id,
                x.Author.DisplayName,
                x.Comment.Body,
                x.Comment.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
