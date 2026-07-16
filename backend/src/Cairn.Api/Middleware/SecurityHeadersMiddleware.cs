namespace Cairn.Api.Middleware;

/// <summary>
/// Vote links are handed to people and opened on phones from the public internet, so the
/// API answers with conservative headers. Cheap insurance.
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";

        // The API only ever serves JSON; nothing here should be able to load or embed anything.
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";

        await next(context);
    }
}
