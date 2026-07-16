using Cairn.Application.Votes;
using Cairn.Domain;
using FluentValidation;

namespace Cairn.Acceptance.Votes;

public class VoteShapeRuleTests
{
    private static void Check(ResponseType expected, bool? yesNo = null, Guid? optionId = null, int? scale = null) =>
        VoteShapeRule.Check(expected, yesNo, optionId, scale);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void YesNo_accepts_either_answer(bool answer) =>
        Check(ResponseType.YesNo, yesNo: answer);

    [Fact]
    public void YesNo_rejects_a_missing_answer() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.YesNo));

    [Fact]
    public void YesNo_rejects_a_scale_value_alongside() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.YesNo, yesNo: true, scale: 7));

    [Fact]
    public void YesNo_rejects_an_option_alongside() =>
        Assert.Throws<ValidationException>(() =>
            Check(ResponseType.YesNo, yesNo: true, optionId: Guid.NewGuid()));

    [Fact]
    public void Options_accepts_a_selected_option() =>
        Check(ResponseType.Options, optionId: Guid.NewGuid());

    [Fact]
    public void Options_rejects_a_missing_selection() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.Options));

    [Fact]
    public void Options_rejects_a_yes_no_alongside() =>
        Assert.Throws<ValidationException>(() =>
            Check(ResponseType.Options, yesNo: true, optionId: Guid.NewGuid()));

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    [InlineData(10)]
    public void Scale_accepts_values_within_range(int value) => Check(ResponseType.Scale, scale: value);

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    [InlineData(-1)]
    [InlineData(int.MaxValue)]
    public void Scale_rejects_values_outside_one_to_ten(int value) =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.Scale, scale: value));

    [Fact]
    public void Scale_rejects_a_missing_value() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.Scale));

    [Fact]
    public void Scale_rejects_a_yes_no_alongside() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.Scale, yesNo: false, scale: 5));

    /// <summary>An answer for the wrong shape entirely is the case the check constraint also catches.</summary>
    [Fact]
    public void Scale_rejects_an_answer_shaped_for_a_different_idea() =>
        Assert.Throws<ValidationException>(() => Check(ResponseType.Scale, yesNo: true));
}
