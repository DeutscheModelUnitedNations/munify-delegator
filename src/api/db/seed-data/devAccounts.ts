/**
 * The accounts a developer signs in with on the oidc-mock login page, and what the dev seed makes
 * of each of them.
 *
 * This list is the single source for both sides: `bun run db:seed:dev` creates a user row whose id
 * is the account's `sub` (the app keys users by the OIDC subject), and `bun run dev:accounts`
 * writes the `users` of `oidc-mock.yaml` from it. `devAccounts.test.ts` fails when the two drift.
 *
 * The login page lists the accounts in this order, one button each, so the label starts with the
 * group it belongs to. A participant persona keeps the same role in every conference it appears
 * in, which is what makes switching between the conferences on its dashboard a tour through the
 * stages: the head delegate is the head delegate in preparation, during and after the conference.
 */

/** The OIDC roles `src/api/context.ts` understands. */
type OidcRole = 'admin' | 'member' | 'service_user';

export interface DevAccount {
	sub: string;
	/** Button text on the login page. */
	label: string;
	/** Second line on the button: what to expect after signing in. */
	description: string;
	givenName: string;
	familyName: string;
	roles: readonly OidcRole[];
	/**
	 * What the seed writes for the account. `complete` passes the profile form, so the login lands
	 * where it was heading; `incomplete` is sent to /my-account first; `none` has no row at all
	 * and is created by its first login.
	 */
	profile: 'complete' | 'incomplete' | 'none';
	/** Age on the seed date, which decides whether guardian consent applies. Defaults to 19. */
	age?: number;
}

export const devEmail = (sub: string) => `${sub.replace(/^dev-/, '')}@delegator.local`;

export const devAccounts = [
	// --- Global ---------------------------------------------------------------------------------
	{
		sub: 'dev-admin',
		label: '[Global] System admin',
		description: 'OIDC role admin: every conference, every permission, seeding',
		givenName: 'Ada',
		familyName: 'Admin',
		roles: ['admin'],
		profile: 'complete',
		age: 34
	},
	{
		sub: 'dev-service-user',
		label: '[Global] Service user',
		description: 'OIDC role service_user: may create committee agenda items, nothing else',
		givenName: 'Sergio',
		familyName: 'Service',
		roles: ['service_user'],
		profile: 'complete',
		age: 40
	},
	{
		sub: 'dev-participant',
		label: '[Global] Fresh participant',
		description: 'Complete profile, no participation anywhere - register, join with a code',
		givenName: 'Paul',
		familyName: 'Participant',
		roles: [],
		profile: 'complete',
		age: 17
	},
	{
		sub: 'dev-new-user',
		label: '[Global] First login',
		description: 'No user row yet: the first login creates it and asks for the profile',
		givenName: 'Nora',
		familyName: 'Neu',
		roles: [],
		profile: 'none'
	},
	{
		sub: 'dev-incomplete-profile',
		label: '[Global] Incomplete profile',
		description: 'Row without birthday, phone or address: every login redirects to /my-account',
		givenName: 'Ines',
		familyName: 'Incomplete',
		roles: [],
		profile: 'incomplete'
	},

	// --- Team: one role each, in every seeded conference ---------------------------------------
	{
		sub: 'dev-team-pm',
		label: '[Team] Project management',
		description: 'PROJECT_MANAGEMENT everywhere: management, configuration, papers, team',
		givenName: 'Pia',
		familyName: 'Projektleitung',
		roles: [],
		profile: 'complete',
		age: 24
	},
	{
		sub: 'dev-team-care',
		label: '[Team] Participant care',
		description: 'PARTICIPANT_CARE everywhere: management, payments, postal, papers (no link)',
		givenName: 'Carl',
		familyName: 'Care',
		roles: [],
		profile: 'complete',
		age: 22
	},
	{
		sub: 'dev-team-coordinator',
		label: '[Team] Team coordinator',
		description: 'TEAM_COORDINATOR everywhere: team management and invitations only',
		givenName: 'Toni',
		familyName: 'Teamkoordination',
		roles: [],
		profile: 'complete',
		age: 23
	},
	{
		sub: 'dev-team-content-lead',
		label: '[Team] Content lead',
		description: 'CONTENT_LEAD everywhere: the seat planning only',
		givenName: 'Charlie',
		familyName: 'Inhaltsleitung',
		roles: [],
		profile: 'complete',
		age: 25
	},
	{
		sub: 'dev-team-reviewer',
		label: '[Team] Reviewer',
		description: 'REVIEWER everywhere: paper hub with a review queue and saved snippets',
		givenName: 'Rita',
		familyName: 'Review',
		roles: [],
		profile: 'complete',
		age: 21
	},
	{
		sub: 'dev-team-member',
		label: '[Team] Member',
		description: 'MEMBER everywhere: team dashboard, attendance scanner, seats',
		givenName: 'Max',
		familyName: 'Mitglied',
		roles: [],
		profile: 'complete',
		age: 20
	},
	{
		sub: 'dev-team-invitee',
		label: '[Team] Invited, not yet joined',
		description: 'No row; open the pending invitation link the seed prints, then sign in',
		givenName: 'Ivo',
		familyName: 'Invited',
		roles: [],
		profile: 'none'
	},

	// --- Registration: the application stages, in the "Registration open" conference -----------
	{
		sub: 'dev-reg-head-new',
		label: '[Registration] Delegation just created',
		description: 'Head delegate, alone, no role preferences yet',
		givenName: 'Hanna',
		familyName: 'Neugruendung',
		roles: [],
		profile: 'complete',
		age: 17
	},
	{
		sub: 'dev-reg-head-ready',
		label: '[Registration] Delegation ready to apply',
		description: 'Head delegate: members, preferences and texts complete, not yet applied',
		givenName: 'Henrik',
		familyName: 'Bereit',
		roles: [],
		profile: 'complete',
		age: 18
	},
	{
		sub: 'dev-reg-member',
		label: '[Registration] Delegation member',
		description: 'Ordinary member of the ready delegation - read-only view',
		givenName: 'Mia',
		familyName: 'Mitglied',
		roles: [],
		profile: 'complete',
		age: 16
	},
	{
		sub: 'dev-reg-head-applied',
		label: '[Registration] Delegation applied',
		description: 'Head delegate of an applied delegation, also waiting after the deadline',
		givenName: 'Anton',
		familyName: 'Angemeldet',
		roles: [],
		profile: 'complete',
		age: 18
	},
	{
		sub: 'dev-reg-single-new',
		label: '[Registration] Single participant, started',
		description: 'Single application without role preferences, not applied',
		givenName: 'Selma',
		familyName: 'Einzeln',
		roles: [],
		profile: 'complete',
		age: 19
	},
	{
		sub: 'dev-reg-single-applied',
		label: '[Registration] Single participant, applied',
		description: 'Applied single participant, also waiting after the deadline',
		givenName: 'Simon',
		familyName: 'Beworben',
		roles: [],
		profile: 'complete',
		age: 20
	},
	{
		sub: 'dev-reg-supervisor',
		label: '[Registration] Supervisor',
		description: 'Supervises the ready and the applied delegation, attends in person',
		givenName: 'Sabine',
		familyName: 'Lehrkraft',
		roles: [],
		profile: 'complete',
		age: 45
	},
	{
		sub: 'dev-reg-late',
		label: '[Registration] Late applicant',
		description: 'Ready, unapplied delegations: within the grace period and after it',
		givenName: 'Lukas',
		familyName: 'Spaet',
		roles: [],
		profile: 'complete',
		age: 17
	},

	// --- Participants: one role each, in Preparation (both), Active and Post -------------------
	{
		sub: 'dev-head-delegate',
		label: '[Participant] Head delegate (nation)',
		description: 'Leads the delegation of Germany; payments, postal, papers, committees',
		givenName: 'Helena',
		familyName: 'Hauptdelegierte',
		roles: [],
		profile: 'complete',
		age: 18
	},
	{
		sub: 'dev-delegate',
		label: '[Participant] Delegate (nation)',
		description: 'Member of the German delegation, an accepted paper, surveys answered',
		givenName: 'David',
		familyName: 'Delegierter',
		roles: [],
		profile: 'complete',
		age: 19
	},
	{
		sub: 'dev-delegate-minor',
		label: '[Participant] Delegate under 18',
		description: '16 years old: guardian consent step, a draft paper, did not attend',
		givenName: 'Mina',
		familyName: 'Minderjaehrig',
		roles: [],
		profile: 'complete',
		age: 16
	},
	{
		sub: 'dev-nsa-delegate',
		label: '[Participant] Head delegate (non-state actor)',
		description: 'Leads a non-state actor: introduction paper, everything paid and signed',
		givenName: 'Nils',
		familyName: 'Nichtstaatlich',
		roles: [],
		profile: 'complete',
		age: 20
	},
	{
		sub: 'dev-single',
		label: '[Participant] Single participant',
		description: 'Holds a custom role (press); answered every survey',
		givenName: 'Sophie',
		familyName: 'Presse',
		roles: [],
		profile: 'complete',
		age: 18
	},
	{
		sub: 'dev-supervisor',
		label: '[Participant] Supervisor, attending',
		description: 'Teacher of the German delegation and of a rejected one, attends',
		givenName: 'Stefan',
		familyName: 'Betreuer',
		roles: [],
		profile: 'complete',
		age: 52
	},
	{
		sub: 'dev-supervisor-absent',
		label: '[Participant] Supervisor, not attending',
		description: 'Supervises the single participant from afar: no own payment',
		givenName: 'Agnes',
		familyName: 'Abwesend',
		roles: [],
		profile: 'complete',
		age: 38
	},
	{
		sub: 'dev-supervisor-rejected',
		label: '[Participant] Supervisor, students rejected',
		description: 'Every student of theirs went unassigned: rejection screen',
		givenName: 'Rolf',
		familyName: 'Abgelehnt',
		roles: [],
		profile: 'complete',
		age: 47
	},
	{
		sub: 'dev-rejected-delegate',
		label: '[Participant] Delegation not accepted',
		description: 'Applied delegation that got no seat: rejection, waiting-list link',
		givenName: 'Ralf',
		familyName: 'Ohneplatz',
		roles: [],
		profile: 'complete',
		age: 17
	},
	{
		sub: 'dev-rejected-single',
		label: '[Participant] Single not accepted',
		description: 'Applied single participant that got no role',
		givenName: 'Rosa',
		familyName: 'Ohnerolle',
		roles: [],
		profile: 'complete',
		age: 18
	},
	{
		sub: 'dev-waitlist',
		label: '[Participant] On the waiting list',
		description: 'Waiting-list entry in both preparation conferences, nothing else',
		givenName: 'Willi',
		familyName: 'Warteliste',
		roles: [],
		profile: 'complete',
		age: 17
	}
] as const satisfies readonly DevAccount[];

export type DevAccountSub = (typeof devAccounts)[number]['sub'];

/** The claims oidc-mock signs into the tokens for an account. */
export function devAccountClaims(account: DevAccount) {
	return {
		email: devEmail(account.sub),
		email_verified: true,
		given_name: account.givenName,
		family_name: account.familyName,
		preferred_username: account.sub,
		locale: 'de',
		roles: [...account.roles]
	};
}
