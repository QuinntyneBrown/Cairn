using Cairn.Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/me")]
// A bare [Authorize] uses the default policy, which requires scope=user — so a magic-link
// token cannot read this even though its subject is a real user id.
[Authorize]
public class MeController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CurrentUserDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetCurrentUserQuery(), cancellationToken));
}
