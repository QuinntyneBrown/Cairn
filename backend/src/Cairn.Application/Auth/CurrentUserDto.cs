namespace Cairn.Application.Auth;

public record CurrentUserDto(Guid Id, string Email, string DisplayName, string Role);
