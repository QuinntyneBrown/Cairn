using MediatR;

namespace Cairn.Application.VoteLinks;

public record RedeemVoteLinkCommand(string Token) : IRequest<VoteSessionDto>;
