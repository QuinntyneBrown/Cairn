namespace Cairn.Domain;

public static class Roles
{
    public const string Admin = "Admin";

    /// <summary>
    /// A team lead. Leads usually have no password and vote only through a
    /// <see cref="VoteLink"/>, but the row is a full <see cref="User"/> so a lead can be
    /// given credentials later without a migration.
    /// </summary>
    public const string Lead = "Lead";
}
