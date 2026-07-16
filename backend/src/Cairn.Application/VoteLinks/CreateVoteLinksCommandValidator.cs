using FluentValidation;

namespace Cairn.Application.VoteLinks;

public class CreateVoteLinksCommandValidator : AbstractValidator<CreateVoteLinksCommand>
{
    public CreateVoteLinksCommandValidator()
    {
        RuleFor(x => x.IdeaId).NotEmpty();
    }
}
