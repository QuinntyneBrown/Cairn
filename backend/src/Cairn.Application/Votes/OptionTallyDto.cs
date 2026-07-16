namespace Cairn.Application.Votes;

public record OptionTallyDto(Guid OptionId, string Label, int Count);
