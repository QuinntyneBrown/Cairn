namespace Cairn.Application.Leads;

public record LeadDto(Guid Id, string Email, string DisplayName, string Role, bool CanSignIn);
