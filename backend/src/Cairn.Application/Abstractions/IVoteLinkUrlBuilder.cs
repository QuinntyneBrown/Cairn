namespace Cairn.Application.Abstractions;

/// <summary>Builds the /vote/{token} URL a lead opens. The origin is configuration.</summary>
public interface IVoteLinkUrlBuilder
{
    string Build(string rawToken);
}
