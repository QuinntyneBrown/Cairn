using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Auth;

public class GetCurrentUserQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetCurrentUserQuery, CurrentUserDto>
{
    public async Task<CurrentUserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw new InvalidCredentialsException();

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new InvalidCredentialsException();

        return new CurrentUserDto(user.Id, user.Email, user.DisplayName, user.Role);
    }
}
