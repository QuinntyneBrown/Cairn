using Cairn.Application.Abstractions;
using Cairn.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Idea> Ideas => Set<Idea>();

    public DbSet<IdeaOption> IdeaOptions => Set<IdeaOption>();

    public DbSet<Vote> Votes => Set<Vote>();

    public DbSet<Comment> Comments => Set<Comment>();

    public DbSet<VoteLink> VoteLinks => Set<VoteLink>();

    public DbSet<SignInAttempt> SignInAttempts => Set<SignInAttempt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.Property(u => u.Email).IsRequired().HasMaxLength(256);
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.DisplayName).IsRequired().HasMaxLength(128);
            b.Property(u => u.PasswordHash).IsRequired().HasMaxLength(256);
            b.Property(u => u.Role).IsRequired().HasMaxLength(32);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.HasKey(t => t.Id);
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.HasIndex(t => t.FamilyId);
            b.HasOne<User>().WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SignInAttempt>(b =>
        {
            b.HasKey(a => a.Id);
            b.Property(a => a.Email).IsRequired().HasMaxLength(256);

            // The throttle always queries by email over a recent time window.
            b.HasIndex(a => new { a.Email, a.AttemptedAt });
        });

        modelBuilder.Entity<Idea>(b =>
        {
            b.HasKey(i => i.Id);

            // Principal for Vote's composite foreign key. This is what makes it impossible
            // for a vote's ResponseType to drift from its idea's.
            b.HasAlternateKey(i => new { i.Id, i.ResponseType });

            b.Property(i => i.Title).IsRequired().HasMaxLength(200);
            b.Property(i => i.Description).IsRequired().HasMaxLength(4000);
            b.Property(i => i.ResponseType).HasConversion<int>().IsRequired();

            b.HasOne<User>().WithMany()
                .HasForeignKey(i => i.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(i => i.ClosesAt);
        });

        modelBuilder.Entity<IdeaOption>(b =>
        {
            b.HasKey(o => o.Id);

            // Principal for "the selected option belongs to the same idea".
            b.HasAlternateKey(o => new { o.IdeaId, o.Id });

            b.Property(o => o.Label).IsRequired().HasMaxLength(200);

            b.HasOne<Idea>().WithMany(i => i.Options)
                .HasForeignKey(o => o.IdeaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Vote>(b =>
        {
            b.HasKey(v => v.Id);
            b.Property(v => v.ResponseType).HasConversion<int>().IsRequired();

            // One vote per lead per idea. Casting again updates this row.
            b.HasIndex(v => new { v.IdeaId, v.VoterId }).IsUnique();

            b.HasOne<User>().WithMany()
                .HasForeignKey(v => v.VoterId)
                .OnDelete(DeleteBehavior.Restrict);

            // Vote.ResponseType can never disagree with Idea.ResponseType — the database
            // refuses. Changing an idea's response type once votes exist therefore fails
            // loudly here; UpdateIdeaCommandHandler pre-empts it with a clean validation error.
            b.HasOne<Idea>().WithMany(i => i.Votes)
                .HasForeignKey(v => new { v.IdeaId, v.ResponseType })
                .HasPrincipalKey(i => new { i.Id, i.ResponseType })
                .OnDelete(DeleteBehavior.Cascade);

            // You cannot select an option belonging to a different idea. Restrict rather than
            // Cascade because Idea->Vote and Idea->IdeaOption->Vote would otherwise be
            // multiple cascade paths, which SQL Server rejects outright.
            // The composite FK is on a nullable column: under MATCH SIMPLE semantics it simply
            // does not fire when SelectedOptionId is NULL, so no special-casing is needed.
            b.HasOne<IdeaOption>().WithMany()
                .HasForeignKey(v => new { v.IdeaId, v.SelectedOptionId })
                .HasPrincipalKey(o => new { o.IdeaId, o.Id })
                .OnDelete(DeleteBehavior.Restrict);

            // The application validates this too, but the database is what makes a
            // scale value on a yes/no idea structurally impossible rather than merely a bug.
            // Integers match ResponseType: 0=YesNo, 1=Options, 2=Scale.
            b.ToTable(t => t.HasCheckConstraint(
                "CK_Votes_ShapeMatchesResponseType",
                """
                   (ResponseType = 0 AND YesNoValue IS NOT NULL AND SelectedOptionId IS NULL AND ScaleValue IS NULL)
                OR (ResponseType = 1 AND YesNoValue IS NULL AND SelectedOptionId IS NOT NULL AND ScaleValue IS NULL)
                OR (ResponseType = 2 AND YesNoValue IS NULL AND SelectedOptionId IS NULL AND ScaleValue BETWEEN 1 AND 10)
                """));
        });

        modelBuilder.Entity<Comment>(b =>
        {
            b.HasKey(c => c.Id);
            b.Property(c => c.Body).IsRequired().HasMaxLength(2000);

            b.HasOne<Idea>().WithMany(i => i.Comments)
                .HasForeignKey(c => c.IdeaId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne<User>().WithMany()
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasIndex(c => new { c.IdeaId, c.CreatedAt });
        });

        modelBuilder.Entity<VoteLink>(b =>
        {
            b.HasKey(l => l.Id);
            b.Property(l => l.TokenHash).IsRequired().HasMaxLength(128);
            b.HasIndex(l => l.TokenHash).IsUnique();

            // One link per lead per idea; regeneration rotates the hash in place.
            b.HasIndex(l => new { l.IdeaId, l.UserId }).IsUnique();

            b.HasOne<Idea>().WithMany()
                .HasForeignKey(l => l.IdeaId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne<User>().WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
