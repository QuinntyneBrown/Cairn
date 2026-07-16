using Cairn.Application.Abstractions;
using Cairn.Application.Ideas;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Votes;

public class GetIdeaResultsQueryHandler(IAppDbContext db, IClock clock)
    : IRequestHandler<GetIdeaResultsQuery, IdeaResultsDto>
{
    public async Task<IdeaResultsDto> Handle(
        GetIdeaResultsQuery request,
        CancellationToken cancellationToken)
    {
        var idea = await db.Ideas
            .Include(i => i.Options)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == request.IdeaId, cancellationToken)
            ?? throw new IdeaNotFoundException(request.IdeaId);

        var votes = await db.Votes
            .AsNoTracking()
            .Where(v => v.IdeaId == idea.Id)
            .Select(v => new { v.YesNoValue, v.SelectedOptionId, v.ScaleValue })
            .ToListAsync(cancellationToken);

        var invited = await db.VoteLinks
            .CountAsync(l => l.IdeaId == idea.Id && l.RevokedAt == null, cancellationToken);

        int? yesCount = null;
        int? noCount = null;
        IReadOnlyList<OptionTallyDto>? options = null;
        ScaleSummaryDto? scale = null;

        switch (idea.ResponseType)
        {
            case ResponseType.YesNo:
                yesCount = votes.Count(v => v.YesNoValue == true);
                noCount = votes.Count(v => v.YesNoValue == false);
                break;

            case ResponseType.Options:
                // Left-join shape: every option appears, including ones nobody picked.
                options = idea.Options
                    .OrderBy(o => o.SortOrder)
                    .Select(o => new OptionTallyDto(
                        o.Id,
                        o.Label,
                        votes.Count(v => v.SelectedOptionId == o.Id)))
                    .ToList();
                break;

            case ResponseType.Scale:
                var values = votes.Where(v => v.ScaleValue.HasValue)
                    .Select(v => v.ScaleValue!.Value)
                    .ToList();

                var distribution = Enumerable
                    .Range(VoteShapeRule.ScaleMin, VoteShapeRule.ScaleMax - VoteShapeRule.ScaleMin + 1)
                    .Select(point => new ScaleBucketDto(point, values.Count(v => v == point)))
                    .ToList();

                scale = new ScaleSummaryDto(
                    values.Count == 0 ? 0 : Math.Round(values.Average(), 2),
                    distribution);
                break;
        }

        return new IdeaResultsDto(
            idea.Id,
            idea.Title,
            idea.ResponseType,
            IdeaWindow.StatusOf(idea, clock.UtcNow),
            idea.ClosesAt,
            votes.Count,
            invited,
            yesCount,
            noCount,
            options,
            scale);
    }
}
