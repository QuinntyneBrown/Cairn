namespace Cairn.Application.Abstractions;

/// <summary>
/// Policy names live here rather than in the API project because the SignalR hub lives in
/// Infrastructure and must name the same policies. Infrastructure cannot reference the API.
/// </summary>
public static class AuthPolicyNames
{
    public const string Admin = "Admin";
    public const string VoteLink = "VoteLink";
    public const string UserOrVoteLink = "UserOrVoteLink";
}
