using Cairn.Application.Abstractions;
using Cairn.Domain;
using Cairn.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Acceptance.Fakes;

/// <summary>Seeds a factory's database directly, so tests state only what they care about.</summary>
public class Scenario(CairnApiFactory factory)
{
    public User AddUser(string email, string role, string? password = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = email.Split('@')[0],
            PasswordHash = password is null ? string.Empty : new BCryptPasswordHasher().Hash(password),
            Role = role,
            CreatedAt = factory.Clock.UtcNow
        };

        return Save(db => db.Users.Add(user), user);
    }

    public Idea AddIdea(
        User createdBy,
        ResponseType responseType = ResponseType.YesNo,
        DateTimeOffset? opensAt = null,
        DateTimeOffset? closesAt = null,
        params string[] options)
    {
        var idea = new Idea
        {
            Id = Guid.NewGuid(),
            Title = $"Idea {responseType}",
            Description = "Does this seem like a good idea?",
            ResponseType = responseType,
            OpensAt = opensAt ?? factory.Clock.UtcNow.AddHours(-1),
            ClosesAt = closesAt ?? factory.Clock.UtcNow.AddDays(1),
            CreatedByUserId = createdBy.Id,
            CreatedAt = factory.Clock.UtcNow,
            Options = options
                .Select((label, i) => new IdeaOption { Id = Guid.NewGuid(), Label = label, SortOrder = i })
                .ToList()
        };

        return Save(db => db.Ideas.Add(idea), idea);
    }

    /// <summary>Returns the raw token — the only place it exists, exactly as in production.</summary>
    public string AddVoteLink(Idea idea, User lead, DateTimeOffset? expiresAt = null, bool revoked = false)
    {
        var rawToken = SecureToken.Generate();

        var link = new VoteLink
        {
            Id = Guid.NewGuid(),
            IdeaId = idea.Id,
            UserId = lead.Id,
            TokenHash = SecureToken.Hash(rawToken),
            ExpiresAt = expiresAt ?? idea.ClosesAt,
            CreatedAt = factory.Clock.UtcNow,
            RevokedAt = revoked ? factory.Clock.UtcNow : null
        };

        return Save(db => db.VoteLinks.Add(link), rawToken);
    }

    private T Save<T>(Action<AppDbContext> mutate, T result)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        mutate(db);
        db.SaveChanges();
        return result;
    }
}
