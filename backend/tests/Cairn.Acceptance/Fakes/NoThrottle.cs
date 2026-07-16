using Cairn.Application.Abstractions;

namespace Cairn.Acceptance.Fakes;

/// <summary>Lets sign-in tests exercise credential logic without tripping the lockout.</summary>
public class NoThrottle : ISignInThrottle
{
    public Task<ThrottleDecision> CheckAsync(string email, CancellationToken cancellationToken) =>
        Task.FromResult(ThrottleDecision.Allow());

    public Task RecordAttemptAsync(string email, bool success, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
