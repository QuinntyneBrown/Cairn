using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cairn.Cli.Output;

/// <summary>
/// Matches the API's serializer settings — camelCase, enums as strings. --json exists to be
/// piped into something, and that something should not have to care whether the bytes came
/// from the CLI or the HTTP API.
/// </summary>
public static class CliJson
{
    public static readonly JsonSerializerOptions Options = Create();

    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
