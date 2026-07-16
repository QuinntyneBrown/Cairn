using Cairn.Application.Abstractions;
using Cairn.Infrastructure.Deferred;
using Cairn.Infrastructure.Realtime;
using Cairn.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCairnInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<VoteLinkOptions>(configuration.GetSection(VoteLinkOptions.SectionName));

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IJwtTokenIssuer, JwtTokenIssuer>();
        services.AddScoped<IVoteSessionTokenIssuer, VoteSessionTokenIssuer>();
        services.AddScoped<IRefreshTokenStore, RefreshTokenStore>();
        services.AddScoped<ISignInThrottle, SignInThrottle>();
        services.AddScoped<IVoteLinkUrlBuilder, VoteLinkUrlBuilder>();
        services.AddScoped<IVoteLinkSender, LoggingVoteLinkSender>();
        services.AddScoped<DevDataSeeder>();

        return services;
    }

    /// <summary>
    /// Registrations that need an HTTP request. The CLI runs the same handlers without one,
    /// so it deliberately does not call this.
    /// </summary>
    public static IServiceCollection AddCairnHttpInfrastructure(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpContextCurrentUser>();
        services.AddScoped<IVotingNotifier, SignalRVotingNotifier>();

        return services;
    }
}
