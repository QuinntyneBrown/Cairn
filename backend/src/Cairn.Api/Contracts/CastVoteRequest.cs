namespace Cairn.Api.Contracts;

/// <summary>
/// The client sends only an answer. It never states the response type — the server reads that
/// from the idea, so the client cannot claim a shape the idea did not ask for.
/// </summary>
public record CastVoteRequest(bool? YesNo, Guid? SelectedOptionId, int? Scale);
