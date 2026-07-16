namespace Cairn.Application.Abstractions;

public record IssuedVoteSessionToken(string AccessToken, DateTimeOffset ExpiresAt);
