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
/// Uses the same .\SQLEXPRESS the app itself uses by default. CI can point it at a
/// containerized SQL Server with CAIRN_TEST_MASTER_CONNECTION_STRING.
/// </summary>
public sealed class TestDatabase : IDisposable
{
    private const string LocalMasterConnectionString =
        "Server=.\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True";

    private readonly string _databaseName = $"Cairn_Test_{Guid.NewGuid():N}";
    private readonly string _masterConnectionString;

    public TestDatabase()
    {
        var configuredMaster = Environment.GetEnvironmentVariable("CAIRN_TEST_MASTER_CONNECTION_STRING");
        var builder = new SqlConnectionStringBuilder(
            string.IsNullOrWhiteSpace(configuredMaster)
                ? LocalMasterConnectionString
                : configuredMaster);

        // The supplied value is a server/login contract. Pin the administrative connection
        // to master, then retain every other setting (including SQL authentication used by
        // the Linux container) for the uniquely named test database.
        builder.InitialCatalog = "master";
        _masterConnectionString = builder.ConnectionString;

        builder.InitialCatalog = _databaseName;
        ConnectionString = builder.ConnectionString;
    }

    public string ConnectionString { get; }

    public void Dispose()
    {
        try
        {
            SqlConnection.ClearAllPools();
            Execute(_masterConnectionString, $"""
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
