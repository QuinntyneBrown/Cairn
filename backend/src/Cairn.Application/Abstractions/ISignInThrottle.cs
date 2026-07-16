namespace Cairn.Application.Abstractions;

public interface ISignInThrottle
{
    Task<ThrottleDecision> CheckAsync(string email, CancellationToken cancellationToken);

    Task RecordAttemptAsync(string email, bool success, CancellationToken cancellationToken);
}
