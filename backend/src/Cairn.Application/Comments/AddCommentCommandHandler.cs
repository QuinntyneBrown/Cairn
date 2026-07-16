using Cairn.Application.Abstractions;
using Cairn.Application.Auth;
using Cairn.Application.Ideas;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Comments;

public class AddCommentCommandHandler(
    IAppDbContext db,
    IClock clock,
    ICurrentUser currentUser,
    IVotingNotifier notifier) : IRequestHandler<AddCommentCommand, CommentDto>
{
    public async Task<CommentDto> Handle(AddCommentCommand request, CancellationToken cancellationToken)
    {
        var authorId = currentUser.UserId ?? throw new ForbiddenException("A session is required.");

        // Leads comment through their magic link, so a vote-scoped token is allowed here —
        // but only on the one idea its idea_id claim names.
        if (currentUser.Scope == AuthScopes.Vote && currentUser.VoteLinkIdeaId != request.IdeaId)
        {
            throw new ForbiddenException("This voting link is not for that idea.");
        }

        var idea = await db.Ideas
            .FirstOrDefaultAsync(i => i.Id == request.IdeaId, cancellationToken)
            ?? throw new IdeaNotFoundException(request.IdeaId);

        // Commenting follows the same window as voting: once an idea is closed the record of
        // what people thought at the time stops changing.
        if (!IdeaWindow.IsOpen(idea, clock.UtcNow))
        {
            throw new Votes.VotingClosedException("This idea is not open for comment.");
        }

        var author = await db.Users
            .FirstOrDefaultAsync(u => u.Id == authorId, cancellationToken)
            ?? throw new ForbiddenException("The commenting user no longer exists.");

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            IdeaId = idea.Id,
            AuthorId = authorId,
            Body = request.Body.Trim(),
            CreatedAt = clock.UtcNow
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);

        var dto = new CommentDto(
            comment.Id, comment.IdeaId, author.Id, author.DisplayName, comment.Body, comment.CreatedAt);

        await notifier.CommentAddedAsync(idea.Id, dto, cancellationToken);

        return dto;
    }
}
