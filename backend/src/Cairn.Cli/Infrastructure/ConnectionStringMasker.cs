using System.Text.RegularExpressions;

namespace Cairn.Cli.Infrastructure;

public static partial class ConnectionStringMasker
{
    /// <summary>
    /// Hides the password so 'cairn config show' can be pasted into a chat when something is
    /// misconfigured. Integrated auth has no password to hide, but SQL auth does.
    /// </summary>
    public static string Mask(string? connectionString) =>
        string.IsNullOrWhiteSpace(connectionString)
            ? "(not configured)"
            : PasswordPattern().Replace(connectionString, "$1=*****");

    [GeneratedRegex(@"(?i)\b(password|pwd)\s*=\s*[^;]*")]
    private static partial Regex PasswordPattern();
}
