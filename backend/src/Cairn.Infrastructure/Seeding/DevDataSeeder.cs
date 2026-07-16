using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cairn.Infrastructure.Seeding;

/// <summary>
/// Populates a database with plausible FaithTech Toronto data. Idempotent: keyed on the admin
/// email, so running it twice is a no-op rather than a duplicate.
/// </summary>
public class DevDataSeeder(
    IAppDbContext db,
    IClock clock,
    IPasswordHasher hasher,
    ILogger<DevDataSeeder> logger)
{
    public const string AdminPassword = "cairn-admin-password";

    public async Task<bool> SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(u => u.Email == SampleData.AdminEmail, cancellationToken))
        {
            logger.LogInformation("Sample data already present; nothing to do.");
            return false;
        }

        var now = clock.UtcNow;

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Email = SampleData.AdminEmail,
            DisplayName = "Toronto Organiser",
            PasswordHash = hasher.Hash(AdminPassword),
            Role = Roles.Admin,
            CreatedAt = now
        };
        db.Users.Add(admin);

        // Leads are passwordless on purpose: they vote through a link and never sign in.
        var leads = SampleData.Leads
            .Select(l => new User
            {
                Id = Guid.NewGuid(),
                Email = l.Email,
                DisplayName = l.DisplayName,
                PasswordHash = string.Empty,
                Role = Roles.Lead,
                CreatedAt = now
            })
            .ToList();
        db.Users.AddRange(leads);

        var random = new Random(20260716);

        foreach (var sample in SampleData.Ideas)
        {
            var idea = new Idea
            {
                Id = Guid.NewGuid(),
                Title = sample.Title,
                Description = sample.Description,
                ResponseType = sample.ResponseType,
                OpensAt = now.AddDays(sample.OpensInDays),
                ClosesAt = now.AddDays(sample.ClosesInDays),
                CreatedByUserId = admin.Id,
                CreatedAt = now.AddDays(sample.OpensInDays - 1),
                Options = sample.Options
                    .Select((label, i) => new IdeaOption
                    {
                        Id = Guid.NewGuid(),
                        Label = label,
                        SortOrder = i
                    })
                    .ToList()
            };
            db.Ideas.Add(idea);

            // Draft ideas have not opened, so nobody could have voted on one yet.
            if (sample.OpensInDays > 0)
            {
                continue;
            }

            foreach (var lead in leads)
            {
                db.VoteLinks.Add(new VoteLink
                {
                    Id = Guid.NewGuid(),
                    IdeaId = idea.Id,
                    UserId = lead.Id,
                    TokenHash = SecureToken.Hash(SecureToken.Generate()),
                    ExpiresAt = idea.ClosesAt,
                    CreatedAt = idea.CreatedAt
                });
            }

            // Leave a couple of leads un-voted so participation is not a flat 100%.
            foreach (var lead in leads.Where(_ => random.NextDouble() < 0.75))
            {
                db.Votes.Add(BuildVote(idea, lead, random, now));
            }

            foreach (var (body, index) in SampleData.Comments.Take(random.Next(1, 4)).Select((c, i) => (c, i)))
            {
                db.Comments.Add(new Comment
                {
                    Id = Guid.NewGuid(),
                    IdeaId = idea.Id,
                    AuthorId = leads[index % leads.Count].Id,
                    Body = body,
                    CreatedAt = idea.OpensAt.AddHours(index + 1)
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Seeded {Leads} leads and {Ideas} ideas. Admin: {Email} / {Password}",
            leads.Count, SampleData.Ideas.Length, SampleData.AdminEmail, AdminPassword);

        return true;
    }

    /// <summary>
    /// Builds the one value shape the idea's response type allows. Anything else would be
    /// rejected by CK_Votes_ShapeMatchesResponseType — the seeder gets no exemption.
    /// </summary>
    private static Vote BuildVote(Idea idea, User lead, Random random, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        IdeaId = idea.Id,
        VoterId = lead.Id,
        ResponseType = idea.ResponseType,
        YesNoValue = idea.ResponseType == ResponseType.YesNo ? random.NextDouble() < 0.7 : null,
        SelectedOptionId = idea.ResponseType == ResponseType.Options
            ? idea.Options[random.Next(idea.Options.Count)].Id
            : null,
        ScaleValue = idea.ResponseType == ResponseType.Scale ? random.Next(4, 10) : null,
        CreatedAt = now.AddHours(-random.Next(1, 24)),
        UpdatedAt = now.AddHours(-random.Next(0, 1))
    };
}
