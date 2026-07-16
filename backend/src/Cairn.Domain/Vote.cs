namespace Cairn.Domain;

/// <summary>
/// One lead's answer to one idea. Exactly one of the three value columns is populated,
/// selected by <see cref="ResponseType"/> and enforced in the database by
/// CK_Votes_ShapeMatchesResponseType rather than by application code alone.
/// </summary>
public class Vote
{
    public Guid Id { get; set; }

    public Guid IdeaId { get; set; }

    public Guid VoterId { get; set; }

    /// <summary>
    /// Denormalised from the parent idea. A check constraint cannot reach across tables, so
    /// this column plus a composite foreign key on (IdeaId, ResponseType) is what lets a
    /// single-table check enforce "the value matches the idea's expected shape". The foreign
    /// key makes drift from Idea.ResponseType impossible.
    /// </summary>
    public ResponseType ResponseType { get; set; }

    public bool? YesNoValue { get; set; }

    public Guid? SelectedOptionId { get; set; }

    public int? ScaleValue { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Votes are changeable until the idea closes, so this moves.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
