using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Cairn.Acceptance.Fakes;
using Cairn.Api.Contracts;
using Cairn.Domain;

namespace Cairn.Acceptance.Contract;

/// <summary>
/// Guards the wire format against silent drift.
///
/// This exists because of a real bug: the Angular client was written against an imagined
/// contract and shipped green. Its specs asserted URL and HTTP method, then flushed a
/// hand-written body — so they asserted the client's own invention back at itself and could
/// not, by construction, notice the server disagreed.
///
/// The fix is one shared artifact: frontend/e2e/fixtures/recorded-api-contract.json holds the
/// real API's actual responses. The frontend asserts its TypeScript models against that file;
/// these tests assert the API still produces it. Neither side can rot quietly — if the server
/// changes shape, this fails and the recording gets re-made deliberately rather than
/// discovered in someone's browser.
///
/// If you want to satisfy yourself these tests can actually fail — a fair thing to want —
/// do it on a scratch branch, not by editing a DTO in place. That was tried here: the
/// mutation was live for about ninety seconds and in that window another contributor read
/// the broken shape, believed it, re-recorded the contract to match, and wrote a mapping
/// layer for a field that never existed. The guard caught it, but the churn was real.
/// Prefer temporarily pointing RecordedKeys at a doctored copy of the JSON instead: same
/// proof, no shared state touched.
/// </summary>
public class ApiContractTests : IClassFixture<CairnApiFactory>
{
    private readonly CairnApiFactory _factory;
    private readonly Scenario _scenario;

    public ApiContractTests(CairnApiFactory factory)
    {
        _factory = factory;
        _scenario = new Scenario(factory);
    }

    private static readonly Lazy<JsonDocument> Recording = new(() =>
    {
        // Walk up from the test binary to the repo root.
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "frontend")))
        {
            directory = directory.Parent;
        }

        var path = Path.Combine(
            directory?.FullName ?? throw new InvalidOperationException("Could not locate the repo root."),
            "frontend", "e2e", "fixtures", "recorded-api-contract.json");

        return JsonDocument.Parse(File.ReadAllText(path));
    });

    /// <summary>The key set the frontend is coded against, for one recorded endpoint.</summary>
    private static string[] RecordedKeys(string endpoint)
    {
        var entry = Recording.Value.RootElement.GetProperty(endpoint);
        var sample = entry.ValueKind == JsonValueKind.Array ? entry[0] : entry;
        return sample.EnumerateObject().Select(p => p.Name).OrderBy(n => n).ToArray();
    }

    private static string[] ActualKeys(JsonElement element)
    {
        var sample = element.ValueKind == JsonValueKind.Array ? element[0] : element;
        return sample.EnumerateObject().Select(p => p.Name).OrderBy(n => n).ToArray();
    }

    private static void AssertMatches(string endpoint, JsonElement actual)
    {
        var expected = RecordedKeys(endpoint);
        var got = ActualKeys(actual);

        Assert.True(
            expected.SequenceEqual(got),
            $"""
             The wire format of '{endpoint}' no longer matches the recording, so the frontend
             models built against it are now wrong.

               recorded: {string.Join(", ", expected)}
               actual:   {string.Join(", ", got)}

             If the change is intended, re-record the contract and retarget the TypeScript
             models. Do not just edit this test.
             """);
    }

    private async Task<(HttpClient Admin, Idea OptionsIdea, User Lead)> ArrangeAsync()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var lead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);
        var idea = _scenario.AddIdea(admin, ResponseType.Options, options: ["First choice", "Second choice"]);

        var client = _factory.CreateClient();
        var signIn = await client.PostAsJsonAsync(
            "/api/auth/sign-in", new SignInRequest(admin.Email, "correct-horse-battery"));
        signIn.EnsureSuccessStatusCode();

        var auth = await signIn.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        return (client, idea, lead);
    }

    [Fact]
    public async Task Sign_in_still_returns_a_flat_auth_result()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");

        var response = await _factory.CreateClient().PostAsJsonAsync(
            "/api/auth/sign-in", new SignInRequest(admin.Email, "correct-horse-battery"));

        AssertMatches("POST /api/auth/sign-in -> 200", await response.Content.ReadFromJsonAsync<JsonElement>());
    }

    [Fact]
    public async Task Current_user_still_matches()
    {
        var (client, _, _) = await ArrangeAsync();
        var response = await client.GetAsync("/api/me");
        AssertMatches("GET /api/me -> 200", await response.Content.ReadFromJsonAsync<JsonElement>());
    }

    [Fact]
    public async Task Idea_summary_and_idea_still_match()
    {
        var (client, idea, _) = await ArrangeAsync();

        AssertMatches(
            "GET /api/ideas -> 200 (IdeaSummary[])",
            await (await client.GetAsync("/api/ideas")).Content.ReadFromJsonAsync<JsonElement>());

        AssertMatches(
            "GET /api/ideas/{id} -> 200 (IdeaDto)",
            await (await client.GetAsync($"/api/ideas/{idea.Id}")).Content.ReadFromJsonAsync<JsonElement>());
    }

    [Fact]
    public async Task Idea_results_still_match_for_every_response_type()
    {
        var (client, optionsIdea, _) = await ArrangeAsync();
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var yesNoIdea = _scenario.AddIdea(admin, ResponseType.YesNo);
        var scaleIdea = _scenario.AddIdea(admin, ResponseType.Scale);

        // The shape is flat and identical across response types — only which block is
        // populated differs. The frontend narrows on responseType, so all three must agree.
        foreach (var (id, endpoint) in new[]
                 {
                     (optionsIdea.Id, "GET /api/ideas/{id}/results -> 200 (Options)"),
                     (scaleIdea.Id, "GET /api/ideas/{id}/results -> 200 (Scale)"),
                     (yesNoIdea.Id, "GET /api/ideas/{id}/results -> 200 (YesNo)")
                 })
        {
            var response = await client.GetAsync($"/api/ideas/{id}/results");
            AssertMatches(endpoint, await response.Content.ReadFromJsonAsync<JsonElement>());
        }
    }

    [Fact]
    public async Task Leads_still_match()
    {
        var (client, _, _) = await ArrangeAsync();
        var response = await client.GetAsync("/api/leads");
        AssertMatches("GET /api/leads -> 200", await response.Content.ReadFromJsonAsync<JsonElement>());
    }

    [Fact]
    public async Task Vote_links_still_match_and_url_is_returned_only_on_creation()
    {
        var (client, idea, _) = await ArrangeAsync();

        var created = await client.PostAsJsonAsync(
            $"/api/ideas/{idea.Id}/vote-links", new CreateVoteLinksRequest(null));
        var createdJson = await created.Content.ReadFromJsonAsync<JsonElement>();
        AssertMatches("POST /api/ideas/{id}/vote-links -> 200 (url present ONLY here)", createdJson);

        // The raw URL exists exactly once, in the response that mints it.
        Assert.NotNull(createdJson[0].GetProperty("url").GetString());

        var listed = await client.GetAsync($"/api/ideas/{idea.Id}/vote-links");
        var listedJson = await listed.Content.ReadFromJsonAsync<JsonElement>();
        AssertMatches("GET /api/ideas/{id}/vote-links -> 200 (url is ALWAYS null)", listedJson);

        // Only the hash is stored, so the server cannot reconstruct this. The admin links
        // screen has nothing to copy from a GET, by design — it must regenerate instead.
        Assert.Equal(JsonValueKind.Null, listedJson[0].GetProperty("url").ValueKind);

        // And the raw token must never appear on the wire in any form.
        Assert.DoesNotContain("token", ActualKeys(createdJson), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Vote_session_and_vote_still_match()
    {
        var (client, idea, lead) = await ArrangeAsync();
        var rawToken = _scenario.AddVoteLink(idea, lead);

        var anonymous = _factory.CreateClient();
        var session = await anonymous.PostAsJsonAsync(
            "/api/vote-sessions", new RedeemVoteLinkRequest(rawToken));
        var sessionJson = await session.Content.ReadFromJsonAsync<JsonElement>();
        AssertMatches("POST /api/vote-sessions -> 200 (VoteSessionDto)", sessionJson);

        anonymous.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", sessionJson.GetProperty("accessToken").GetString());

        var ideaJson = await (await client.GetAsync($"/api/ideas/{idea.Id}"))
            .Content.ReadFromJsonAsync<JsonElement>();
        var optionId = ideaJson.GetProperty("options")[0].GetProperty("id").GetGuid();

        var vote = await anonymous.PutAsJsonAsync(
            $"/api/ideas/{idea.Id}/votes", new CastVoteRequest(null, optionId, null));
        AssertMatches(
            "PUT /api/ideas/{id}/votes -> 200 (VoteDto)",
            await vote.Content.ReadFromJsonAsync<JsonElement>());

        var comment = await anonymous.PostAsJsonAsync(
            $"/api/ideas/{idea.Id}/comments", new AddCommentRequest("From the contract test."));
        AssertMatches(
            "POST /api/ideas/{id}/comments -> 200",
            await comment.Content.ReadFromJsonAsync<JsonElement>());
    }

    /// <summary>
    /// The failure bodies are contract too — the ballot renders from them, and the 410 in
    /// particular must stay uniform or it becomes an oracle for probing which links existed.
    /// </summary>
    [Fact]
    public async Task Failure_bodies_still_match()
    {
        var (client, idea, lead) = await ArrangeAsync();

        var dead = await _factory.CreateClient().PostAsJsonAsync(
            "/api/vote-sessions", new RedeemVoteLinkRequest("not-a-real-token"));
        AssertMatches(
            "POST /api/vote-sessions -> 410 (unknown/expired/revoked are IDENTICAL)",
            await dead.Content.ReadFromJsonAsync<JsonElement>());

        var rawToken = _scenario.AddVoteLink(idea, lead);
        var anonymous = _factory.CreateClient();
        var sessionJson = await (await anonymous.PostAsJsonAsync(
                "/api/vote-sessions", new RedeemVoteLinkRequest(rawToken)))
            .Content.ReadFromJsonAsync<JsonElement>();
        anonymous.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", sessionJson.GetProperty("accessToken").GetString());

        // Wrong answer shape for this idea -> ValidationProblemDetails.
        var badShape = await anonymous.PutAsJsonAsync(
            $"/api/ideas/{idea.Id}/votes", new CastVoteRequest(null, null, 5));
        AssertMatches(
            "PUT /api/ideas/{id}/votes -> 400 (answer shape wrong for this idea)",
            await badShape.Content.ReadFromJsonAsync<JsonElement>());
    }
}
