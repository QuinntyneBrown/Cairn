using Cairn.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Leads;

public class ListLeadsQueryHandler(IAppDbContext db)
    : IRequestHandler<ListLeadsQuery, IReadOnlyList<LeadDto>>
{
    public async Task<IReadOnlyList<LeadDto>> Handle(
        ListLeadsQuery request,
        CancellationToken cancellationToken) =>
        await db.Users
            .AsNoTracking()
            .OrderBy(u => u.DisplayName)
            .Select(u => new LeadDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.Role,
                // Passwordless leads vote by link only. Surfacing this stops an admin
                // wondering why a lead "cannot log in".
                u.PasswordHash != ""))
            .ToListAsync(cancellationToken);
}
