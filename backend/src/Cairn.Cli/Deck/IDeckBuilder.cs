using Cairn.Application.Votes;

namespace Cairn.Cli.Deck;

/// <summary>
/// Keeps OpenXML behind an interface so it stays out of the Application project — the API has
/// no business referencing a PowerPoint library. Implementations take the same
/// <see cref="IdeaResultsDto"/> the dashboard and 'results show' consume, so they need no
/// database and no MediatR, and are testable on their own.
/// </summary>
public interface IDeckBuilder
{
    void Build(string outputPath, string title, IReadOnlyList<DeckIdea> ideas);
}
