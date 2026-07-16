using Cairn.Application.Comments;
using Cairn.Application.Ideas;
using Cairn.Application.Votes;
using Cairn.Cli.Deck;
using Cairn.Domain;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

namespace Cairn.Acceptance.Deck;

/// <summary>
/// A .pptx that opens is not the same as a .pptx that is valid — PowerPoint repairs plenty of
/// malformed files silently, and the ones it cannot repair it refuses with no explanation.
/// The SDK's validator is the only cheap way to know which one was written.
/// </summary>
public class OpenXmlDeckBuilderTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 16, 12, 0, 0, TimeSpan.Zero);

    private static IdeaResultsDto YesNo() => new(
        Guid.NewGuid(), "Run a Build Night in September", ResponseType.YesNo, IdeaStatus.Closed,
        Now, TotalVotes: 6, InvitedCount: 8, YesCount: 5, NoCount: 1, Options: null, Scale: null);

    private static IdeaResultsDto Options() => new(
        Guid.NewGuid(), "Which cause should the next hackathon serve?", ResponseType.Options,
        IdeaStatus.Closed, Now, TotalVotes: 7, InvitedCount: 8, YesCount: null, NoCount: null,
        Options:
        [
            new OptionTallyDto(Guid.NewGuid(), "Newcomer settlement services", 1),
            new OptionTallyDto(Guid.NewGuid(), "Food bank logistics", 2),
            new OptionTallyDto(Guid.NewGuid(), "Church accessibility tooling", 3),
            new OptionTallyDto(Guid.NewGuid(), "Youth mentorship matching", 1)
        ],
        Scale: null);

    private static IdeaResultsDto Scale(params int[] counts) => new(
        Guid.NewGuid(), "How ready are we to host a regional gathering?", ResponseType.Scale,
        IdeaStatus.Closed, Now, TotalVotes: counts.Sum(), InvitedCount: 8, YesCount: null,
        NoCount: null, Options: null,
        Scale: new ScaleSummaryDto(
            6.5,
            counts.Select((c, i) => new ScaleBucketDto(i + 1, c)).ToList()));

    private static CommentDto Comment(string body) =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Ada Osei", body, Now);

    /// <summary>
    /// Returns rendered messages, not ValidationErrorInfo. Its Path property resolves lazily
    /// against the package, so reading it after the document closes throws and hides the very
    /// errors the test exists to report.
    /// </summary>
    private static IReadOnlyList<string> Validate(string path)
    {
        using var document = PresentationDocument.Open(path, false);
        return new OpenXmlValidator()
            .Validate(document)
            .Select(e => $"{e.Path?.XPath} :: {e.Description}")
            .ToList();
    }

    private static string TempPath() =>
        Path.Combine(Path.GetTempPath(), $"cairn-deck-{Guid.NewGuid():N}.pptx");

    [Fact]
    public void A_deck_covering_every_response_type_is_schema_valid()
    {
        var path = TempPath();
        try
        {
            new OpenXmlDeckBuilder().Build(path, "Where we landed",
            [
                new DeckIdea(YesNo(), [Comment("Strongly in favour, if we can lock a venue.")]),
                new DeckIdea(Options(), [Comment("Talk to the partner org first."), Comment("Agreed.")]),
                new DeckIdea(Scale(0, 0, 0, 0, 2, 1, 2, 0, 1, 0), [])
            ]);

            var errors = Validate(path);

            Assert.True(
                errors.Count == 0,
                "The generated deck is not schema-valid:\n  " + string.Join("\n  ", errors));
        }
        finally
        {
            File.Delete(path);
        }
    }

    /// <summary>Every idea gets one slide, plus the title slide.</summary>
    [Fact]
    public void The_deck_has_one_slide_per_idea_plus_a_title_slide()
    {
        var path = TempPath();
        try
        {
            new OpenXmlDeckBuilder().Build(path, "Where we landed",
            [
                new DeckIdea(YesNo(), []),
                new DeckIdea(Options(), [])
            ]);

            using var document = PresentationDocument.Open(path, false);
            Assert.Equal(3, document.PresentationPart!.SlideParts.Count());
        }
        finally
        {
            File.Delete(path);
        }
    }

    /// <summary>
    /// Zero votes is a real case — an idea can close with nobody responding. Division by the
    /// total is the obvious way to write every one of these visuals.
    /// </summary>
    [Fact]
    public void A_deck_for_an_idea_with_no_votes_is_still_valid()
    {
        var path = TempPath();
        try
        {
            var empty = YesNo() with { TotalVotes = 0, InvitedCount = 0, YesCount = 0, NoCount = 0 };
            var emptyScale = Scale(0, 0, 0, 0, 0, 0, 0, 0, 0, 0) with { TotalVotes = 0, InvitedCount = 0 };

            new OpenXmlDeckBuilder().Build(path, "Nobody voted",
            [
                new DeckIdea(empty, []),
                new DeckIdea(emptyScale, [])
            ]);

            var errors = Validate(path);
            Assert.True(errors.Count == 0, string.Join("\n  ", errors));
        }
        finally
        {
            File.Delete(path);
        }
    }
}
