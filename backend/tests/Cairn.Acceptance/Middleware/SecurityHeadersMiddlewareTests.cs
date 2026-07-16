using Cairn.Api.Middleware;
using Microsoft.AspNetCore.Http;

namespace Cairn.Acceptance.Middleware;

public class SecurityHeadersMiddlewareTests
{
    [Theory]
    [InlineData("/api/ideas")]
    [InlineData("/hubs/voting")]
    [InlineData("/health")]
    [InlineData("/openapi/v1.json")]
    public async Task Server_endpoints_cannot_load_or_embed_content(string path)
    {
        var context = await InvokeAsync(path);

        Assert.Equal(
            "default-src 'none'; frame-ancestors 'none'",
            context.Response.Headers["Content-Security-Policy"]);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/ideas/8d73dca7-bc1d-4417-b376-319f7c5359a3")]
    [InlineData("/main.3f1a.js")]
    public async Task Spa_and_static_content_get_the_browser_policy(string path)
    {
        var context = await InvokeAsync(path, new HostString("cairn.example", 443));
        var policy = context.Response.Headers["Content-Security-Policy"].ToString();

        Assert.Contains("default-src 'self'", policy);
        Assert.Contains("script-src 'self'", policy);
        Assert.Contains("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", policy);
        Assert.Contains("font-src 'self' https://fonts.gstatic.com", policy);
        Assert.Contains("connect-src 'self'", policy);
        Assert.Contains("ws://cairn.example:443", policy);
        Assert.Contains("wss://cairn.example:443", policy);
        Assert.DoesNotContain("default-src 'none'", policy);
    }

    private static async Task<DefaultHttpContext> InvokeAsync(string path, HostString host = default)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Host = host;

        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(context);

        return context;
    }
}
