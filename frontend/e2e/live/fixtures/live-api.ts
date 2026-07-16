import { APIRequestContext, request } from '@playwright/test';

/**
 * The real API. Not a fake, not a recording — the thing itself.
 *
 * Overridable so the preflight can be pointed somewhere else, mostly to prove the
 * skip path still works without taking down an API other people are using. Note
 * the app itself reads its origin from `api-origin.ts`, so moving the API for real
 * means changing both — this override only moves where the SUITE looks.
 */
export const API = process.env['CAIRN_API'] ?? 'http://localhost:5099';

/** Seeded in `db seed --reset`. Development only. */
export const ADMIN_EMAIL = 'admin@faithtech.to';
export const ADMIN_PASSWORD = 'cairn-admin-password';

/**
 * What to do when the stack isn't up. Printed verbatim on skip, because a smoke
 * test that says "connection refused" has told you nothing you can act on.
 */
export const HOW_TO_START = `
  The live suite needs the real stack. Start it:

    cd backend  && dotnet run --project src/Cairn.Cli -- db seed --reset
    cd backend  && dotnet run --project src/Cairn.Api --urls http://localhost:5099
    cd frontend && npm start

  Then: npm run e2e:live
`;

export interface LiveIdea {
  readonly id: string;
  readonly title: string;
  readonly responseType: 'YesNo' | 'Options' | 'Scale';
  readonly status: 'Draft' | 'Open' | 'Closed';
}

export interface LiveIdeaDetail extends LiveIdea {
  readonly options: { id: string; label: string; sortOrder: number }[];
}

export interface LiveLead {
  readonly id: string;
  readonly displayName: string;
}

/**
 * Is the real API answering?
 *
 * Any HTTP response means alive — `/api/ideas` returning 401 unauthenticated is a
 * healthy server doing its job. Only a transport failure means it is down.
 */
export async function isApiUp(): Promise<boolean> {
  let ctx: APIRequestContext | undefined;
  try {
    ctx = await request.newContext();
    await ctx.get(`${API}/api/ideas`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  } finally {
    await ctx?.dispose();
  }
}

/** Signs in as the seeded admin against the real API and returns a real JWT. */
export async function signInAsRealAdmin(ctx: APIRequestContext): Promise<string> {
  const response = await ctx.post(`${API}/api/auth/sign-in`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (!response.ok()) {
    // Worth naming: the API locks an account after 5 bad passwords for 15
    // minutes. This suite never sends a wrong one, so a 401 here means the seed
    // is stale or someone else tripped the throttle — not a bug in the test.
    throw new Error(
      `Real sign-in failed (${response.status()}). Re-seed with ` +
        `\`dotnet run --project src/Cairn.Cli -- db seed --reset\`.\n${await response.text()}`,
    );
  }

  return (await response.json()).accessToken as string;
}

export async function listIdeas(ctx: APIRequestContext, token: string): Promise<LiveIdea[]> {
  const response = await ctx.get(`${API}/api/ideas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as LiveIdea[];
}

/** The full idea, including its real option labels. */
export async function getIdea(
  ctx: APIRequestContext,
  token: string,
  ideaId: string,
): Promise<LiveIdeaDetail> {
  const response = await ctx.get(`${API}/api/ideas/${ideaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as LiveIdeaDetail;
}

export async function listLeads(ctx: APIRequestContext, token: string): Promise<LiveLead[]> {
  const response = await ctx.get(`${API}/api/leads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as LiveLead[];
}

/**
 * Mints a REAL voting link through the real endpoint.
 *
 * `url` exists only in this response, ever: the server stores a SHA-256 hash of
 * the token and cannot reconstruct the URL afterwards, which is why the links
 * list returns `url: null`. If this ever returns nothing, that design changed.
 */
export async function mintRealLink(
  ctx: APIRequestContext,
  token: string,
  ideaId: string,
  leadId: string,
): Promise<string> {
  const response = await ctx.post(`${API}/api/ideas/${ideaId}/vote-links`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { userIds: [leadId] },
  });

  if (!response.ok()) {
    throw new Error(`Minting a link failed (${response.status()}): ${await response.text()}`);
  }

  const links = (await response.json()) as { url: string | null }[];
  const url = links[0]?.url;

  if (!url) {
    throw new Error(
      'The API minted a link but returned no url. That URL is unrecoverable — the ' +
        'server only keeps a hash — so this is a real regression, not a test problem.',
    );
  }

  return url;
}

/** The bare token out of a minted URL, for driving `/vote/:token` directly. */
export function tokenFromUrl(url: string): string {
  const token = new URL(url).pathname.split('/vote/')[1];
  if (!token) {
    throw new Error(`Minted URL is not a /vote/:token link: ${url}`);
  }
  return token;
}

/** Total votes the real API reports for an idea. */
export async function realTally(
  ctx: APIRequestContext,
  token: string,
  ideaId: string,
): Promise<{ totalVotes: number; yesCount: number | null; options: unknown[] | null }> {
  const response = await ctx.get(`${API}/api/ideas/${ideaId}/results`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
}
