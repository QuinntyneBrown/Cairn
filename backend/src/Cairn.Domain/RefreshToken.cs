namespace Cairn.Domain;

public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>SHA-256 hex of the raw token. The raw token is never stored.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// Groups a rotation chain. Presenting an already-consumed token means it leaked, so the
    /// whole family is revoked rather than just that one token.
    /// </summary>
    public Guid FamilyId { get; set; }

    public DateTimeOffset IssuedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ConsumedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
}
