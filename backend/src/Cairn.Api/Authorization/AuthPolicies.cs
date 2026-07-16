using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.AspNetCore.Authorization;

namespace Cairn.Api.Authorization;

public static class AuthPolicies
{
    /// <summary>Requires a full signed-in session (scope=user) and the Admin role.</summary>
    public const string Admin = AuthPolicyNames.Admin;

    /// <summary>Requires a magic-link session (scope=vote), confined to one idea.</summary>
    public const string VoteLink = AuthPolicyNames.VoteLink;

    /// <summary>Either kind of session. Used by the hub and by commenting.</summary>
    public const string UserOrVoteLink = AuthPolicyNames.UserOrVoteLink;

    public static void AddCairnPolicies(this AuthorizationOptions options)
    {
        // The most important line in the authorization setup.
        //
        // A vote-link token's "sub" is a real user id. If the default policy accepted it,
        // every bare [Authorize] in the app would treat a magic link as a full account
        // session for that lead. Requiring scope=user by default means vote-link tokens are
        // rejected everywhere unless an endpoint explicitly opts in via the VoteLink or
        // UserOrVoteLink policy — so forgetting an attribute fails closed, not open.
        options.DefaultPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .RequireClaim(AuthScopes.ClaimType, AuthScopes.User)
            .Build();

        options.FallbackPolicy = null;

        options.AddPolicy(Admin, policy => policy
            .RequireAuthenticatedUser()
            .RequireClaim(AuthScopes.ClaimType, AuthScopes.User)
            .RequireRole(Roles.Admin));

        options.AddPolicy(VoteLink, policy => policy
            .RequireAuthenticatedUser()
            .RequireClaim(AuthScopes.ClaimType, AuthScopes.Vote));

        options.AddPolicy(UserOrVoteLink, policy => policy
            .RequireAuthenticatedUser()
            .RequireClaim(AuthScopes.ClaimType, AuthScopes.User, AuthScopes.Vote));
    }
}
