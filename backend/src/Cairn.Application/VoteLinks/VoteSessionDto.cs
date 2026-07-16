using Cairn.Application.Ideas;
using Cairn.Application.Votes;

namespace Cairn.Application.VoteLinks;

/// <summary>
/// Everything the ballot needs in one round trip. Redeeming and previewing are the same call
/// deliberately: there is no anonymous read endpoint that would leak an idea's contents to
/// anyone holding a guessed token.
/// </summary>
public record VoteSessionDto(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string LeadName,
    IdeaDto Idea,
    VoteDto? MyVote);
