using Cairn.Acceptance.Fakes;
using Cairn.Application.Closing;
using Cairn.Domain;
using Cairn.Infrastructure;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Cairn.Acceptance.Closing;

public class AnnounceDueClosuresTests : IClassFixture<CairnApiFactory>
{
    private readonly CairnApiFactory _factory;
    private readonly Scenario _scenario;

    public AnnounceDueClosuresTests(CairnApiFactory factory)
    {
        _factory = factory;
        _scenario = new Scenario(factory);
    }

    private async Task<int> TickAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        return await sender.Send(new AnnounceDueClosuresCommand());
    }

    [Fact]
    public async Task An_idea_still_open_is_not_announced()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        _scenario.AddIdea(admin, closesAt: _factory.Clock.UtcNow.AddDays(30));

        _factory.Notifier.VotingClosed.Clear();
        await TickAsync();

        Assert.Empty(_factory.Notifier.VotingClosed);
    }

    /// <summary>
    /// The reason ClosedAnnouncedAt exists. Without it, every tick would re-announce every
    /// idea that has ever closed — and because the flag is a column rather than memory, an
    /// idea that closed while the process was down still gets announced once on restart.
    /// </summary>
    [Fact]
    public async Task A_closed_idea_is_announced_exactly_once_across_repeated_ticks()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var idea = _scenario.AddIdea(
            admin,
            opensAt: _factory.Clock.UtcNow.AddHours(-2),
            closesAt: _factory.Clock.UtcNow.AddHours(-1));

        _factory.Notifier.VotingClosed.Clear();

        await TickAsync();
        await TickAsync();
        await TickAsync();

        var announcements = _factory.Notifier.VotingClosed.Where(r => r.IdeaId == idea.Id).ToList();
        Assert.Single(announcements);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stamped = db.Ideas.Single(i => i.Id == idea.Id);
        Assert.NotNull(stamped.ClosedAnnouncedAt);
    }

    /// <summary>
    /// Closure is derived from the clock, so an idea becomes closed by time passing — not by
    /// anything writing a status.
    /// </summary>
    [Fact]
    public async Task An_idea_is_announced_once_its_close_time_passes()
    {
        var admin = _scenario.AddUser($"admin-{Guid.NewGuid():N}@faithtech.to", Roles.Admin, "correct-horse-battery");
        var idea = _scenario.AddIdea(admin, closesAt: _factory.Clock.UtcNow.AddMinutes(30));

        _factory.Notifier.VotingClosed.Clear();
        await TickAsync();
        Assert.DoesNotContain(_factory.Notifier.VotingClosed, r => r.IdeaId == idea.Id);

        _factory.Clock.Advance(TimeSpan.FromHours(1));
        await TickAsync();

        var announcement = Assert.Single(_factory.Notifier.VotingClosed, r => r.IdeaId == idea.Id);
        Assert.Equal(Application.Ideas.IdeaStatus.Closed, announcement.Status);

        _factory.Clock.Advance(TimeSpan.FromHours(-1));
    }
}
