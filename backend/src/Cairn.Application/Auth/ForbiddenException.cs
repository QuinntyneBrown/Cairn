namespace Cairn.Application.Auth;

/// <summary>
/// Thrown when an authenticated caller is not allowed to touch this particular resource —
/// most importantly when a vote-link session reaches for an idea other than the one its
/// idea_id claim names.
/// </summary>
public class ForbiddenException(string message) : Exception(message);
