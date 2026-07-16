using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Ideas;

public class GetIdeaByIdQueryHandler(IAppDbContext db, IClock clock)
    : IRequestHandler<GetIdeaByIdQuery, IdeaDto>
{
    public async Task<IdeaDto> Handle(GetIdeaByIdQuery request, CancellationToken cancellationToken)
    {
        var idea = await db.Ideas
            .Include(i => i.Options)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken)
            ?? throw new IdeaNotFoundException(request.Id);

        return IdeaMapper.ToDto(idea, clock.UtcNow);
    }
}
