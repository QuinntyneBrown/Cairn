using Cairn.Application.Abstractions;
using Cairn.Domain;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Application.Ideas;

public class UpdateIdeaCommandHandler(IAppDbContext db) : IRequestHandler<UpdateIdeaCommand>
{
    public async Task Handle(UpdateIdeaCommand request, CancellationToken cancellationToken)
    {
        var idea = await db.Ideas
            .Include(i => i.Options)
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken)
            ?? throw new IdeaNotFoundException(request.Id);

        if (idea.ResponseType != request.ResponseType)
        {
            var hasVotes = await db.Votes.AnyAsync(v => v.IdeaId == idea.Id, cancellationToken);

            // The composite foreign key on (IdeaId, ResponseType) would reject this at the
            // database with a raw FK violation. Catch it here so the caller gets a sentence
            // instead of a 500 — and so nobody is tempted to "fix" the constraint away.
            if (hasVotes)
            {
                throw new ValidationException([
                    new ValidationFailure(
                        nameof(request.ResponseType),
                        "The response type cannot change once voting has begun. Close this idea and open a new one.")
                ]);
            }

            idea.ResponseType = request.ResponseType;
        }

        idea.Title = request.Title.Trim();
        idea.Description = request.Description.Trim();
        idea.OpensAt = request.OpensAt;
        idea.ClosesAt = request.ClosesAt;

        // Re-announce if the close moved into the future: an idea that reopens must be able
        // to announce its next closure.
        if (idea.ClosedAnnouncedAt.HasValue && idea.ClosesAt > idea.ClosedAnnouncedAt)
        {
            idea.ClosedAnnouncedAt = null;
        }

        SyncOptions(idea, request.Options);

        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Matches existing options by position so that editing a label keeps the option's id —
    /// and therefore keeps the votes already cast for it.
    /// </summary>
    private static void SyncOptions(Idea idea, IReadOnlyList<string> labels)
    {
        var existing = idea.Options.OrderBy(o => o.SortOrder).ToList();

        for (var index = 0; index < labels.Count; index++)
        {
            if (index < existing.Count)
            {
                existing[index].Label = labels[index].Trim();
                existing[index].SortOrder = index;
            }
            else
            {
                idea.Options.Add(new IdeaOption
                {
                    Id = Guid.NewGuid(),
                    IdeaId = idea.Id,
                    Label = labels[index].Trim(),
                    SortOrder = index
                });
            }
        }

        foreach (var removed in existing.Skip(labels.Count))
        {
            idea.Options.Remove(removed);
        }
    }
}
