namespace Cairn.Domain;

/// <summary>
/// One recorded sign-in attempt, used to throttle brute force. Cairn is internet-facing and
/// admin passwords are the only gate on the authenticated side, so this is not optional.
/// </summary>
public class SignInAttempt
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public bool Succeeded { get; set; }

    public DateTimeOffset AttemptedAt { get; set; }
}
