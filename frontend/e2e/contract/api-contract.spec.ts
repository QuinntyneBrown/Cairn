import recording from '../fixtures/recorded-api-contract.json';
import type { AuthResult } from '../../projects/cairn/api/src/lib/models/auth-result';
import type { CastVoteRequest } from '../../projects/cairn/api/src/lib/models/cast-vote-request';
import type { CreateCommentRequest } from '../../projects/cairn/api/src/lib/models/create-comment-request';
import type { CreateIdeaRequest } from '../../projects/cairn/api/src/lib/models/create-idea-request';
import type { CreateVoteSessionRequest } from '../../projects/cairn/api/src/lib/models/create-vote-session-request';
import type { CreateVotingLinkRequest } from '../../projects/cairn/api/src/lib/models/create-voting-link-request';
import type { CurrentUser } from '../../projects/cairn/api/src/lib/models/current-user';
import type { Idea } from '../../projects/cairn/api/src/lib/models/idea';
import type { IdeaComment } from '../../projects/cairn/api/src/lib/models/idea-comment';
import type { IdeaOption } from '../../projects/cairn/api/src/lib/models/idea-option';
import type { IdeaResults } from '../../projects/cairn/api/src/lib/models/idea-results';
import type { IdeaSummary } from '../../projects/cairn/api/src/lib/models/idea-summary';
import type { Lead } from '../../projects/cairn/api/src/lib/models/lead';
import type { OptionTally } from '../../projects/cairn/api/src/lib/models/option-tally';
import type { ScaleBucket } from '../../projects/cairn/api/src/lib/models/scale-bucket';
import type { ScaleSummary } from '../../projects/cairn/api/src/lib/models/scale-summary';
import type { SignInRequest } from '../../projects/cairn/api/src/lib/models/sign-in-request';
import type { UpdateIdeaRequest } from '../../projects/cairn/api/src/lib/models/update-idea-request';
import type { VotingLink } from '../../projects/cairn/api/src/lib/models/voting-link';

/**
 * THE CONTRACT CHECK — binds every @cairn/api type to what the real server sends.
 *
 * Why this exists: the whole model layer was once written from a prose spec while
 * the backend was still being built, and shipped with a green suite, because the
 * specs flushed hand-written fakes. A fake written by the person holding a wrong
 * belief agrees with the belief, not with the server. No amount of care with fakes
 * closes that hole — only an artifact neither side controls.
 *
 * That artifact is `recorded-api-contract.json`: real responses captured from a
 * live server against a seeded database. It is bound at BOTH ends —
 *
 *   this suite       TS types  <-> recording      (model drift fails `npm test`)
 *   a C# acceptance  recording <-> real API       (server drift fails `dotnet test`)
 *
 * so neither side can rot quietly.
 *
 * Each check has two halves, and both matter:
 *
 *   COMPILE — `Record<keyof T, true>` cannot be satisfied if the interface gains a
 *     field (the literal is missing a key) or loses one (the literal has an excess
 *     key). Editing a model without editing its key set is a build error.
 *
 *   RUNTIME — the key set is compared against keys read FROM the recording. Never
 *     retype the expected keys here: a hand-typed expectation is just another fake,
 *     and it would reintroduce exactly the bug this file exists to prevent.
 *
 * When one of these fails, the recording is right and the model is wrong. Re-record
 * rather than edit the JSON by hand.
 */

const RECORDING = recording as Record<string, unknown>;

/** The recorded body for an entry, or the first element if it recorded a collection. */
function recordedSample(entry: string): Record<string, unknown> {
  if (!(entry in RECORDING)) {
    throw new Error(
      `No recording named "${entry}". The recording is the contract: if an endpoint ` +
        `was renamed or removed, re-record it — do not rename this expectation to match.`,
    );
  }

  const value = RECORDING[entry];
  const sample = Array.isArray(value) ? value[0] : value;

  if (sample === null || typeof sample !== 'object') {
    throw new Error(
      `Recording "${entry}" holds no object to read keys from. An empty collection ` +
        `records nothing about its element shape — re-record with seeded data.`,
    );
  }

  return sample as Record<string, unknown>;
}

function recordedKeys(entry: string): string[] {
  return Object.keys(recordedSample(entry)).sort();
}

/** Keys of a nested object inside a recorded body, e.g. an idea's first option. */
function nestedKeys(entry: string, pick: (body: Record<string, unknown>) => unknown): string[] {
  const nested = pick(recordedSample(entry));
  const sample = Array.isArray(nested) ? nested[0] : nested;

  if (sample === null || typeof sample !== 'object') {
    throw new Error(`Nested value in "${entry}" is not an object; nothing to compare.`);
  }

  return Object.keys(sample as Record<string, unknown>).sort();
}

/** Compile-checked key sets. Adding or removing a model field breaks these first. */
const KEYS = {
  authResult: {
    accessToken: true,
    refreshToken: true,
    userId: true,
    email: true,
    displayName: true,
    role: true,
  } satisfies Record<keyof AuthResult, true>,

  currentUser: {
    id: true,
    email: true,
    displayName: true,
    role: true,
  } satisfies Record<keyof CurrentUser, true>,

  ideaSummary: {
    id: true,
    title: true,
    responseType: true,
    status: true,
    opensAt: true,
    closesAt: true,
    voteCount: true,
    invitedCount: true,
  } satisfies Record<keyof IdeaSummary, true>,

  idea: {
    id: true,
    title: true,
    description: true,
    responseType: true,
    status: true,
    opensAt: true,
    closesAt: true,
    options: true,
  } satisfies Record<keyof Idea, true>,

  ideaOption: {
    id: true,
    label: true,
    sortOrder: true,
  } satisfies Record<keyof IdeaOption, true>,

  ideaResults: {
    ideaId: true,
    title: true,
    responseType: true,
    status: true,
    closesAt: true,
    totalVotes: true,
    invitedCount: true,
    yesCount: true,
    noCount: true,
    options: true,
    scale: true,
  } satisfies Record<keyof IdeaResults, true>,

  optionTally: {
    optionId: true,
    label: true,
    count: true,
  } satisfies Record<keyof OptionTally, true>,

  scaleSummary: {
    average: true,
    distribution: true,
  } satisfies Record<keyof ScaleSummary, true>,

  scaleBucket: {
    value: true,
    count: true,
  } satisfies Record<keyof ScaleBucket, true>,

  ideaComment: {
    id: true,
    ideaId: true,
    authorId: true,
    authorName: true,
    body: true,
    createdAt: true,
  } satisfies Record<keyof IdeaComment, true>,

  lead: {
    id: true,
    email: true,
    displayName: true,
    role: true,
    canSignIn: true,
  } satisfies Record<keyof Lead, true>,

  votingLink: {
    id: true,
    ideaId: true,
    userId: true,
    displayName: true,
    email: true,
    expiresAt: true,
    createdAt: true,
    isRevoked: true,
    hasVoted: true,
    url: true,
  } satisfies Record<keyof VotingLink, true>,
};

/**
 * The other direction: what we SEND.
 *
 * These matter as much as the responses and are easier to get wrong quietly. A
 * wrong response shape usually surfaces as a missing value on screen; a wrong
 * request shape is accepted by the server, binds the fields it recognises, and
 * silently defaults the rest — so the app looks fine and the data is wrong.
 *
 * `UpdateIdeaRequest` is the cautionary tale: it once carried three fields, and a
 * PUT would have quietly rewritten an Options idea with no options at all.
 */
const REQUEST_KEYS = {
  signIn: {
    email: true,
    password: true,
  } satisfies Record<keyof SignInRequest, true>,

  createIdea: {
    title: true,
    description: true,
    responseType: true,
    opensAt: true,
    closesAt: true,
    options: true,
  } satisfies Record<keyof CreateIdeaRequest, true>,

  updateIdea: {
    title: true,
    description: true,
    responseType: true,
    opensAt: true,
    closesAt: true,
    options: true,
  } satisfies Record<keyof UpdateIdeaRequest, true>,

  castVote: {
    yesNo: true,
    selectedOptionId: true,
    scale: true,
  } satisfies Record<keyof CastVoteRequest, true>,

  createComment: {
    body: true,
  } satisfies Record<keyof CreateCommentRequest, true>,

  createVoteSession: {
    token: true,
  } satisfies Record<keyof CreateVoteSessionRequest, true>,

  createVotingLink: {
    userIds: true,
  } satisfies Record<keyof CreateVotingLinkRequest, true>,
};

/**
 * Recorded requests this client deliberately has no model for.
 *
 * Cairn's admins are seeded, not self-registered, and leads never sign in at all —
 * they vote through a magic link. There is no refresh flow either: a short-lived
 * admin session that expires is a re-login, not a silent renewal.
 *
 * Listed rather than ignored: a model invented to make a count match is unused API
 * surface, and unused surface is the thing that drifts unnoticed. If either flow is
 * ever built, delete the entry here and bind it above.
 */
const UNBOUND_BY_DESIGN = [
  'POST /api/auth/register -> request (RegisterRequest)',
  'POST /api/auth/refresh -> request (RefreshRequest)',
];

function keysOf(spec: Record<string, true>): string[] {
  return Object.keys(spec).sort();
}

describe('API contract', () => {
  describe('auth', () => {
    it('AuthResult matches POST /api/auth/sign-in', () => {
      expect(keysOf(KEYS.authResult)).toEqual(recordedKeys('POST /api/auth/sign-in -> 200'));
    });

    // The two endpoints name the same person differently — sign-in says `userId`,
    // /api/me says `id`. Both spellings are asserted against the recording rather
    // than reasoned about, because guessing this wrong once already cost a day.
    it('CurrentUser matches GET /api/me', () => {
      expect(keysOf(KEYS.currentUser)).toEqual(recordedKeys('GET /api/me -> 200'));
    });

    it('really does spell the id differently on each endpoint', () => {
      expect(recordedKeys('POST /api/auth/sign-in -> 200')).toContain('userId');
      expect(recordedKeys('GET /api/me -> 200')).toContain('id');
      expect(recordedKeys('GET /api/me -> 200')).not.toContain('userId');
      expect(recordedKeys('GET /api/me -> 200')).not.toContain('identifier');
    });
  });

  describe('ideas', () => {
    it('IdeaSummary matches GET /api/ideas', () => {
      expect(keysOf(KEYS.ideaSummary)).toEqual(
        recordedKeys('GET /api/ideas -> 200 (IdeaSummary[])'),
      );
    });

    it('Idea matches GET /api/ideas/{id}', () => {
      expect(keysOf(KEYS.idea)).toEqual(recordedKeys('GET /api/ideas/{id} -> 200 (IdeaDto)'));
    });

    it('IdeaOption matches the options nested in an idea', () => {
      expect(keysOf(KEYS.ideaOption)).toEqual(
        nestedKeys('GET /api/ideas/{id} -> 200 (IdeaDto)', (body) => body['options']),
      );
    });
  });

  describe('results', () => {
    // The same DTO serves all three response types. Every block is always present;
    // only the one matching `responseType` is populated. Asserting all three
    // recordings against one key set is what proves that.
    const ENTRIES = [
      'GET /api/ideas/{id}/results -> 200 (YesNo)',
      'GET /api/ideas/{id}/results -> 200 (Options)',
      'GET /api/ideas/{id}/results -> 200 (Scale)',
    ];

    for (const entry of ENTRIES) {
      it(`IdeaResults matches ${entry}`, () => {
        expect(keysOf(KEYS.ideaResults)).toEqual(recordedKeys(entry));
      });
    }

    it('OptionTally matches the options block of an Options result', () => {
      expect(keysOf(KEYS.optionTally)).toEqual(
        nestedKeys('GET /api/ideas/{id}/results -> 200 (Options)', (body) => body['options']),
      );
    });

    it('ScaleSummary matches the scale block of a Scale result', () => {
      expect(keysOf(KEYS.scaleSummary)).toEqual(
        nestedKeys('GET /api/ideas/{id}/results -> 200 (Scale)', (body) => body['scale']),
      );
    });

    it('ScaleBucket matches a point of the scale distribution', () => {
      expect(keysOf(KEYS.scaleBucket)).toEqual(
        nestedKeys('GET /api/ideas/{id}/results -> 200 (Scale)', (body) => {
          const scale = body['scale'] as { distribution: unknown };
          return scale.distribution;
        }),
      );
    });

    // The nullability the model claims, checked against what the server actually
    // sent. `yesCount: number | null` is only honest if the server really nulls it.
    it('populates only the block matching the response type', () => {
      const yesNo = recordedSample('GET /api/ideas/{id}/results -> 200 (YesNo)');
      expect(yesNo['options']).toBeNull();
      expect(yesNo['scale']).toBeNull();
      expect(yesNo['yesCount']).not.toBeNull();

      const options = recordedSample('GET /api/ideas/{id}/results -> 200 (Options)');
      expect(options['yesCount']).toBeNull();
      expect(options['scale']).toBeNull();
      expect(options['options']).not.toBeNull();

      const scale = recordedSample('GET /api/ideas/{id}/results -> 200 (Scale)');
      expect(scale['yesCount']).toBeNull();
      expect(scale['options']).toBeNull();
      expect(scale['scale']).not.toBeNull();
    });

    // The scale axis is a fixed server-side 1..10 and every point comes back, zeros
    // included. A chart that only plots what it was given would otherwise silently
    // drop the empty end of the range.
    it('always returns all ten scale points, including zeros', () => {
      const scale = recordedSample('GET /api/ideas/{id}/results -> 200 (Scale)')['scale'] as {
        distribution: { value: number; count: number }[];
      };

      expect(scale.distribution).toHaveLength(10);
      expect(scale.distribution.map((b) => b.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('comments', () => {
    it('IdeaComment matches GET /api/ideas/{id}/comments', () => {
      expect(keysOf(KEYS.ideaComment)).toEqual(recordedKeys('GET /api/ideas/{id}/comments -> 200'));
    });

    it('IdeaComment also matches the POST response', () => {
      expect(keysOf(KEYS.ideaComment)).toEqual(
        recordedKeys('POST /api/ideas/{id}/comments -> 200'),
      );
    });
  });

  describe('leads', () => {
    it('Lead matches GET /api/leads', () => {
      expect(keysOf(KEYS.lead)).toEqual(recordedKeys('GET /api/leads -> 200'));
    });

    // A lead is a user, not a contact: it has a role and a sign-in capability, and
    // no name/organisation. The leads page is built on this being true.
    it('describes leads as users, with no contact-shaped fields', () => {
      const keys = recordedKeys('GET /api/leads -> 200');
      expect(keys).toContain('canSignIn');
      expect(keys).toContain('role');
      expect(keys).not.toContain('name');
      expect(keys).not.toContain('organisation');
    });
  });

  describe('vote links', () => {
    const CREATED = 'POST /api/ideas/{id}/vote-links -> 200 (url present ONLY here)';
    const LISTED = 'GET /api/ideas/{id}/vote-links -> 200 (url is ALWAYS null)';

    it('VotingLink matches the POST response', () => {
      expect(keysOf(KEYS.votingLink)).toEqual(recordedKeys(CREATED));
    });

    it('VotingLink matches the GET response', () => {
      expect(keysOf(KEYS.votingLink)).toEqual(recordedKeys(LISTED));
    });

    it('carries no token field — the secret lives only inside the url', () => {
      expect(recordedKeys(CREATED)).not.toContain('token');
    });

    /**
     * The constraint behind the whole links UI, pinned here so it cannot be
     * forgotten or "fixed".
     *
     * Only a SHA-256 hash of the token is stored, so the server is unable to
     * reconstruct a URL after minting it — not unwilling. A link is therefore
     * copyable exactly once, at creation; the list can only offer regenerate,
     * which rotates the hash and kills the old URL.
     *
     * If this ever fails because GET started returning a url, the security model
     * changed and the UI decision should be revisited — do not just delete it.
     */
    it('returns the url ONLY on creation, never on the list', () => {
      const created = recordedSample(CREATED);
      const listed = recordedSample(LISTED);

      expect(typeof created['url']).toBe('string');
      expect(created['url']).toContain('/vote/');
      expect(listed['url']).toBeNull();
    });
  });

  describe('ballot', () => {
    it('the vote session embeds a full Idea', () => {
      expect(keysOf(KEYS.idea)).toEqual(
        nestedKeys('POST /api/vote-sessions -> 200 (VoteSessionDto)', (body) => body['idea']),
      );
    });

    // BallotStatus is derived client-side and is deliberately absent from the wire.
    // If the server ever grows one, BallotService's derivation is redundant and the
    // two will disagree — which is worth failing over.
    it('sends no status field — the client derives it', () => {
      expect(recordedKeys('POST /api/vote-sessions -> 200 (VoteSessionDto)')).not.toContain(
        'status',
      );
    });

    it('answers a dead link with 410 and no idea data', () => {
      const dead = recordedSample(
        'POST /api/vote-sessions -> 410 (unknown/expired/revoked are IDENTICAL)',
      );
      expect(dead['status']).toBe(410);
      expect(dead).not.toHaveProperty('idea');
      expect(dead).not.toHaveProperty('accessToken');
    });
  });

  describe('requests', () => {
    it('SignInRequest matches POST /api/auth/sign-in', () => {
      expect(keysOf(REQUEST_KEYS.signIn)).toEqual(
        recordedKeys('POST /api/auth/sign-in -> request (SignInRequest)'),
      );
    });

    it('CreateIdeaRequest matches POST /api/ideas', () => {
      expect(keysOf(REQUEST_KEYS.createIdea)).toEqual(
        recordedKeys('POST /api/ideas -> request (CreateIdeaRequest)'),
      );
    });

    it('UpdateIdeaRequest matches PUT /api/ideas/{id}', () => {
      expect(keysOf(REQUEST_KEYS.updateIdea)).toEqual(
        recordedKeys('PUT /api/ideas/{id} -> request (UpdateIdeaRequest)'),
      );
    });

    /**
     * PUT is a full replacement, not a patch — the server rebuilds the idea from
     * the body it is given. An update that omitted `responseType` and `options`
     * would not preserve them; it would erase them, turning an Options idea into
     * one with no choices and taking its votes' meaning with it.
     *
     * Asserting the two bodies are identical is what pins that: if the backend
     * ever makes update a genuine patch, this fails and the model should change
     * with it.
     */
    it('update sends the whole idea, exactly as create does', () => {
      expect(recordedKeys('PUT /api/ideas/{id} -> request (UpdateIdeaRequest)')).toEqual(
        recordedKeys('POST /api/ideas -> request (CreateIdeaRequest)'),
      );
    });

    it('CastVoteRequest matches PUT /api/ideas/{id}/votes', () => {
      expect(keysOf(REQUEST_KEYS.castVote)).toEqual(
        recordedKeys('PUT /api/ideas/{id}/votes -> request (CastVoteRequest)'),
      );
    });

    /**
     * The answer carries no `responseType`. The idea already declares its type, so
     * a client-supplied one could only ever agree redundantly or contradict — and a
     * server that trusted it would let a caller cast a Scale answer at a YesNo idea.
     * The three nullable value fields ARE the discrimination.
     */
    it('does not let a vote declare its own response type', () => {
      const keys = recordedKeys('PUT /api/ideas/{id}/votes -> request (CastVoteRequest)');
      expect(keys).not.toContain('responseType');
      expect(keys).not.toContain('kind');
    });

    it('CreateCommentRequest matches POST /api/ideas/{id}/comments', () => {
      expect(keysOf(REQUEST_KEYS.createComment)).toEqual(
        recordedKeys('POST /api/ideas/{id}/comments -> request (AddCommentRequest)'),
      );
    });

    // The author is taken from the token's subject. A client that could name its
    // own author could sign a comment with someone else's name.
    it('does not let a comment name its own author', () => {
      const keys = recordedKeys('POST /api/ideas/{id}/comments -> request (AddCommentRequest)');
      expect(keys).not.toContain('authorName');
      expect(keys).not.toContain('authorId');
    });

    it('CreateVoteSessionRequest matches POST /api/vote-sessions', () => {
      expect(keysOf(REQUEST_KEYS.createVoteSession)).toEqual(
        recordedKeys('POST /api/vote-sessions -> request (RedeemVoteLinkRequest)'),
      );
    });

    it('CreateVotingLinkRequest matches POST /api/ideas/{id}/vote-links', () => {
      expect(keysOf(REQUEST_KEYS.createVotingLink)).toEqual(
        recordedKeys('POST /api/ideas/{id}/vote-links -> request (CreateVoteLinksRequest)'),
      );
    });

    // Minting links is bulk: one call, many leads, many links back.
    it('mints links for a list of users, not one at a time', () => {
      const body = recordedSample(
        'POST /api/ideas/{id}/vote-links -> request (CreateVoteLinksRequest)',
      );
      expect(Array.isArray(body['userIds'])).toBe(true);
    });

    /**
     * COVERAGE — the generalised replacement for the one-shot tripwire that brought
     * these binds into being.
     *
     * Every recorded request must be either bound above or listed as deliberately
     * unbound. A new endpoint in the recording fails here rather than sitting
     * unnoticed, and the failure names it. This is the part that keeps the bind from
     * decaying as the API grows.
     */
    it('binds every recorded request, or says why not', () => {
      const recorded = Object.keys(RECORDING)
        .filter((key) => key.includes('-> request'))
        .sort();

      const bound = [
        'POST /api/auth/sign-in -> request (SignInRequest)',
        'POST /api/ideas -> request (CreateIdeaRequest)',
        'PUT /api/ideas/{id} -> request (UpdateIdeaRequest)',
        'PUT /api/ideas/{id}/votes -> request (CastVoteRequest)',
        'POST /api/ideas/{id}/comments -> request (AddCommentRequest)',
        'POST /api/vote-sessions -> request (RedeemVoteLinkRequest)',
        'POST /api/ideas/{id}/vote-links -> request (CreateVoteLinksRequest)',
      ];

      expect(
        recorded,
        'A recorded request is neither bound nor listed in UNBOUND_BY_DESIGN. Bind it ' +
          'with a `satisfies Record<keyof T, true>` key set, or add it to that list with ' +
          'a reason this client never calls it.',
      ).toEqual([...bound, ...UNBOUND_BY_DESIGN].sort());
    });
  });
});
