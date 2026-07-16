using Cairn.Application.Auth;
using Cairn.Application.Ideas;
using Cairn.Application.VoteLinks;
using Cairn.Application.Votes;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Cairn.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            await WriteProblemAsync(
                context,
                new ValidationProblemDetails(errors)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "One or more validation errors occurred."
                });
        }
        catch (InvalidCredentialsException ex)
        {
            await WriteProblemAsync(context, Problem(StatusCodes.Status401Unauthorized, "Unauthorized", ex.Message));
        }
        catch (SignInLockedException ex)
        {
            context.Response.Headers.RetryAfter = ((int)ex.RetryAfter.TotalSeconds).ToString();
            await WriteProblemAsync(context, Problem(StatusCodes.Status429TooManyRequests, "Too many attempts", ex.Message));
        }
        catch (EmailAlreadyRegisteredException ex)
        {
            await WriteProblemAsync(context, Problem(StatusCodes.Status409Conflict, "Conflict", ex.Message));
        }
        catch (IdeaNotFoundException ex)
        {
            await WriteProblemAsync(context, Problem(StatusCodes.Status404NotFound, "Not found", ex.Message));
        }
        catch (ForbiddenException ex)
        {
            await WriteProblemAsync(context, Problem(StatusCodes.Status403Forbidden, "Forbidden", ex.Message));
        }
        catch (InvalidVoteLinkException ex)
        {
            // 410 Gone, uniformly, for unknown / expired / revoked. The distinction is only
            // ever made in the log below — probing a token yields no signal either way.
            logger.LogInformation("Vote link rejected: {Reason}", ex.Reason);
            await WriteProblemAsync(context, Problem(StatusCodes.Status410Gone, "Link unavailable", ex.Message));
        }
        catch (VotingClosedException ex)
        {
            // The client may have missed the real-time close, or never had a hub connection.
            // This response is the actual guarantee that a late vote cannot land.
            await WriteProblemAsync(context, Problem(StatusCodes.Status409Conflict, "Voting closed", ex.Message));
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The caller went away mid-request — closed the tab, lost signal on the subway,
            // navigated off the ballot. EF surfaces that as a TaskCanceledException from
            // whatever query was in flight, and without this it lands in the catch-all below
            // and gets logged at Error as "Unhandled exception".
            //
            // That is worse than untidy: a browser closing is not a server fault, and a log
            // full of invented errors is how real ones get missed. Nobody is listening for
            // the response either.
            //
            // 499 is nginx's "client closed request" — non-standard, but it is the
            // conventional marker and it keeps these out of the 5xx count.
            logger.LogDebug("Request aborted by the client: {Method} {Path}",
                context.Request.Method, context.Request.Path);

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 499;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteProblemAsync(
                context,
                Problem(StatusCodes.Status500InternalServerError, "Server error", "An unexpected error occurred."));
        }
    }

    private static ProblemDetails Problem(int status, string title, string detail) =>
        new() { Status = status, Title = title, Detail = detail };

    private static async Task WriteProblemAsync(HttpContext context, ProblemDetails problem)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem, problem.GetType());
    }
}
