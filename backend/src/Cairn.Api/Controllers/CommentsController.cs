using Cairn.Api.Authorization;
using Cairn.Api.Contracts;
using Cairn.Application.Comments;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/ideas/{ideaId:guid}/comments")]
// Both surfaces comment: admins from the dashboard, leads from their magic link.
[Authorize(Policy = AuthPolicies.UserOrVoteLink)]
public class CommentsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> List(
        Guid ideaId,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListCommentsQuery(ideaId), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CommentDto>> Add(
        Guid ideaId,
        AddCommentRequest request,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new AddCommentCommand(ideaId, request.Body), cancellationToken));
}
