using Cairn.Application.Votes;
using Cairn.Domain;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using A = DocumentFormat.OpenXml.Drawing;
using P = DocumentFormat.OpenXml.Presentation;

namespace Cairn.Cli.Deck;

public class OpenXmlDeckBuilder : IDeckBuilder
{
    private static readonly long Margin = Emu.Inches(0.9);
    private static readonly long ContentWidth = Emu.SlideWidth - (Margin * 2);
    private static readonly long Radius = 14000;

    public void Build(string outputPath, string title, IReadOnlyList<DeckIdea> ideas)
    {
        using var document = PresentationDocument.Create(outputPath, PresentationDocumentType.Presentation);

        var presentationPart = document.AddPresentationPart();
        var layoutPart = PresentationScaffold.Create(presentationPart);

        var slideId = 256U;
        AddSlide(presentationPart, layoutPart, ref slideId, BuildTitleSlide(title, ideas));

        foreach (var idea in ideas)
        {
            AddSlide(presentationPart, layoutPart, ref slideId, BuildResultsSlide(idea));
        }

        presentationPart.Presentation!.Save();
    }

    private static void AddSlide(
        PresentationPart presentationPart,
        SlideLayoutPart layoutPart,
        ref uint slideId,
        P.Slide slide)
    {
        var slidePart = presentationPart.AddNewPart<SlidePart>($"rIdSlide{slideId}");
        slidePart.Slide = slide;
        slidePart.AddPart(layoutPart);

        presentationPart.Presentation!.SlideIdList!.Append(new P.SlideId
        {
            Id = slideId,
            RelationshipId = presentationPart.GetIdOfPart(slidePart)
        });

        slideId++;
    }

    private static P.Slide BuildTitleSlide(string title, IReadOnlyList<DeckIdea> ideas)
    {
        // Warm off-black field with one saturated accent block — the FaithTech title move.
        var slide = SlideComposer.EmptySlide(FaithTechBrand.Dark);
        var id = 2U;

        slide.Add(SlideComposer.Rectangle(
            id++, Margin, Emu.Inches(1.4), Emu.Inches(1.1), Emu.Inches(0.28), FaithTechBrand.Toronto, Radius));

        slide.Add(SlideComposer.Text(
            id++, Margin, Emu.Inches(2.0), ContentWidth, Emu.Inches(2.0),
            title, 44, FaithTechBrand.Light, bold: true, font: FaithTechBrand.HeadingFont));

        var totalVotes = ideas.Sum(i => i.Results.TotalVotes);
        slide.Add(SlideComposer.Text(
            id, Margin, Emu.Inches(4.3), ContentWidth, Emu.Inches(0.5),
            $"{ideas.Count} idea{(ideas.Count == 1 ? "" : "s")} · {totalVotes} vote{(totalVotes == 1 ? "" : "s")} · FaithTech Toronto",
            16, FaithTechBrand.Grey));

        return slide;
    }

    private static P.Slide BuildResultsSlide(DeckIdea idea)
    {
        var slide = SlideComposer.EmptySlide(FaithTechBrand.Light);
        var results = idea.Results;
        var id = 2U;

        // Accent rule, then the question, then the answer. Nothing competes with the title.
        slide.Add(SlideComposer.Rectangle(
            id++, Margin, Emu.Inches(0.6), Emu.Inches(0.9), Emu.Inches(0.16), FaithTechBrand.Toronto, Radius));

        slide.Add(SlideComposer.Text(
            id++, Margin, Emu.Inches(0.95), ContentWidth, Emu.Inches(0.9),
            results.Title, 28, FaithTechBrand.Dark, bold: true, font: FaithTechBrand.HeadingFont));

        slide.Add(SlideComposer.Text(
            id++, Margin, Emu.Inches(1.85), ContentWidth, Emu.Inches(0.3),
            Participation(results), 12, FaithTechBrand.Dark));

        var top = Emu.Inches(2.4);

        switch (results.ResponseType)
        {
            case ResponseType.YesNo:
                id = AddYesNo(slide, id, top, results);
                break;
            case ResponseType.Options:
                id = AddOptions(slide, id, top, results);
                break;
            case ResponseType.Scale:
                id = AddScale(slide, id, top, results);
                break;
        }

        AddComments(slide, id, idea.Comments);
        return slide;
    }

    private static string Participation(IdeaResultsDto r)
    {
        var percent = r.InvitedCount == 0 ? 0 : r.TotalVotes * 100 / r.InvitedCount;
        return $"{r.TotalVotes} of {r.InvitedCount} leads voted · {percent}% participation";
    }

    private static uint AddYesNo(P.Slide slide, uint id, long top, IdeaResultsDto r)
    {
        var yes = r.YesCount ?? 0;
        var no = r.NoCount ?? 0;
        var total = Math.Max(yes + no, 1);
        var barHeight = Emu.Inches(0.85);

        var yesWidth = ContentWidth * yes / total;
        var noWidth = ContentWidth - yesWidth;

        if (yes > 0)
        {
            slide.Add(SlideComposer.Rectangle(id++, Margin, top, yesWidth, barHeight, FaithTechBrand.Green, Radius));
        }

        if (no > 0)
        {
            slide.Add(SlideComposer.Rectangle(
                id++, Margin + yesWidth, top, noWidth, barHeight, FaithTechBrand.Grey, Radius));
        }

        var labelTop = top + barHeight + Emu.Inches(0.3);
        var percentYes = total == 0 ? 0 : yes * 100 / total;

        // Warm off-black on every fill: white on the green is ~3.0:1 and fails AA.
        slide.Add(SlideComposer.Text(
            id++, Margin, labelTop, ContentWidth / 2, Emu.Inches(0.9),
            $"{percentYes}%", 40, FaithTechBrand.TextOnFill, bold: true, font: FaithTechBrand.HeadingFont));

        slide.Add(SlideComposer.Text(
            id++, Margin, labelTop + Emu.Inches(0.85), ContentWidth, Emu.Inches(0.4),
            $"Yes {yes}     No {no}", 16, FaithTechBrand.Dark));

        return id;
    }

    private static uint AddOptions(P.Slide slide, uint id, long top, IdeaResultsDto r)
    {
        var options = r.Options ?? [];
        if (options.Count == 0)
        {
            return id;
        }

        var max = Math.Max(options.Max(o => o.Count), 1);
        var rowHeight = Emu.Inches(0.62);
        var labelWidth = Emu.Inches(3.2);
        var trackWidth = ContentWidth - labelWidth - Emu.Inches(0.7);

        foreach (var option in options)
        {
            slide.Add(SlideComposer.Text(
                id++, Margin, top + Emu.Inches(0.1), labelWidth, Emu.Inches(0.4),
                option.Label, 14, FaithTechBrand.Dark, wrap: false));

            // The empty track keeps every row the same length, so bars read as proportions
            // rather than as arbitrary lengths.
            slide.Add(SlideComposer.Rectangle(
                id++, Margin + labelWidth, top, trackWidth, Emu.Inches(0.42), FaithTechBrand.Grey, Radius));

            var barWidth = trackWidth * option.Count / max;
            if (barWidth > 0)
            {
                slide.Add(SlideComposer.Rectangle(
                    id++, Margin + labelWidth, top, barWidth, Emu.Inches(0.42), FaithTechBrand.Toronto, Radius));
            }

            slide.Add(SlideComposer.Text(
                id++, Margin + labelWidth + trackWidth + Emu.Inches(0.15), top + Emu.Inches(0.06),
                Emu.Inches(0.5), Emu.Inches(0.4),
                option.Count.ToString(), 14, FaithTechBrand.Dark, bold: true, wrap: false));

            top += rowHeight;
        }

        return id;
    }

    private static uint AddScale(P.Slide slide, uint id, long top, IdeaResultsDto r)
    {
        if (r.Scale is null)
        {
            return id;
        }

        var buckets = r.Scale.Distribution;
        var max = Math.Max(buckets.Count == 0 ? 1 : buckets.Max(b => b.Count), 1);
        var columnWidth = ContentWidth / Math.Max(buckets.Count, 1);
        var gap = Emu.Inches(0.06);
        var maxHeight = Emu.Inches(2.0);
        var baseline = top + maxHeight;

        foreach (var (bucket, index) in buckets.Select((b, i) => (b, i)))
        {
            var x = Margin + (columnWidth * index);
            var height = Math.Max(maxHeight * bucket.Count / max, Emu.Inches(0.04));

            slide.Add(SlideComposer.Rectangle(
                id++, x + gap, baseline - height, columnWidth - (gap * 2), height,
                bucket.Count == 0 ? FaithTechBrand.Grey : FaithTechBrand.Toronto, Radius));

            slide.Add(SlideComposer.Text(
                id++, x, baseline + Emu.Inches(0.1), columnWidth, Emu.Inches(0.3),
                bucket.Value.ToString(), 12, FaithTechBrand.Dark,
                align: A.TextAlignmentTypeValues.Center, wrap: false));
        }

        slide.Add(SlideComposer.Text(
            id++, Margin, baseline + Emu.Inches(0.55), ContentWidth, Emu.Inches(0.8),
            $"Average {r.Scale.Average:0.0} / 10", 32, FaithTechBrand.Orange,
            bold: true, font: FaithTechBrand.HeadingFont));

        return id;
    }

    private static void AddComments(P.Slide slide, uint id, IReadOnlyList<Cairn.Application.Comments.CommentDto> comments)
    {
        var selected = comments.Take(3).ToList();
        if (selected.Count == 0)
        {
            return;
        }

        var top = Emu.Inches(5.55);
        var cardWidth = (ContentWidth - (Emu.Inches(0.2) * (selected.Count - 1))) / selected.Count;

        foreach (var (comment, index) in selected.Select((c, i) => (c, i)))
        {
            var x = Margin + ((cardWidth + Emu.Inches(0.2)) * index);

            slide.Add(SlideComposer.Rectangle(
                id++, x, top, cardWidth, Emu.Inches(0.95), FaithTechBrand.Grey, Radius));

            slide.Add(SlideComposer.Text(
                id++, x + Emu.Inches(0.18), top + Emu.Inches(0.12),
                cardWidth - Emu.Inches(0.36), Emu.Inches(0.5),
                Truncate(comment.Body, 110), 9, FaithTechBrand.Dark));

            slide.Add(SlideComposer.Text(
                id++, x + Emu.Inches(0.18), top + Emu.Inches(0.68),
                cardWidth - Emu.Inches(0.36), Emu.Inches(0.22),
                comment.AuthorName, 8, FaithTechBrand.Dark, bold: true, wrap: false));
        }
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";
}
