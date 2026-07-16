namespace Cairn.Infrastructure;

public class VoteLinkOptions
{
    public const string SectionName = "VoteLink";

    /// <summary>Origin the /vote/{token} URLs are built against, e.g. https://cairn.faithtech.to</summary>
    public string BaseUrl { get; set; } = "http://localhost:4200";
}
