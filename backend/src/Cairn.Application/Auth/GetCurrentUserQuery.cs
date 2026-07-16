using MediatR;

namespace Cairn.Application.Auth;

public record GetCurrentUserQuery : IRequest<CurrentUserDto>;
