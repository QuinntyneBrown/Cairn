using Cairn.Application.Abstractions;
using Cairn.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Cairn.Acceptance.Fakes;

/// <summary>
/// Boots the real API — real authentication, real authorization policies, real middleware —
/// against a throwaway SQL Server database. The authorization behaviour these tests assert
/// lives entirely in the HTTP pipeline, so exercising handlers directly would prove nothing
/// about it.
/// </summary>
public class CairnApiFactory : WebApplicationFactory<Program>
{
    private readonly TestDatabase _database = new();

    static CairnApiFactory()
    {
        // Program.cs reads and validates the signing key during CreateBuilder — before the
        // factory's ConfigureAppConfiguration callbacks run — so in-memory config arrives too
        // late. Environment variables are read by the default AddEnvironmentVariables()
        // source, which is early enough.
        SetIfMissing("Jwt__Issuer", "cairn-tests");
        SetIfMissing("Jwt__Audience", "cairn-tests");
        SetIfMissing("Jwt__SigningKey", "test-signing-key-that-is-long-enough-to-pass-validation");
        SetIfMissing("Jwt__AccessTokenMinutes", "30");
        SetIfMissing("Jwt__VoteSessionMaxMinutes", "60");
        SetIfMissing("VoteLink__BaseUrl", "https://cairn.test");
    }

    private static void SetIfMissing(string key, string value)
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }

    /// <summary>
    /// Anchored to real time, not a fixed literal. JwtBearer validates token lifetime against
    /// the system clock, which no fake can move — a fake clock hours away from now would make
    /// every issued token look expired and turn 403s into 401s.
    ///
    /// Tests stay deterministic by advancing this relative to its start. Advancing past an
    /// idea's close while the real clock stands still is exactly the scenario worth proving:
    /// the client still holds a valid session, and the server refuses the vote anyway.
    /// </summary>
    public FakeClock Clock { get; } = new(DateTimeOffset.UtcNow);

    public RecordingVotingNotifier Notifier { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // AddDbContext registers more than DbContextOptions<T>: EF Core 10 also adds
            // IDbContextOptionsConfiguration<T>, which carries the original UseSqlServer
            // call. Leaving it behind means two provider registrations and EF refuses to start.
            foreach (var descriptor in services
                         .Where(d => d.ServiceType.FullName?.Contains("DbContextOptions") == true
                                     || d.ServiceType == typeof(AppDbContext))
                         .ToList())
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseSqlServer(_database.ConnectionString));

            // Deterministic time, so "after the idea closed" is a fact rather than a sleep.
            services.RemoveAll<IClock>();
            services.AddSingleton<IClock>(Clock);

            // Capture broadcasts instead of opening real WebSockets.
            services.RemoveAll<IVotingNotifier>();
            services.AddSingleton<IVotingNotifier>(Notifier);

            // The closure service would otherwise tick against the test database mid-test.
            services.RemoveAll<IHostedService>();

            using var scope = services.BuildServiceProvider().CreateScope();
            scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _database.Dispose();
        }
    }
}
