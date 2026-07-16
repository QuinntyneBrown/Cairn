using Cairn.Api.Contracts;
using Cairn.Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new RegisterCommand(request.Email, request.DisplayName, request.Password),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("sign-in")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> SignIn(
        SignInRequest request,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new SignInCommand(request.Email, request.Password),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Refresh(
        RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new RefreshTokenCommand(request.RefreshToken),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("sign-out")]
    [Authorize]
    public async Task<IActionResult> SignOutSession(
        RefreshRequest request,
        CancellationToken cancellationToken)
    {
        await sender.Send(new SignOutCommand(request.RefreshToken), cancellationToken);
        return NoContent();
    }
}
