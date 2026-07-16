namespace Cairn.Domain;

/// <summary>A selectable choice. Only present when the idea's ResponseType is Options.</summary>
public class IdeaOption
{
    public Guid Id { get; set; }

    public Guid IdeaId { get; set; }

    public string Label { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
