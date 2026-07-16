using Cairn.Domain;
using FluentValidation;
using FluentValidation.Results;

namespace Cairn.Application.Votes;

/// <summary>
/// Enforces that a submitted answer matches the shape its idea asked for.
///
/// This lives here, not in the validator, because the rule needs the idea's ResponseType —
/// which means a database read, and async database rules inside FluentValidation are a known
/// footgun that also splits the logic across two places. Being pure and static keeps it
/// unit-testable with no infrastructure at all.
///
/// The database enforces the same invariant via CK_Votes_ShapeMatchesResponseType. That is
/// not redundancy for its own sake: this produces a readable 400, the constraint makes the
/// bad state impossible even if this is ever bypassed.
/// </summary>
public static class VoteShapeRule
{
    public const int ScaleMin = 1;
    public const int ScaleMax = 10;

    public static void Check(ResponseType expected, bool? yesNo, Guid? selectedOptionId, int? scale)
    {
        var failure = expected switch
        {
            ResponseType.YesNo => CheckYesNo(yesNo, selectedOptionId, scale),
            ResponseType.Options => CheckOptions(yesNo, selectedOptionId, scale),
            ResponseType.Scale => CheckScale(yesNo, selectedOptionId, scale),
            _ => "This idea has an unknown response type."
        };

        if (failure is not null)
        {
            throw new ValidationException([new ValidationFailure("Answer", failure)]);
        }
    }

    private static string? CheckYesNo(bool? yesNo, Guid? optionId, int? scale)
    {
        if (yesNo is null)
        {
            return "This idea expects a yes or no answer.";
        }

        return optionId is not null || scale is not null
            ? "This idea expects only a yes or no answer."
            : null;
    }

    private static string? CheckOptions(bool? yesNo, Guid? optionId, int? scale)
    {
        if (optionId is null)
        {
            return "This idea expects one of its options to be selected.";
        }

        return yesNo is not null || scale is not null
            ? "This idea expects only a selected option."
            : null;
    }

    private static string? CheckScale(bool? yesNo, Guid? optionId, int? scale)
    {
        if (scale is null)
        {
            return $"This idea expects a rating from {ScaleMin} to {ScaleMax}.";
        }

        if (scale < ScaleMin || scale > ScaleMax)
        {
            return $"The rating must be between {ScaleMin} and {ScaleMax}.";
        }

        return yesNo is not null || optionId is not null
            ? "This idea expects only a rating."
            : null;
    }
}
