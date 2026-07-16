namespace Cairn.Domain;

/// <summary>
/// The shape of answer an <see cref="Idea"/> expects. The underlying int values are
/// persisted and are referenced by name in the CK_Votes_ShapeMatchesResponseType check
/// constraint, so they must not be renumbered.
/// </summary>
public enum ResponseType
{
    YesNo = 0,
    Options = 1,
    Scale = 2
}
