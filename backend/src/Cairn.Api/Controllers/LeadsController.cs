using Cairn.Application.Leads;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/leads")]
[Authorize]
public class LeadsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LeadDto>>> List(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListLeadsQuery(), cancellationToken));
}
