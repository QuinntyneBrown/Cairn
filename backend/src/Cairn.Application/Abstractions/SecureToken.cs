using System.Security.Cryptography;
using System.Text;

namespace Cairn.Application.Abstractions;

/// <summary>
/// Generation and hashing for high-entropy opaque tokens — refresh tokens and vote links use
/// the same primitives.
///
/// SHA-256 rather than BCrypt is deliberate. BCrypt exists to make brute-forcing low-entropy
/// human passwords slow; a 256-bit random token has nothing to brute-force, so slowness buys
/// nothing, and BCrypt's per-row salt would force a table scan where this gets a single
/// indexed seek. Passwords use BCrypt; these do not.
/// </summary>
public static class SecureToken
{
    private const int RawTokenBytes = 32;

    /// <summary>~43 characters of base64url. Unguessable; enumeration is not a live threat.</summary>
    public static string Generate() => Base64UrlEncode(RandomNumberGenerator.GetBytes(RawTokenBytes));

    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
