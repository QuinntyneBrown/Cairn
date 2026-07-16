using Cairn.Application.Abstractions;
using MediatR;

namespace Cairn.Application.Auth;

public class SignOutCommandHandler(IRefreshTokenStore refreshTokens) : IRequestHandler<SignOutCommand>
{
    public Task Handle(SignOutCommand request, CancellationToken cancellationToken) =>
        refreshTokens.RevokeByPresentedTokenAsync(request.RefreshToken, cancellationToken);
}
