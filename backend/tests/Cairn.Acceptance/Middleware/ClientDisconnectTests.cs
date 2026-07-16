using System.Net;
using Cairn.Acceptance.Fakes;
using Cairn.Api.Middleware;
using Cairn.Application.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cairn.Acceptance.Middleware;

/// <summary>
/// A client closing a tab is not a server error.
///
/// Found by reading the log of a real run, not by a test: a Playwright page closed while the
/// ballot's comments query was in flight, EF surfaced a TaskCanceledException, and the
/// catch-all logged it at Error as "Unhandled exception" and answered 500. Nothing was broken
/// — the browser had simply gone away. The cost is a log full of invented errors, which is
/// how real ones get missed.
///
/// The distinction that matters, and the reason these tests exist: only a cancellation
/// caused by the CLIENT aborting is benign. A cancellation from anywhere else is a genuine
/// fault and must still surface as a 500.
/// </summary>
public class ClientDisconnectTests
{
    private static readonly RequestDelegate Throws = _ => throw new TaskCanceledException("A task was canceled.");

    private static ExceptionHandlingMiddleware Middleware(RequestDelegate next) =>
        new(next, NullLogger<ExceptionHandlingMiddleware>.Instance);

    [Fact]
    public async Task A_client_going_away_mid_request_is_not_a_server_error()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Path = "/api/ideas/x/comments";

        // The browser closed: this is what ASP.NET sets when the connection drops.
        context.RequestAborted = new CancellationToken(canceled: true);

        await Middleware(Throws).InvokeAsync(context);

        Assert.Equal(499, context.Response.StatusCode);
    }

    [Fact]
    public async Task A_cancellation_the_client_did_not_cause_is_still_a_server_error()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // The client is still there — something server-side cancelled. A command timeout, a
        // bug, a token cancelled by mistake. That is a real fault and must not be hidden.
        context.RequestAborted = CancellationToken.None;

        await Middleware(Throws).InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.InternalServerError, context.Response.StatusCode);
    }

    /// <summary>
    /// The abort guard is matched on OperationCanceledException, which is a base of several
    /// things. It must not swallow an ordinary failure that happens to race a disconnect.
    /// </summary>
    [Fact]
    public async Task An_ordinary_exception_during_an_aborted_request_is_still_reported()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.RequestAborted = new CancellationToken(canceled: true);

        RequestDelegate boom = _ => throw new InvalidOperationException("Something genuinely broke.");

        await Middleware(boom).InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.InternalServerError, context.Response.StatusCode);
    }

    /// <summary>Domain exceptions must keep their meaning even if the caller has vanished.</summary>
    [Fact]
    public async Task A_domain_exception_during_an_aborted_request_keeps_its_status()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.RequestAborted = new CancellationToken(canceled: true);

        RequestDelegate unauthorized = _ => throw new InvalidCredentialsException();

        await Middleware(unauthorized).InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.Unauthorized, context.Response.StatusCode);
    }
}
