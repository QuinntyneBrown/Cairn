using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Ideas;

public class DeleteIdeaCommandHandler(IAppDbContext db) : IRequestHandler<DeleteIdeaCommand>
{
    public async Task Handle(DeleteIdeaCommand request, CancellationToken cancellationToken)
    {
        var idea = await db.Ideas
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken)
            ?? throw new IdeaNotFoundException(request.Id);

        db.Ideas.Remove(idea);
        await db.SaveChangesAsync(cancellationToken);
    }
}
