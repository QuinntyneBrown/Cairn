namespace Cairn.Api.Contracts;

/// <summary>Null or empty <paramref name="UserIds"/> mints a link for every lead.</summary>
public record CreateVoteLinksRequest(IReadOnlyList<Guid>? UserIds);
