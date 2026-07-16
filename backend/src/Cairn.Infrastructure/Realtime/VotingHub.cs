using Cairn.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Cairn.Infrastructure.Realtime;

/// <summary>
/// A bare [Authorize] here would apply the default policy, which requires scope=user — and
/// would therefore lock out the magic-link voters this hub exists to serve. Hence the
/// explicit policy naming both scopes.
/// </summary>
[Authorize(Policy = AuthPolicyNames.UserOrVoteLink)]
public class VotingHub(ICurrentUser currentUser) : Hub
{
    public async Task JoinIdea(Guid ideaId)
    {
        // A vote-link token is confined to one idea by its idea_id claim. Without this check
        // a link holder could subscribe to every idea's live results — which is exactly the
        // data the two-group split exists to keep from them.
        if (currentUser.Scope == AuthScopes.Vote)
        {
            if (currentUser.VoteLinkIdeaId != ideaId)
            {
                throw new HubException("This voting link is not for that idea.");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, VotingGroups.Voters(ideaId));
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, VotingGroups.Report(ideaId));
    }

    public async Task LeaveIdea(Guid ideaId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, VotingGroups.Report(ideaId));
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, VotingGroups.Voters(ideaId));
    }
}
