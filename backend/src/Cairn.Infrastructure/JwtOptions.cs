namespace Cairn.Infrastructure;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "cairn";

    public string Audience { get; set; } = "cairn";

    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 30;

    /// <summary>
    /// Ceiling on a magic-link session. The effective lifetime is the smaller of this and the
    /// time left until the idea closes.
    /// </summary>
    public int VoteSessionMaxMinutes { get; set; } = 60;
}
