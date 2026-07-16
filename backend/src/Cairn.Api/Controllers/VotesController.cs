using Cairn.Api.Authorization;
using Cairn.Api.Contracts;
using Cairn.Application.Votes;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/ideas/{ideaId:guid}/votes")]
// Voting is done through a magic link, so these endpoints opt in to the VoteLink policy
// rather than accepting the default user session.
[Authorize(Policy = AuthPolicies.VoteLink)]
public class VotesController(ISender sender) : ControllerBase
{
    /// <summary>Upsert — a lead may change their answer until the idea closes.</summary>
    [HttpPut]
    public async Task<ActionResult<VoteDto>> Cast(
        Guid ideaId,
        CastVoteRequest request,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(
            new CastVoteCommand(ideaId, request.YesNo, request.SelectedOptionId, request.Scale),
            cancellationToken));

    [HttpGet("me")]
    public async Task<ActionResult<VoteDto?>> GetMine(Guid ideaId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetMyVoteQuery(ideaId), cancellationToken));
}
