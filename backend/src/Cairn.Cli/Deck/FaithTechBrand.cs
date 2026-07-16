namespace Cairn.Cli.Deck;

/// <summary>
/// FaithTech's palette, taken from their live stylesheet rather than guessed. Hex without the
/// leading '#', which is the form OpenXML's srgbClr wants.
/// </summary>
internal static class FaithTechBrand
{
    /// <summary>Warm near-black. The dominant brand colour — not true black.</summary>
    public const string Dark = "16160C";

    public const string Light = "FFFFFF";

    /// <summary>FaithTech Toronto's assigned city colour. The accent.</summary>
    public const string Toronto = "FFF737";

    public const string Orange = "FFB300";

    public const string Red = "F05228";

    public const string Green = "32A432";

    public const string Grey = "E9E7E4";

    /// <summary>
    /// Text on any saturated fill. Toronto yellow is ~1.1:1 against white and the green is
    /// ~3.0:1, so light text on either fails contrast. Warm off-black works on all of them.
    /// </summary>
    public const string TextOnFill = Dark;

    /// <summary>
    /// Noi Grotesk is FaithTech's display face, but it is commercial and cannot be embedded
    /// in a file we hand around — the licence would not cover redistributing it inside every
    /// generated deck. Inter is free, close enough at display weights, and is named on the
    /// runs themselves so PowerPoint substitutes where we choose rather than where it guesses.
    /// </summary>
    public const string HeadingFont = "Inter";

    public const string BodyFont = "Inter";
}
