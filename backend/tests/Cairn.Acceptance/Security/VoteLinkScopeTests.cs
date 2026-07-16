using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Cairn.Acceptance.Fakes;
using Cairn.Api.Contracts;
using Cairn.Application.VoteLinks;
using Cairn.Domain;

namespace Cairn.Acceptance.Security;

/// <summary>
/// The security properties the whole magic-link design rests on. If any of these fail, the
/// feature is unsafe rather than merely buggy.
/// </summary>
public class VoteLinkScopeTests : IClassFixture<CairnApiFactory>
{
    private readonly CairnApiFactory _factory;
    private readonly Scenario _scenario;

    public VoteLinkScopeTests(CairnApiFactory factory)
    {
        _factory = factory;
        _scenario = new Scenario(factory);
    }

    private async Task<string> RedeemAsync(string rawToken)
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/vote-sessions", new RedeemVoteLinkRequest(rawToken));
        response.EnsureSuccessStatusCode();

        var session = await response.Content.ReadFromJsonAsync<VoteSessionDto>(TestJson.Options);
        return session!.AccessToken;
    }

    private HttpClient ClientWith(string accessToken)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    /// <summary>
    /// THE critical one. A vote-link token's "sub" is a real user id, so if the default
    /// authorization policy ever stops demanding scope=user, every magic link silently
    /// becomes a full account session for that lead.
    /// </summary>
    [Fact]
    public async Task A_vote_link_token_cannot_satisfy_a_bare_Authorize_endpoint()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var lead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);
        var idea = _scenario.AddIdea(admin);
        var token = _scenario.AddVoteLink(idea, lead);

        var voteSessionToken = await RedeemAsync(token);
        var client = ClientWith(voteSessionToken);

        // /api/me is a bare [Authorize]. It must not accept a vote-scoped token.
        var me = await client.GetAsync("/api/me");
        Assert.Equal(HttpStatusCode.Forbidden, me.StatusCode);

        // Nor may it read the idea list, or any other signed-in surface.
        var ideas = await client.GetAsync("/api/ideas");
        Assert.Equal(HttpStatusCode.Forbidden, ideas.StatusCode);
    }

    /// <summary>A link for one idea must not be a licence to act on every idea.</summary>
    [Fact]
    public async Task A_vote_link_for_one_idea_cannot_vote_on_another()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var lead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);

        var ideaA = _scenario.AddIdea(admin);
        var ideaB = _scenario.AddIdea(admin);
        var tokenForA = _scenario.AddVoteLink(ideaA, lead);

        var client = ClientWith(await RedeemAsync(tokenForA));

        var votingOnB = await client.PutAsJsonAsync(
            $"/api/ideas/{ideaB.Id}/votes", new CastVoteRequest(YesNo: true, null, null));
        Assert.Equal(HttpStatusCode.Forbidden, votingOnB.StatusCode);

        var readingBsVote = await client.GetAsync($"/api/ideas/{ideaB.Id}/votes/me");
        Assert.Equal(HttpStatusCode.Forbidden, readingBsVote.StatusCode);

        var commentingOnB = await client.PostAsJsonAsync(
            $"/api/ideas/{ideaB.Id}/comments", new AddCommentRequest("Should not land"));
        Assert.Equal(HttpStatusCode.Forbidden, commentingOnB.StatusCode);

        // And the link still works for the idea it was actually issued for.
        var votingOnA = await client.PutAsJsonAsync(
            $"/api/ideas/{ideaA.Id}/votes", new CastVoteRequest(YesNo: true, null, null));
        Assert.Equal(HttpStatusCode.OK, votingOnA.StatusCode);
    }

    /// <summary>
    /// Unknown, expired and revoked must be indistinguishable to a caller. Anything else
    /// turns the endpoint into an oracle for probing which tokens once existed.
    /// </summary>
    [Fact]
    public async Task Unknown_expired_and_revoked_links_are_indistinguishable()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var lead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);
        var idea = _scenario.AddIdea(admin);

        var expired = _scenario.AddVoteLink(idea, lead, expiresAt: _factory.Clock.UtcNow.AddMinutes(-1));
        var revokedLead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);
        var revoked = _scenario.AddVoteLink(idea, revokedLead, revoked: true);
        var unknown = "a-token-that-was-never-issued-at-all";

        var client = _factory.CreateClient();
        var responses = new List<HttpResponseMessage>();

        foreach (var token in new[] { expired, revoked, unknown })
        {
            responses.Add(await client.PostAsJsonAsync("/api/vote-sessions", new RedeemVoteLinkRequest(token)));
        }

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Gone, r.StatusCode));

        var bodies = new List<string>();
        foreach (var response in responses)
        {
            bodies.Add(await response.Content.ReadAsStringAsync());
        }

        // Identical bodies, not merely identical status codes.
        Assert.Single(bodies.Distinct());
    }

    /// <summary>
    /// The load-bearing guarantee. The client's clock, the SignalR broadcast and the UI lock
    /// are all irrelevant here: the server re-derives the window and refuses.
    /// </summary>
    [Fact]
    public async Task A_vote_after_the_idea_closes_is_refused_by_the_server()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var lead = _scenario.AddUser($"lead-{Guid.NewGuid():N}@faithtech.to", Roles.Lead);

        var closesAt = _factory.Clock.UtcNow.AddHours(2);
        var idea = _scenario.AddIdea(admin, closesAt: closesAt);
        var token = _scenario.AddVoteLink(idea, lead);

        var client = ClientWith(await RedeemAsync(token));

        var whileOpen = await client.PutAsJsonAsync(
            $"/api/ideas/{idea.Id}/votes", new CastVoteRequest(YesNo: true, null, null));
        Assert.Equal(HttpStatusCode.OK, whileOpen.StatusCode);

        // Move past the close. The client is unchanged and none the wiser.
        _factory.Clock.Advance(TimeSpan.FromHours(3));

        var afterClose = await client.PutAsJsonAsync(
            $"/api/ideas/{idea.Id}/votes", new CastVoteRequest(YesNo: false, null, null));
        Assert.Equal(HttpStatusCode.Conflict, afterClose.StatusCode);

        _factory.Clock.Advance(TimeSpan.FromHours(-3));
    }

    /// <summary>An admin's own session must not be able to vote — voting is link-only.</summary>
    [Fact]
    public async Task A_signed_in_session_cannot_vote_without_a_link()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var idea = _scenario.AddIdea(admin);

        var client = _factory.CreateClient();
        var signIn = await client.PostAsJsonAsync(
            "/api/auth/sign-in",
            new SignInRequest(admin.Email, "correct-horse-battery"));
        signIn.EnsureSuccessStatusCode();

        var auth = await signIn.Content.ReadFromJsonAsync<Cairn.Application.Auth.AuthResult>(TestJson.Options);
        var authed = ClientWith(auth!.AccessToken);

        var voting = await authed.PutAsJsonAsync(
            $"/api/ideas/{idea.Id}/votes", new CastVoteRequest(YesNo: true, null, null));

        Assert.Equal(HttpStatusCode.Forbidden, voting.StatusCode);
    }
}
