namespace Cairn.Cli.Output;

/// <summary>
/// Deliberately System.Console rather than a console-formatting library: the output here is a
/// few aligned tables and a list of links, and that is not worth a dependency.
/// </summary>
public class ConsoleWriter : IConsoleWriter
{
    public void Line(string text = "") => Console.WriteLine(text);

    public void Success(string text) => Write(text, ConsoleColor.Green);

    public void Warn(string text) => Write(text, ConsoleColor.Yellow);

    public void Error(string text) => Write(text, ConsoleColor.Red, Console.Error);

    public void Heading(string text)
    {
        Console.WriteLine();
        Write(text, ConsoleColor.Cyan);
        Console.WriteLine(new string('-', text.Length));
    }

    public void Table(IReadOnlyList<string[]> rows)
    {
        if (rows.Count == 0)
        {
            return;
        }

        var widths = new int[rows.Max(r => r.Length)];
        foreach (var row in rows)
        {
            for (var i = 0; i < row.Length; i++)
            {
                widths[i] = Math.Max(widths[i], row[i].Length);
            }
        }

        foreach (var row in rows)
        {
            var cells = row.Select((cell, i) =>
                i == row.Length - 1 ? cell : cell.PadRight(widths[i]));

            Console.WriteLine(string.Join("  ", cells).TrimEnd());
        }
    }

    private static void Write(string text, ConsoleColor color, TextWriter? writer = null)
    {
        var target = writer ?? Console.Out;
        var previous = Console.ForegroundColor;

        try
        {
            Console.ForegroundColor = color;
            target.WriteLine(text);
        }
        finally
        {
            Console.ForegroundColor = previous;
        }
    }
}
