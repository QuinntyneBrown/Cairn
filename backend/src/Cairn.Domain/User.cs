namespace Cairn.Domain;

public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Empty for passwordless leads. Callers must check for empty before handing this to
    /// BCrypt — verifying against an empty hash throws rather than returning false.
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = Roles.Lead;

    public DateTimeOffset CreatedAt { get; set; }
}
