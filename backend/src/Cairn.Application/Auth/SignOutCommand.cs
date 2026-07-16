using MediatR;

namespace Cairn.Application.Auth;

public record SignOutCommand(string RefreshToken) : IRequest;
