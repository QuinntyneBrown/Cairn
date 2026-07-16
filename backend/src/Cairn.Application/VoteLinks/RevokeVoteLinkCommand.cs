using MediatR;

namespace Cairn.Application.VoteLinks;

public record RevokeVoteLinkCommand(Guid IdeaId, Guid LinkId) : IRequest;
