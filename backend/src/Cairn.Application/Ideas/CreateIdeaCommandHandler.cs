using Cairn.Application.Abstractions;
using Cairn.Application.Auth;
using Cairn.Domain;
using MediatR;

namespace Cairn.Application.Ideas;

public class CreateIdeaCommandHandler(IAppDbContext db, IClock clock, ICurrentUser currentUser)
    : IRequestHandler<CreateIdeaCommand, Guid>
{
    public async Task<Guid> Handle(CreateIdeaCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId
            ?? throw new ForbiddenException("Only a signed-in admin can create an idea.");

        var idea = new Idea
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ResponseType = request.ResponseType,
            OpensAt = request.OpensAt,
            ClosesAt = request.ClosesAt,
            CreatedByUserId = userId,
            CreatedAt = clock.UtcNow,
            Options = request.Options
                .Select((label, index) => new IdeaOption
                {
                    Id = Guid.NewGuid(),
                    Label = label.Trim(),
                    SortOrder = index
                })
                .ToList()
        };

        db.Ideas.Add(idea);
        await db.SaveChangesAsync(cancellationToken);

        return idea.Id;
    }
}
