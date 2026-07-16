using Cairn.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<User> Users { get; }

    DbSet<RefreshToken> RefreshTokens { get; }

    DbSet<Idea> Ideas { get; }

    DbSet<IdeaOption> IdeaOptions { get; }

    DbSet<Vote> Votes { get; }

    DbSet<Comment> Comments { get; }

    DbSet<VoteLink> VoteLinks { get; }

    DbSet<SignInAttempt> SignInAttempts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
