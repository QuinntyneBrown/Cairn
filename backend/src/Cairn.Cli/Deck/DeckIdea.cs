using Cairn.Application.Comments;
using Cairn.Application.Votes;

namespace Cairn.Cli.Deck;

/// <summary>Everything one results slide needs, already fetched.</summary>
public record DeckIdea(IdeaResultsDto Results, IReadOnlyList<CommentDto> Comments);
