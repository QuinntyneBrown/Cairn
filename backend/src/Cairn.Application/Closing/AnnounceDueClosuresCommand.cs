using MediatR;

namespace Cairn.Application.Closing;

/// <summary>Returns how many ideas were announced, which makes the tick testable.</summary>
public record AnnounceDueClosuresCommand : IRequest<int>;
