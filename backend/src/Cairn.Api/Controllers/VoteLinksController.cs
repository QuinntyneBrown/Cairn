using Cairn.Api.Authorization;
using Cairn.Api.Contracts;
using Cairn.Application.VoteLinks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/ideas/{ideaId:guid}/vote-links")]
[Authorize(Policy = AuthPolicies.Admin)]
public class VoteLinksController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VoteLinkDto>>> List(
        Guid ideaId,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListVoteLinksQuery(ideaId), cancellationToken));

    /// <summary>
    /// Returns the raw URLs. This is the only moment they exist — only the hash is stored —
    /// and they go solely to the authenticated admin who asked for them.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<VoteLinkDto>>> Create(
        Guid ideaId,
        CreateVoteLinksRequest request,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(
            new CreateVoteLinksCommand(ideaId, request.UserIds ?? []),
            cancellationToken));

    [HttpDelete("{linkId:guid}")]
    public async Task<IActionResult> Revoke(
        Guid ideaId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        await sender.Send(new RevokeVoteLinkCommand(ideaId, linkId), cancellationToken);
        return NoContent();
    }
}
