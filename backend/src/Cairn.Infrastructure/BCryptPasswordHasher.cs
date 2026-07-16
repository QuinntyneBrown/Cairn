using Cairn.Application.Abstractions;

namespace Cairn.Infrastructure;

public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string hash)
    {
        // BCrypt throws SaltParseException on an empty or malformed hash rather than
        // returning false. Passwordless leads have an empty hash, so this guard is what keeps
        // a sign-in attempt against one a 401 instead of a 500 that confirms the account.
        if (string.IsNullOrEmpty(hash))
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }
}
