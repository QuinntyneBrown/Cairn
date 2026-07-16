using Cairn.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Acceptance.Fakes;

/// <summary>
/// A throwaway database plus a context, for tests that exercise a handler directly without
/// the HTTP pipeline. See <see cref="TestDatabase"/> for why this is real SQL Server rather
/// than SQLite or the InMemory provider.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly TestDatabase _database = new();

    public TestDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_database.ConnectionString)
            .Options;

        Context = new AppDbContext(options);
        Context.Database.EnsureCreated();
    }

    public AppDbContext Context { get; }

    public void Dispose()
    {
        Context.Dispose();
        _database.Dispose();
    }
}
