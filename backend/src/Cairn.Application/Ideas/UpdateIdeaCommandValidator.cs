using Cairn.Domain;
using FluentValidation;

namespace Cairn.Application.Ideas;

public class UpdateIdeaCommandValidator : AbstractValidator<UpdateIdeaCommand>
{
    public UpdateIdeaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.ResponseType).IsInEnum();
        RuleFor(x => x.ClosesAt)
            .GreaterThan(x => x.OpensAt)
            .WithMessage("Voting must close after it opens.");

        When(x => x.ResponseType == ResponseType.Options, () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o.Count >= 2)
                .WithMessage("An options idea needs at least two choices.");
            RuleForEach(x => x.Options).NotEmpty().MaximumLength(200);
        });

        When(x => x.ResponseType != ResponseType.Options, () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o.Count == 0)
                .WithMessage("Only an options idea can define choices.");
        });
    }
}
