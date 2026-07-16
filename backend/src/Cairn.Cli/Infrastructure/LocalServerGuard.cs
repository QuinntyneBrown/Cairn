using Microsoft.Data.SqlClient;

namespace Cairn.Cli.Infrastructure;

/// <summary>
/// Refuses destructive commands against anything that is not obviously a local server.
/// The connection string is the CLI's only authority, so nothing else stands between a
/// mistyped config and dropping the real database.
/// </summary>
public static class LocalServerGuard
{
    private static readonly string[] LocalDataSources =
    [
        ".", "(local)", "localhost", "127.0.0.1", "(localdb)"
    ];

    public static bool IsLocal(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return false;
        }

        try
        {
            var dataSource = new SqlConnectionStringBuilder(connectionString).DataSource;
            var server = dataSource.Split('\\', ',')[0].Trim().ToLowerInvariant();

            return LocalDataSources.Contains(server)
                || server.StartsWith("(localdb)", StringComparison.OrdinalIgnoreCase);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
