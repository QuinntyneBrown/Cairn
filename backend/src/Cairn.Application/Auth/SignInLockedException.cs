namespace Cairn.Application.Auth;

public class SignInLockedException(TimeSpan retryAfter)
    : Exception("Too many sign-in attempts. Try again later.")
{
    public TimeSpan RetryAfter { get; } = retryAfter;
}
