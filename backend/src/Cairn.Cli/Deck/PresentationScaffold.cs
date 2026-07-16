using DocumentFormat.OpenXml.Packaging;
using A = DocumentFormat.OpenXml.Drawing;
using P = DocumentFormat.OpenXml.Presentation;

namespace Cairn.Cli.Deck;

/// <summary>
/// Builds the slide master, layout and theme in code rather than opening a hand-authored
/// template. The palette therefore lives in source next to everything else, and generating a
/// deck needs no binary asset checked in beside it.
///
/// Slides are added from the layout with AddNewPart + AddPart. Cloning an existing slide —
/// the other obvious approach — means deep-copying parts and remapping every relationship id,
/// which is the classic OpenXML tarpit.
/// </summary>
internal static class PresentationScaffold
{
    public static SlideLayoutPart Create(PresentationPart presentationPart)
    {
        presentationPart.Presentation = new P.Presentation();

        var masterPart = presentationPart.AddNewPart<SlideMasterPart>("rIdMaster");
        masterPart.SlideMaster = new P.SlideMaster(
            EmptyCommonSlideData(),
            DefaultColorMap(),
            new P.SlideLayoutIdList());

        var themePart = masterPart.AddNewPart<ThemePart>("rIdTheme");
        themePart.Theme = BuildTheme();

        var layoutPart = masterPart.AddNewPart<SlideLayoutPart>("rIdLayout");
        layoutPart.SlideLayout = new P.SlideLayout(
            EmptyCommonSlideData("Blank"),
            new P.ColorMapOverride(new A.MasterColorMapping()))
        {
            Type = P.SlideLayoutValues.Blank,
            Preserve = true
        };

        masterPart.SlideMaster.SlideLayoutIdList!.Append(new P.SlideLayoutId
        {
            Id = 2147483649U,
            RelationshipId = masterPart.GetIdOfPart(layoutPart)
        });

        // Order is fixed by the schema: masters, slides, size, notes size.
        presentationPart.Presentation.Append(
            new P.SlideMasterIdList(new P.SlideMasterId
            {
                Id = 2147483648U,
                RelationshipId = presentationPart.GetIdOfPart(masterPart)
            }),
            new P.SlideIdList(),
            new P.SlideSize { Cx = (int)Emu.SlideWidth, Cy = (int)Emu.SlideHeight },
            new P.NotesSize { Cx = Emu.SlideHeight, Cy = Emu.SlideWidth });

        return layoutPart;
    }

    private static P.CommonSlideData EmptyCommonSlideData(string? name = null)
    {
        var data = new P.CommonSlideData(new P.ShapeTree(
            new P.NonVisualGroupShapeProperties(
                new P.NonVisualDrawingProperties { Id = 1U, Name = string.Empty },
                new P.NonVisualGroupShapeDrawingProperties(),
                new P.ApplicationNonVisualDrawingProperties()),
            new P.GroupShapeProperties(new A.TransformGroup())));

        if (name is not null)
        {
            data.Name = name;
        }

        return data;
    }

    private static P.ColorMap DefaultColorMap() => new()
    {
        Background1 = A.ColorSchemeIndexValues.Light1,
        Text1 = A.ColorSchemeIndexValues.Dark1,
        Background2 = A.ColorSchemeIndexValues.Light2,
        Text2 = A.ColorSchemeIndexValues.Dark2,
        Accent1 = A.ColorSchemeIndexValues.Accent1,
        Accent2 = A.ColorSchemeIndexValues.Accent2,
        Accent3 = A.ColorSchemeIndexValues.Accent3,
        Accent4 = A.ColorSchemeIndexValues.Accent4,
        Accent5 = A.ColorSchemeIndexValues.Accent5,
        Accent6 = A.ColorSchemeIndexValues.Accent6,
        Hyperlink = A.ColorSchemeIndexValues.Hyperlink,
        FollowedHyperlink = A.ColorSchemeIndexValues.FollowedHyperlink
    };

    /// <summary>
    /// The theme's colour slots carry the FaithTech palette, so anything resolved through
    /// schemeClr — including PowerPoint's own UI when someone edits the deck afterwards —
    /// offers on-brand colours rather than Office blue.
    /// </summary>
    private static A.Theme BuildTheme() => new(
        new A.ThemeElements(
            new A.ColorScheme(
                new A.Dark1Color(new A.RgbColorModelHex { Val = FaithTechBrand.Dark }),
                new A.Light1Color(new A.RgbColorModelHex { Val = FaithTechBrand.Light }),
                new A.Dark2Color(new A.RgbColorModelHex { Val = FaithTechBrand.Dark }),
                new A.Light2Color(new A.RgbColorModelHex { Val = FaithTechBrand.Grey }),
                new A.Accent1Color(new A.RgbColorModelHex { Val = FaithTechBrand.Toronto }),
                new A.Accent2Color(new A.RgbColorModelHex { Val = FaithTechBrand.Orange }),
                new A.Accent3Color(new A.RgbColorModelHex { Val = FaithTechBrand.Green }),
                new A.Accent4Color(new A.RgbColorModelHex { Val = FaithTechBrand.Red }),
                new A.Accent5Color(new A.RgbColorModelHex { Val = "1D8FB9" }),
                new A.Accent6Color(new A.RgbColorModelHex { Val = FaithTechBrand.Grey }),
                new A.Hyperlink(new A.RgbColorModelHex { Val = "1D8FB9" }),
                new A.FollowedHyperlinkColor(new A.RgbColorModelHex { Val = FaithTechBrand.Dark }))
            { Name = "FaithTech" },
            new A.FontScheme(
                new A.MajorFont(
                    new A.LatinFont { Typeface = FaithTechBrand.HeadingFont },
                    new A.EastAsianFont { Typeface = string.Empty },
                    new A.ComplexScriptFont { Typeface = string.Empty }),
                new A.MinorFont(
                    new A.LatinFont { Typeface = FaithTechBrand.BodyFont },
                    new A.EastAsianFont { Typeface = string.Empty },
                    new A.ComplexScriptFont { Typeface = string.Empty }))
            { Name = "FaithTech" },
            BuildFormatScheme()),
        new A.ObjectDefaults(),
        new A.ExtraColorSchemeList())
    {
        Name = "FaithTech"
    };

    /// <summary>
    /// Flat fills, no gradients, no shadows — the brand forbids all three, and it happens to
    /// make this the simplest legal format scheme rather than the most elaborate one. The
    /// schema requires exactly three entries in each list.
    /// </summary>
    private static A.FormatScheme BuildFormatScheme() => new(
        new A.FillStyleList(
            SolidFill(), SolidFill(), SolidFill()),
        new A.LineStyleList(
            SolidLine(6350), SolidLine(12700), SolidLine(19050)),
        new A.EffectStyleList(
            new A.EffectStyle(new A.EffectList()),
            new A.EffectStyle(new A.EffectList()),
            new A.EffectStyle(new A.EffectList())),
        new A.BackgroundFillStyleList(
            SolidFill(), SolidFill(), SolidFill()))
    {
        Name = "FaithTech"
    };

    private static A.SolidFill SolidFill() =>
        new(new A.SchemeColor(new A.Tint { Val = 100000 }) { Val = A.SchemeColorValues.PhColor });

    private static A.Outline SolidLine(int width) => new(
        new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
        new A.PresetDash { Val = A.PresetLineDashValues.Solid })
    {
        Width = width,
        CapType = A.LineCapValues.Flat,
        CompoundLineType = A.CompoundLineValues.Single,
        Alignment = A.PenAlignmentValues.Center
    };
}
