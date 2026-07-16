using FluentValidation;

namespace Cairn.Application.VoteLinks;

public class RedeemVoteLinkCommandValidator : AbstractValidator<RedeemVoteLinkCommand>
{
    public RedeemVoteLinkCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(200);
    }
}
