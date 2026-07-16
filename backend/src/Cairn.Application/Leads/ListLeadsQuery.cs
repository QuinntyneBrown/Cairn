using MediatR;

namespace Cairn.Application.Leads;

public record ListLeadsQuery : IRequest<IReadOnlyList<LeadDto>>;
