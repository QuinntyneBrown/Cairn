using MediatR;

namespace Cairn.Application.Auth;

public record SignInCommand(string Email, string Password) : IRequest<AuthResult>;
