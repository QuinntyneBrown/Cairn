namespace Cairn.Api.Middleware;

/// <summary>
/// Vote links are handed to people and opened on phones from the public internet, so the
/// API answers with conservative headers. Cheap insurance.
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    private const string StrictContentSecurityPolicy =
        "default-src 'none'; frame-ancestors 'none'";

    // Angular injects its compiled component styles at runtime, hence unsafe-inline for
    // styles only. Scripts remain same-origin, Google is limited to the two font hosts, and
    // fetch/SignalR connections stay on this app's origin.
    private const string SpaContentSecurityPolicy =
        "default-src 'self'; "
        + "base-uri 'self'; "
        + "object-src 'none'; "
        + "frame-ancestors 'none'; "
        + "script-src 'self'; "
        + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        + "font-src 'self' https://fonts.gstatic.com; "
        + "img-src 'self' data:; ";

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";

        headers["Content-Security-Policy"] = IsServerEndpoint(context.Request.Path)
            ? StrictContentSecurityPolicy
            : BuildSpaContentSecurityPolicy(context.Request.Host);

        await next(context);
    }

    private static bool IsServerEndpoint(PathString path) =>
        path.StartsWithSegments("/api")
        || path.StartsWithSegments("/hubs")
        || path.StartsWithSegments("/health")
        || path.StartsWithSegments("/openapi");

    private static string BuildSpaContentSecurityPolicy(HostString host)
    {
        // 'self' covers same-origin HTTP calls. Some browsers do not extend it to WebSockets,
        // so name this request's exact ws/wss origins as well instead of allowing either
        // scheme globally. ToUriComponent preserves ports and brackets IPv6 hosts correctly.
        var websocketOrigins = host.HasValue
            ? $" ws://{host.ToUriComponent()} wss://{host.ToUriComponent()}"
            : string.Empty;

        return $"{SpaContentSecurityPolicy}connect-src 'self'{websocketOrigins}";
    }
}
