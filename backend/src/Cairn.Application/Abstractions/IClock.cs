namespace Cairn.Application.Abstractions;

/// <summary>
/// The single source of time. Both the voting-window check and the closure scheduler read
/// from here — never from GETUTCDATE() — so there is one clock and one truth, and tests can
/// drive closure deterministically.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
