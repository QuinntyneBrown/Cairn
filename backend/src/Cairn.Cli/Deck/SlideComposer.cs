using DocumentFormat.OpenXml;
using A = DocumentFormat.OpenXml.Drawing;
using P = DocumentFormat.OpenXml.Presentation;

namespace Cairn.Cli.Deck;

/// <summary>
/// Shape primitives for building slides.
///
/// Everything here is a flat-filled rounded rectangle or a text run — no chart parts. That is
/// not a shortcut: a real ChartPart needs an embedded spreadsheet part and then a fight with
/// PowerPoint's chart style engine to strip the gradients, shadows and gridlines FaithTech's
/// flat aesthetic forbids. Native shapes are less work AND land closer to the brand.
/// </summary>
internal static class SlideComposer
{
    public static P.Shape Rectangle(
        uint id,
        long x,
        long y,
        long width,
        long height,
        string fillHex,
        long cornerRadius = 0)
    {
        var geometry = cornerRadius > 0
            ? new A.PresetGeometry(
                new A.AdjustValueList(new A.ShapeGuide { Name = "adj", Formula = $"val {cornerRadius}" }))
              { Preset = A.ShapeTypeValues.RoundRectangle }
            : new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle };

        return new P.Shape(
            new P.NonVisualShapeProperties(
                new P.NonVisualDrawingProperties { Id = id, Name = $"shape{id}" },
                new P.NonVisualShapeDrawingProperties(),
                new P.ApplicationNonVisualDrawingProperties()),
            new P.ShapeProperties(
                new A.Transform2D(
                    new A.Offset { X = x, Y = y },
                    new A.Extents { Cx = Math.Max(width, 1), Cy = Math.Max(height, 1) }),
                geometry,
                new A.SolidFill(new A.RgbColorModelHex { Val = fillHex }),
                new A.Outline(new A.NoFill())),
            new P.TextBody(new A.BodyProperties(), new A.ListStyle(), new A.Paragraph()));
    }

    public static P.Shape Text(
        uint id,
        long x,
        long y,
        long width,
        long height,
        string text,
        double sizePoints,
        string colorHex,
        bool bold = false,
        string? font = null,
        A.TextAlignmentTypeValues? align = null,
        bool wrap = true,
        A.TextAnchoringTypeValues? anchor = null)
    {
        var paragraphProperties = new A.ParagraphProperties();
        if (align is not null)
        {
            paragraphProperties.Alignment = align;
        }

        var bodyProperties = new A.BodyProperties
        {
            Wrap = wrap ? A.TextWrappingValues.Square : A.TextWrappingValues.None,
            LeftInset = 0,
            RightInset = 0,
            TopInset = 0,
            BottomInset = 0,
            Anchor = anchor ?? A.TextAnchoringTypeValues.Top
        };

        var run = new A.Run(
            new A.RunProperties(
                // Order is significant here: CT_TextCharacterProperties sequences the fill
                // group before the font, and the schema rejects the reverse.
                new A.SolidFill(new A.RgbColorModelHex { Val = colorHex }),

                // Name the font on the run itself so substitution lands where we chose rather
                // than wherever PowerPoint guesses.
                new A.LatinFont { Typeface = font ?? FaithTechBrand.BodyFont })
            {
                Language = "en-CA",
                FontSize = Emu.Points(sizePoints),
                Bold = bold,
                Dirty = false
            },
            new A.Text(text));

        return new P.Shape(
            new P.NonVisualShapeProperties(
                new P.NonVisualDrawingProperties { Id = id, Name = $"text{id}" },
                new P.NonVisualShapeDrawingProperties(new A.ShapeLocks { NoGrouping = true }),
                new P.ApplicationNonVisualDrawingProperties()),
            new P.ShapeProperties(
                new A.Transform2D(
                    new A.Offset { X = x, Y = y },
                    new A.Extents { Cx = Math.Max(width, 1), Cy = Math.Max(height, 1) }),
                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle },
                new A.NoFill()),
            new P.TextBody(bodyProperties, new A.ListStyle(), new A.Paragraph(paragraphProperties, run)));
    }

    public static P.Slide EmptySlide(string backgroundHex)
    {
        var tree = new P.ShapeTree(
            new P.NonVisualGroupShapeProperties(
                new P.NonVisualDrawingProperties { Id = 1U, Name = string.Empty },
                new P.NonVisualGroupShapeDrawingProperties(),
                new P.ApplicationNonVisualDrawingProperties()),
            new P.GroupShapeProperties(new A.TransformGroup()));

        return new P.Slide(
            new P.CommonSlideData(
                new P.Background(
                    new P.BackgroundProperties(
                        new A.SolidFill(new A.RgbColorModelHex { Val = backgroundHex }),
                        new A.EffectList())),
                tree),
            new P.ColorMapOverride(new A.MasterColorMapping()));
    }

    public static void Add(this P.Slide slide, OpenXmlElement shape) =>
        slide.CommonSlideData!.ShapeTree!.AppendChild(shape);
}
