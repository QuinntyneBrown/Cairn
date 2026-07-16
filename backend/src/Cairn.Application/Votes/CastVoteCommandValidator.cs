using FluentValidation;

namespace Cairn.Application.Votes;

/// <summary>
/// Only the rules that need no database. "Does this answer match the idea's shape" needs the
/// idea, so it lives in the handler via VoteShapeRule.
/// </summary>
public class CastVoteCommandValidator : AbstractValidator<CastVoteCommand>
{
    public CastVoteCommandValidator()
    {
        RuleFor(x => x.IdeaId).NotEmpty();

        RuleFor(x => x)
            .Must(x => CountAnswers(x) == 1)
            .WithMessage("Provide exactly one answer.");
    }

    private static int CountAnswers(CastVoteCommand c) =>
        (c.YesNo.HasValue ? 1 : 0)
        + (c.SelectedOptionId.HasValue ? 1 : 0)
        + (c.Scale.HasValue ? 1 : 0);
}
