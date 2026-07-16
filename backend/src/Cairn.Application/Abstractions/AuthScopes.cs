namespace Cairn.Application.Abstractions;

/// <summary>
/// Values of the "scope" claim. This claim is what separates a full account session from a
/// magic link: a vote-link token's subject is a real user id, so if scope is not checked, a
/// voting link silently becomes a full session for that lead.
/// </summary>
public static class AuthScopes
{
    public const string User = "user";
    public const string Vote = "vote";

    public const string ClaimType = "scope";
    public const string IdeaClaimType = "idea_id";
}
