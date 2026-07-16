using Cairn.Application.Abstractions;
using Cairn.Cli.Output;
using Cairn.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Cli.Infrastructure;

/// <summary>
/// Opens a DI scope for one command and resolves what a command needs.
///
/// The scope is not optional. AppDbContext — and therefore every MediatR handler — is scoped;
/// resolving IMediator straight off the root provider either throws or roots a DbContext for
/// the life of the process. Funnelling every command through here means no command can forget.
/// </summary>
public sealed class CliScope : IAsyncDisposable
{
    private readonly IServiceScope _scope;

    private CliScope(IServiceScope scope)
    {
        _scope = scope;
        Mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        Console = scope.ServiceProvider.GetRequiredService<IConsoleWriter>();
        Db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        Clock = scope.ServiceProvider.GetRequiredService<IClock>();
        Hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    }

    public IMediator Mediator { get; }

    public IConsoleWriter Console { get; }

    public IAppDbContext Db { get; }

    public IClock Clock { get; }

    public IPasswordHasher Hasher { get; }

    public T Resolve<T>() where T : notnull => _scope.ServiceProvider.GetRequiredService<T>();

    public static CliScope Create(IServiceProvider services) => new(services.CreateScope());

    /// <summary>
    /// Acts as an existing admin so handlers that stamp CreatedByUserId have a real user to
    /// point at. Falls back to any user when no admin exists yet, and to nothing at all on an
    /// empty database — commands that need an identity fail with a readable message rather
    /// than a foreign-key error.
    /// </summary>
    public async Task<bool> ActAsAdminAsync(CancellationToken cancellationToken)
    {
        var identity = (CliCurrentUser)_scope.ServiceProvider.GetRequiredService<ICurrentUser>();

        var admin = await Db.Users
            .OrderBy(u => u.Role == Roles.Admin ? 0 : 1)
            .ThenBy(u => u.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (admin is null)
        {
            Console.Error("No users exist yet. Run 'cairn db seed' or 'cairn lead create' first.");
            return false;
        }

        identity.UserId = admin.Id;
        identity.Role = admin.Role;
        return true;
    }

    public ValueTask DisposeAsync()
    {
        _scope.Dispose();
        return ValueTask.CompletedTask;
    }
}
