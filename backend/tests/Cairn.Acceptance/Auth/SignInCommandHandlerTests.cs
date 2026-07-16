using Cairn.Acceptance.Fakes;
using Cairn.Application.Auth;
using Cairn.Domain;
using Cairn.Infrastructure;

namespace Cairn.Acceptance.Auth;

public class SignInCommandHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 16, 12, 0, 0, TimeSpan.Zero);

    private static SignInCommandHandler CreateHandler(TestDb db) =>
        new(db.Context,
            new BCryptPasswordHasher(),
            new StubJwtTokenIssuer(),
            new StubRefreshTokenStore(),
            new NoThrottle());

    /// <summary>
    /// The bug this guards: leads exist as passwordless rows so they can vote by magic link
    /// without an account. BCrypt.Verify throws SaltParseException on an empty hash rather
    /// than returning false, which would surface as a 500 — and a 500 here, where a wrong
    /// password gives 401, tells an attacker the account exists.
    /// </summary>
    [Fact]
    public async Task Signing_in_as_a_passwordless_lead_is_rejected_as_invalid_credentials()
    {
        using var db = new TestDb();
        db.Context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "lead@faithtech.to",
            DisplayName = "A Lead",
            PasswordHash = string.Empty,
            Role = Roles.Lead,
            CreatedAt = Now
        });
        await db.Context.SaveChangesAsync();

        var handler = CreateHandler(db);

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            handler.Handle(new SignInCommand("lead@faithtech.to", "anything"), CancellationToken.None));
    }

    [Fact]
    public async Task Signing_in_with_an_unknown_email_is_rejected_the_same_way()
    {
        using var db = new TestDb();
        var handler = CreateHandler(db);

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            handler.Handle(new SignInCommand("nobody@faithtech.to", "anything"), CancellationToken.None));
    }

    [Fact]
    public async Task Signing_in_with_the_wrong_password_is_rejected()
    {
        using var db = new TestDb();
        db.Context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@faithtech.to",
            DisplayName = "An Admin",
            PasswordHash = new BCryptPasswordHasher().Hash("the-right-password"),
            Role = Roles.Admin,
            CreatedAt = Now
        });
        await db.Context.SaveChangesAsync();

        var handler = CreateHandler(db);

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            handler.Handle(new SignInCommand("admin@faithtech.to", "the-wrong-password"), CancellationToken.None));
    }

    [Fact]
    public async Task Signing_in_with_correct_credentials_returns_tokens()
    {
        using var db = new TestDb();
        var userId = Guid.NewGuid();
        db.Context.Users.Add(new User
        {
            Id = userId,
            Email = "admin@faithtech.to",
            DisplayName = "An Admin",
            PasswordHash = new BCryptPasswordHasher().Hash("the-right-password"),
            Role = Roles.Admin,
            CreatedAt = Now
        });
        await db.Context.SaveChangesAsync();

        var handler = CreateHandler(db);

        var result = await handler.Handle(
            new SignInCommand("ADMIN@faithtech.to", "the-right-password"),
            CancellationToken.None);

        Assert.Equal(userId, result.UserId);
        Assert.Equal(Roles.Admin, result.Role);
        Assert.Equal($"access-token-for-{userId}", result.AccessToken);
    }
}
