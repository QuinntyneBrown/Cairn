namespace Cairn.Cli.Deck;

/// <summary>
/// English Metric Units — OpenXML's unit for everything positional. Arithmetic, not
/// archaeology: 914400 per inch, 12700 per point.
/// </summary>
internal static class Emu
{
    public const long PerInch = 914400L;

    /// <summary>16:9 at 13.333in x 7.5in — the modern default. 4:3 would look dated.</summary>
    public const long SlideWidth = 12192000L;

    public const long SlideHeight = 6858000L;

    public static long Inches(double value) => (long)(value * PerInch);

    /// <summary>Font sizes in OpenXML are hundredths of a point.</summary>
    public static int Points(double value) => (int)(value * 100);
}
