using Cairn.Domain;

namespace Cairn.Application.Abstractions;

public record IssuedRefreshToken(string RawToken, RefreshToken Stored);
