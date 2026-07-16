namespace Cairn.Application.Abstractions;

public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Implementations must return false rather than throw when <paramref name="hash"/> is
    /// empty — passwordless leads exist, and an exception here would surface as a 500 that
    /// also reveals the account exists.
    /// </summary>
    bool Verify(string password, string hash);
}
