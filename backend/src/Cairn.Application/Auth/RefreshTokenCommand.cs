using MediatR;

namespace Cairn.Application.Auth;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResult>;
