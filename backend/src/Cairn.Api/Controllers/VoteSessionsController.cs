using Cairn.Api.Contracts;
using Cairn.Application.VoteLinks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/vote-sessions")]
public class VoteSessionsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Exchanges a raw magic-link token for a short-lived, idea-scoped session.
    ///
    /// This is the only anonymous read path, and it deliberately returns the idea in the same
    /// response: there is no separate anonymous preview endpoint that would hand an idea's
    /// contents to anyone presenting a token.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<VoteSessionDto>> Redeem(
        RedeemVoteLinkRequest request,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new RedeemVoteLinkCommand(request.Token), cancellationToken));
}
