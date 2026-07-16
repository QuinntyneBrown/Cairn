using Cairn.Application.Abstractions;

namespace Cairn.Infrastructure;

public class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
