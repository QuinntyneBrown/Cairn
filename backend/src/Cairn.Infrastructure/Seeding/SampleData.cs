using Cairn.Domain;

namespace Cairn.Infrastructure.Seeding;

/// <summary>
/// Hand-written FaithTech Toronto sample data rather than a faker library. The point of
/// seeding here is to make the app and the generated deck legible at a glance — faker output
/// is realistic-looking noise that makes a results slide meaningless. It also guarantees all
/// three response types and every check-constraint branch get exercised on a fresh database.
/// </summary>
public static class SampleData
{
    public const string AdminEmail = "admin@faithtech.to";

    public static readonly (string Email, string DisplayName)[] Leads =
    [
        ("ada@faithtech.to", "Ada Osei"),
        ("grace@faithtech.to", "Grace Lim"),
        ("alan@faithtech.to", "Alan Mwangi"),
        ("edsger@faithtech.to", "Edsger Bakker"),
        ("barbara@faithtech.to", "Barbara Nkemelu"),
        ("katherine@faithtech.to", "Katherine Reyes"),
        ("linus@faithtech.to", "Linus Park"),
        ("margaret@faithtech.to", "Margaret Achebe")
    ];

    internal static readonly SampleIdea[] Ideas =
    [
        new(
            "Run a Build Night in September",
            "A two-hour evening where the team ships something small together. We would need a "
            + "venue, a facilitator, and a project scoped tightly enough to finish in one sitting.",
            ResponseType.YesNo,
            OpensInDays: -3,
            ClosesInDays: 4,
            Options: []),

        new(
            "Which cause should the next hackathon serve?",
            "We have capacity for one focused hackathon this year. Picking the cause early lets "
            + "us line up a partner organisation and understand what they actually need.",
            ResponseType.Options,
            OpensInDays: -2,
            ClosesInDays: 5,
            Options:
            [
                "Newcomer settlement services",
                "Food bank logistics",
                "Church accessibility tooling",
                "Youth mentorship matching"
            ]),

        new(
            "How ready are we to host a regional gathering?",
            "Be honest. 1 means we would be scrambling, 10 means we could run it next month "
            + "without breaking a sweat.",
            ResponseType.Scale,
            OpensInDays: -5,
            ClosesInDays: 2,
            Options: []),

        new(
            "Should we move to monthly rather than fortnightly meetups?",
            "Fortnightly has been hard to sustain through the summer. Monthly would mean fewer "
            + "touchpoints but a higher bar for each one.",
            ResponseType.YesNo,
            OpensInDays: -20,
            ClosesInDays: -6,
            Options: []),

        new(
            "What should we prioritise for the rest of the year?",
            "One choice only. This sets what we say no to.",
            ResponseType.Options,
            OpensInDays: -30,
            ClosesInDays: -14,
            Options: [ "Community depth", "Project delivery", "Partnerships", "Teaching and workshops" ]),

        new(
            "Open a call for a second Toronto organiser?",
            "Voting has not opened on this one yet — it is here so the Draft state is visible.",
            ResponseType.YesNo,
            OpensInDays: 5,
            ClosesInDays: 15,
            Options: [])
    ];

    public static readonly string[] Comments =
    [
        "Strongly in favour, but only if we can lock a venue before we announce anything.",
        "I can facilitate. I would want the project scoped much tighter than last time.",
        "My hesitation is bandwidth in September — it collides with the start of term.",
        "Whatever we pick, let's talk to the partner org before we decide what to build for them.",
        "We have said yes to too much this year. This is the one I would keep."
    ];
}

internal record SampleIdea(
    string Title,
    string Description,
    ResponseType ResponseType,
    int OpensInDays,
    int ClosesInDays,
    string[] Options);
