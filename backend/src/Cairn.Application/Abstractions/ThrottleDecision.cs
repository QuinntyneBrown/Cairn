namespace Cairn.Application.Abstractions;

public record ThrottleDecision(bool IsLocked, TimeSpan RetryAfter)
{
    public static ThrottleDecision Allow() => new(false, TimeSpan.Zero);

    public static ThrottleDecision Lock(TimeSpan retryAfter) => new(true, retryAfter);
}
