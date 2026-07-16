namespace Cairn.Application.Ideas;

public class IdeaNotFoundException(Guid ideaId) : Exception($"Idea {ideaId} was not found.");
