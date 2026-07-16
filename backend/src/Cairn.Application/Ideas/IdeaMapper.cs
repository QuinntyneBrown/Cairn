using Cairn.Domain;

namespace Cairn.Application.Ideas;

public static class IdeaMapper
{
    public static IdeaDto ToDto(Idea idea, DateTimeOffset now) => new(
        idea.Id,
        idea.Title,
        idea.Description,
        idea.ResponseType,
        IdeaWindow.StatusOf(idea, now),
        idea.OpensAt,
        idea.ClosesAt,
        idea.Options
            .OrderBy(o => o.SortOrder)
            .Select(o => new IdeaOptionDto(o.Id, o.Label, o.SortOrder))
            .ToList());
}
