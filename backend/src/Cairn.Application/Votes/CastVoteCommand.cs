using MediatR;

namespace Cairn.Application.Votes;

/// <summary>
/// The caller never states the response type — the server reads it from the idea. That means
/// a client cannot lie about it, and there is no discriminator to keep in sync.
/// </summary>
public record CastVoteCommand(
    Guid IdeaId,
    bool? YesNo,
    Guid? SelectedOptionId,
    int? Scale) : IRequest<VoteDto>;
