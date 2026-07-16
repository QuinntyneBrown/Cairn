namespace Cairn.Domain;

/// <summary>
/// A scoped capability to vote on one idea as one lead, without signing in. Not an
/// invitation to join anything — the name matters because the security model follows it.
/// One row per (IdeaId, UserId); regenerating rotates <see cref="TokenHash"/> in place
/// rather than inserting, which keeps that pair unique and kills the old URL immediately.
/// </summary>
public class VoteLink
{
    public Guid Id { get; set; }

    public Guid IdeaId { get; set; }

    public Guid UserId { get; set; }

    /// <summary>
    /// SHA-256 hex of the raw token. SHA-256 rather than BCrypt because the token is 256
    /// bits of entropy — there is nothing to brute-force, and BCrypt's per-row salt would
    /// force a table scan instead of an indexed seek.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
}
