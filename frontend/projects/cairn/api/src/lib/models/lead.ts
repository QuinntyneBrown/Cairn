/**
 * Someone whose opinion is being asked for. Mirrors the backend `LeadDto`.
 *
 * `canSignIn` is false for a lead with no password — the common case. They are not
 * locked out or half-registered: they are invited by voting link and answer from
 * the link alone, which is the whole point of the magic-link flow. Any UI listing
 * leads must say so, or the first question is always "why can't they log in?".
 */
export interface Lead {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
  readonly canSignIn: boolean;
}
