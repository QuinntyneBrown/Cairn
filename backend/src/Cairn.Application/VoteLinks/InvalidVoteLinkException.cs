namespace Cairn.Application.VoteLinks;

/// <summary>
/// Every failure mode of a vote link — unknown token, expired, revoked, idea deleted —
/// throws this with the same public message. <see cref="Reason"/> is for the server log only:
/// telling a caller which one it was would turn the endpoint into an oracle.
/// </summary>
public class InvalidVoteLinkException(string reason)
    : Exception("This voting link is no longer available.")
{
    public string Reason { get; } = reason;
}
