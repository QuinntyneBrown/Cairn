using Cairn.Api.Authorization;
using Cairn.Api.Contracts;
using Cairn.Application.Ideas;
using Cairn.Application.Votes;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/ideas")]
// Default policy => scope=user. Vote-link tokens cannot reach any of this.
[Authorize]
public class IdeasController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IdeaSummaryDto>>> List(
        [FromQuery] IdeaStatus? status,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListIdeasQuery(status), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IdeaDto>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetIdeaByIdQuery(id), cancellationToken));

    /// <summary>
    /// Live results. Deliberately a signed-in surface only: showing running tallies to voters
    /// anchors their answers, which corrupts the thing being measured.
    /// </summary>
    [HttpGet("{id:guid}/results")]
    public async Task<ActionResult<IdeaResultsDto>> GetResults(Guid id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetIdeaResultsQuery(id), cancellationToken));

    [HttpPost]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<ActionResult<IdeaDto>> Create(
        CreateIdeaRequest request,
        CancellationToken cancellationToken)
    {
        var id = await sender.Send(
            new CreateIdeaCommand(
                request.Title,
                request.Description,
                request.ResponseType,
                request.OpensAt,
                request.ClosesAt,
                request.Options ?? []),
            cancellationToken);

        var created = await sender.Send(new GetIdeaByIdQuery(id), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<ActionResult<IdeaDto>> Update(
        Guid id,
        UpdateIdeaRequest request,
        CancellationToken cancellationToken)
    {
        await sender.Send(
            new UpdateIdeaCommand(
                id,
                request.Title,
                request.Description,
                request.ResponseType,
                request.OpensAt,
                request.ClosesAt,
                request.Options ?? []),
            cancellationToken);

        return Ok(await sender.Send(new GetIdeaByIdQuery(id), cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteIdeaCommand(id), cancellationToken);
        return NoContent();
    }
}
