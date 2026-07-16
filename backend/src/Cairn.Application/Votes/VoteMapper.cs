using Cairn.Domain;

namespace Cairn.Application.Votes;

public static class VoteMapper
{
    public static VoteDto ToDto(Vote vote) => new(
        vote.IdeaId,
        vote.ResponseType,
        vote.YesNoValue,
        vote.SelectedOptionId,
        vote.ScaleValue,
        vote.UpdatedAt);
}
