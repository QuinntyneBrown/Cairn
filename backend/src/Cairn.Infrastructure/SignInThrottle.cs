using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Infrastructure;

/// <summary>
/// Per-email sliding-window lockout. Cairn is internet-facing and admin passwords are the
/// only gate on the authenticated side, so this is load-bearing rather than decorative.
/// </summary>
public class SignInThrottle(IAppDbContext db, IClock clock) : ISignInThrottle
{
    private const int MaxFailures = 5;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    public async Task<ThrottleDecision> CheckAsync(string email, CancellationToken cancellationToken)
    {
        var since = clock.UtcNow - Window;

        var recent = await db.SignInAttempts
            .Where(a => a.Email == email && a.AttemptedAt >= since)
            .OrderByDescending(a => a.AttemptedAt)
            .Take(MaxFailures)
            .ToListAsync(cancellationToken);

        // A success inside the window clears the streak.
        if (recent.Count < MaxFailures || recent.Any(a => a.Succeeded))
        {
            return ThrottleDecision.Allow();
        }

        var oldest = recent.Min(a => a.AttemptedAt);
        var retryAfter = oldest.Add(Window) - clock.UtcNow;

        return retryAfter > TimeSpan.Zero
            ? ThrottleDecision.Lock(retryAfter)
            : ThrottleDecision.Allow();
    }

    public async Task RecordAttemptAsync(string email, bool success, CancellationToken cancellationToken)
    {
        db.SignInAttempts.Add(new SignInAttempt
        {
            Id = Guid.NewGuid(),
            Email = email,
            Succeeded = success,
            AttemptedAt = clock.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
