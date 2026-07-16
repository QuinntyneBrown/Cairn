using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Cairn.Api.Authorization;
using Cairn.Api.HostedServices;
using Cairn.Api.Middleware;
using Cairn.Application;
using Cairn.Infrastructure;
using Cairn.Infrastructure.Realtime;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddCairnApplication();
builder.Services.AddCairnInfrastructure(builder.Configuration);
builder.Services.AddCairnHttpInfrastructure();
builder.Services.AddHostedService<IdeaClosureHostedService>();

// No signing key ships with this repository, deliberately. A committed key is a published
// key: the issuer and audience are public too, so anyone with the source could mint an admin
// token against any instance that ran with it — and pointing a deployment at the Development
// environment is an ordinary mistake, not an exotic one.
//
// Development therefore generates an ephemeral key per run: a fresh clone just works, tokens
// simply do not survive a restart. Anything else must supply its own via user-secrets or the
// environment, and refuses to start otherwise.
if (string.IsNullOrWhiteSpace(builder.Configuration[$"{JwtOptions.SectionName}:SigningKey"])
    && builder.Environment.IsDevelopment())
{
    var ephemeralKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        [$"{JwtOptions.SectionName}:SigningKey"] = ephemeralKey
    });
}

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("The Jwt configuration section is missing.");

if (string.IsNullOrWhiteSpace(jwt.SigningKey) || jwt.SigningKey.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:SigningKey must be set to at least 32 characters. Set it via user-secrets or the environment. "
        + "Never commit one.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // SignalR cannot set an Authorization header on the WebSocket handshake, so it sends
        // the token as a query-string parameter instead. Lift it into the auth context, but
        // only for hub paths — never for the REST surface.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options => options.AddCairnPolicies());

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

// Acceptance tests swap in a SQLite database they create themselves. Running migrations
// there would apply a SqlServer-shaped snapshot to a different provider.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<VotingHub>("/hubs/voting");

app.Run();

/// <summary>Exposed so WebApplicationFactory can bootstrap the API in acceptance tests.</summary>
public partial class Program;
