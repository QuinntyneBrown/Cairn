using MediatR;

namespace Cairn.Application.Auth;

public record RegisterCommand(string Email, string DisplayName, string Password) : IRequest<AuthResult>;
