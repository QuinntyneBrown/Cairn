using Microsoft.Data.SqlClient;

namespace Cairn.Acceptance.Fakes;

/// <summary>
/// A uniquely-named database on the local SQL Server, dropped when the fixture disposes.
///
/// SQL Server rather than SQLite, deliberately. Cairn's correctness leans on relational
/// behaviour SQLite either lacks or fakes: composite foreign keys against an alternate key,
/// a multi-branch check constraint, and DateTimeOffset comparison — which the SQLite provider
/// cannot even translate. Testing against a substitute that quietly differs from production
/// would let tests pass on data the real database rejects, which is the exact failure mode
/// the schema was designed to prevent.
///
/// Requires the same .\SQLEXPRESS the app itself uses.
/// </summary>
public sealed class TestDatabase : IDisposable
{
    private const string MasterConnectionString =
        "Server=.\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True";

    private readonly string _databaseName = $"Cairn_Test_{Guid.NewGuid():N}";

    public TestDatabase()
    {
        ConnectionString =
            $"Server=.\\SQLEXPRESS;Database={_databaseName};Trusted_Connection=True;TrustServerCertificate=True";
    }

    public string ConnectionString { get; }

    public void Dispose()
    {
        try
        {
            SqlConnection.ClearAllPools();
            Execute(MasterConnectionString, $"""
                IF DB_ID('{_databaseName}') IS NOT NULL
                BEGIN
                    ALTER DATABASE [{_databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    DROP DATABASE [{_databaseName}];
                END
                """);
        }
        catch (SqlException)
        {
            // A leftover test database is untidy, not a test failure.
        }
    }

    private static void Execute(string connectionString, string sql)
    {
        using var connection = new SqlConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }
}
