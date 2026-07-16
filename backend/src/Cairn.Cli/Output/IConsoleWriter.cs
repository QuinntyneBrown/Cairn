namespace Cairn.Cli.Output;

public interface IConsoleWriter
{
    void Line(string text = "");

    void Success(string text);

    void Warn(string text);

    void Error(string text);

    void Heading(string text);

    /// <summary>Writes rows with columns padded to a common width.</summary>
    void Table(IReadOnlyList<string[]> rows);
}
