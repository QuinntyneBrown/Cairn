namespace Cairn.Application.Auth;

public record AuthResult(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    string Email,
    string DisplayName,
    string Role);
