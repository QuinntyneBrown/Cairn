using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cairn.Acceptance.Fakes;

/// <summary>
/// Mirrors the API's serializer settings. The API writes enums as strings, so a test client
/// using the defaults would fail to read its own responses.
/// </summary>
public static class TestJson
{
    public static readonly JsonSerializerOptions Options = Create();

    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
