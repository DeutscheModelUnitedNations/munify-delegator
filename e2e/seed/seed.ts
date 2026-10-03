/**
 * Minimal, deterministic fixture data for the Playwright e2e suite.
 *
 * This intentionally does NOT reuse src/api/db/seedDev.ts: that script seeds hundreds of users and
 * eight fully-populated conferences (one per stage, with persona accounts in each), which is both
 * slow and calls `reset()`, wiping every table - the opposite of
 * what a suite that runs repeatedly against a persistent database wants. e2e fixtures should be
 * small, fast, and owned by the e2e suite so they don't drift or break with unrelated dev-seed
 * changes.
 *
 * Idempotent: safe to run against an already-seeded database (upserts by fixed id).
 * Used both as Playwright's `globalSetup` (default export) and standalone (`bun e2e/seed/seed.ts`).
 *
 * ID scheme: "actor" users (team members/reviewers/etc that log in during a test) get a fixed,
 * predictable id so a spec can seed their DB rows here and then log in as them - the app derives
 * a user's DB id straight from the OIDC `sub` claim, and `loginAs` signs in on the oidc-mock
 * login page with `preferred_username` as the token's `sub` (see e2e/support/auth.ts
 * `fixedTestUser`). "Target" users (acted upon, never log in themselves) are just plain seeded
 * rows.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedConference } from '../../src/api/db/seed-data/conference';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/customConferenceRole';
import { makeSeedCommittee } from '../../src/api/db/seed-data/committee';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';

export const E2E_CONFERENCE_ID = 'e2e00000conference0000001';
export const E2E_ROLE_ID = 'e2e00000role0000000000001';
export const E2E_ROLE_2_ID = 'e2e00000role0000000000002';

export const E2E_NATION_ALPHA3 = 'DEU';
export const E2E_NATION_ALPHA2 = 'DE';
export const E2E_COMMITTEE_ID = 'e2e00000committee000000001';
export const E2E_AGENDA_ITEM_ID = 'e2e00000agendaitem00000001';

// A Delegation can only be assigned one nation per conference at a time
// (delegation_conference_id_assigned_nation_alpha3_code_key) - the paper fixture below already
// occupies E2E_NATION_ALPHA3, so the assignment flow gets its own nation to assign.
export const E2E_ASSIGNMENT_NATION_ALPHA3 = 'FRA';
export const E2E_ASSIGNMENT_NATION_ALPHA2 = 'FR';

// The committee-assignment fixture needs a delegation that ALREADY holds a nation, but it must
// not be the one assignment.spec.ts assigns: that spec upserts FRA onto its own delegation, and
// the per-conference nation-assignment unique index means only one delegation per conference
// can hold a given nation. Sharing one constant made the two fixtures collide.
export const E2E_COMMITTEE_ASSIGN_NATION_ALPHA3 = 'ITA';
export const E2E_COMMITTEE_ASSIGN_NATION_ALPHA2 = 'IT';

// A published survey (draft=false, hidden=false) with two options, so the participant-facing
// answering flow has something deterministic to answer. The admin spec creates its own survey
// rather than reusing this one, so the two never contend for the per-conference title uniqueness.
// A second conference, already past registration (PREPARATION). Features that only exist for
// assigned participants - surveys, attendance, the committee views - are gated on both an
// assignment AND a post-registration state, which the main PARTICIPANT_REGISTRATION conference
// can never satisfy without breaking every registration spec.
export const E2E_PREP_CONFERENCE_ID = 'e2e00000conference0000002';
export const E2E_PREP_NATION_ALPHA3 = 'ESP';
export const E2E_PREP_NATION_ALPHA2 = 'ES';
export const E2E_PREP_COMMITTEE_ID = 'e2e00000committee00000002';
export const E2E_PREP_DELEGATION_ID = 'e2e00000delegation00000005';
export const E2E_PREP_PARTICIPANT_USER_ID = 'e2e-prep-participant';

export const E2E_SURVEY_QUESTION_ID = 'e2e00000surveyquestion0001';
export const E2E_SURVEY_QUESTION_TITLE = 'E2E Seeded Survey';
export const E2E_SURVEY_OPTION_A_ID = 'e2e00000surveyoption000001';
export const E2E_SURVEY_OPTION_A_TITLE = 'Seeded Option A';
export const E2E_SURVEY_OPTION_B_ID = 'e2e00000surveyoption000002';
export const E2E_SURVEY_OPTION_B_TITLE = 'Seeded Option B';

// Management: admin views/updates a pre-registered participant's status.
export const E2E_MGMT_ADMIN_ID = 'e2e-mgmt-admin';
export const E2E_MGMT_TARGET_USER_ID = 'e2e-mgmt-target';
export const E2E_MGMT_TARGET_FAMILY_NAME = 'E2EMgmtTarget';
export const E2E_MGMT_TARGET_SINGLE_PARTICIPANT_ID = 'e2e00000singlepart00000001';

// Payments: a participant generates a reference, an admin marks it received.
export const E2E_PAYMENT_ADMIN_ID = 'e2e-payment-admin';

// Connect-supervisor: a participant links themselves to a pre-existing supervisor via code.
export const E2E_SUPERVISOR_FOR_CONNECT_USER_ID = 'e2e-supervisor-for-connect';
export const E2E_SUPERVISOR_CONNECTION_CODE = 'SUPRVZ';
export const E2E_SUPERVISOR_ID = 'e2e00000conferencesupervisor01';
export const E2E_CONNECT_PARTICIPANT_ID = 'e2e-connect-participant';
export const E2E_CONNECT_SINGLE_PARTICIPANT_ID = 'e2e00000singlepart00000002';

// Committee assignment: a delegation already assigned a nation, with one member still needing a
// committee - the head delegate assigns it via the UI.
export const E2E_COMMITTEE_ASSIGN_DELEGATION_ID = 'e2e00000delegation00000004';
export const E2E_COMMITTEE_ASSIGN_HEAD_USER_ID = 'e2e-committee-assign-head';

// Payment (group variant): the same supervisor above, but pre-linked (via seed, not the
// connect-supervisor test's own action) to a second participant, so the group-payment default
// selection has more than just the supervisor themselves.
export const E2E_SUPERVISED_PARTICIPANT_USER_ID = 'e2e-supervised-participant';
export const E2E_SUPERVISED_SINGLE_PARTICIPANT_ID = 'e2e00000singlepart00000003';

// Assignment: PROJECT_MANAGEMENT admin applies an assignment JSON to a real delegation.
export const E2E_ASSIGNMENT_ADMIN_ID = 'e2e-assignment-admin';
export const E2E_ASSIGNMENT_DELEGATION_ID = 'e2e00000delegation00000001';
export const E2E_ASSIGNMENT_DELEGATE_USER_ID = 'e2e-assignment-delegate';

// Assignment (splitting): a 2-member delegation split into two 1-member delegations.
// Kept separate from E2E_ASSIGNMENT_DELEGATION_ID above since splitting hard-deletes the
// parent delegation - reusing the same fixture would make the two assignment tests order-dependent.
export const E2E_SPLIT_DELEGATION_ID = 'e2e00000delegation00000003';
export const E2E_SPLIT_MEMBER_1_ID = 'e2e-split-member-1';
export const E2E_SPLIT_MEMBER_2_ID = 'e2e-split-member-2';

// Delegation self-service dashboard: enough nations/seats for a head delegate to set 3 role
// preferences (RoleApplication) via the UI, independent of the other nation/committee fixtures.
export const E2E_PREFS_COMMITTEE_ID = 'e2e00000committee000000002';
export const E2E_PREFS_NATION_ALPHA3S = ['ITA', 'ESP', 'PRT'] as const;
export const E2E_PREFS_NATION_ALPHA2S = ['IT', 'ES', 'PT'] as const;

// Paper editing: a pre-existing DRAFT paper (with a version) for the paper delegate to edit and
// submit - distinct from paper-review.spec.ts, which creates a brand new paper each run.
export const E2E_DRAFT_PAPER_ID = 'e2e00000paper00000000001';
export const E2E_DRAFT_PAPER_VERSION_ID = 'e2e00000paperversion0001';

// Papers: a delegate (already assigned to the committee) submits a paper, a reviewer reviews it.
export const E2E_PAPER_REVIEWER_ID = 'e2e-paper-reviewer';
/** A team coordinator: manages the team, but may not hand out project management. */
export const E2E_TEAM_COORDINATOR_ID = 'e2e-team-coordinator';
export const E2E_PAPER_DELEGATE_USER_ID = 'e2e-paper-delegate';
export const E2E_PAPER_DELEGATION_ID = 'e2e00000delegation00000002';

export default async function seed() {
	const db = drizzle(process.env.DATABASE_URL!);

	async function upsertNation(alpha3Code: string, alpha2Code: string) {
		await db
			.insert(schema.nation)
			.values({ alpha3Code, alpha2Code })
			.onConflictDoUpdate({ target: schema.nation.alpha3Code, set: { alpha2Code } });
	}

	const conference = {
		...makeSeedConference({
			state: 'PARTICIPANT_REGISTRATION',
			// Registration only shows as OPEN while startAssignment is in the future
			// (see src/lib/helpers/registrationStatus.ts) - the dev seed helper defaults this
			// to a past date for PARTICIPANT_REGISTRATION, which would leave it CLOSED here.
			startAssignment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		}),
		id: E2E_CONFERENCE_ID,
		title: 'E2E Test Conference',
		isOpenPaperSubmission: true
	};
	await db
		.insert(schema.conference)
		.values(conference)
		.onConflictDoUpdate({ target: schema.conference.id, set: conference });

	const role = {
		...makeSeedCustomConferenceRole({ conferenceId: conference.id }),
		id: E2E_ROLE_ID,
		name: 'E2E Test Role'
	};
	await db
		.insert(schema.customConferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.customConferenceRole.id, set: role });

	// A second role so single-participant dashboard tests can exercise "add another application"
	// with a genuinely different role, then delete the first one.
	const role2 = {
		...makeSeedCustomConferenceRole({ conferenceId: conference.id }),
		id: E2E_ROLE_2_ID,
		name: 'E2E Test Role 2'
	};
	await db
		.insert(schema.customConferenceRole)
		.values(role2)
		.onConflictDoUpdate({ target: schema.customConferenceRole.id, set: role2 });

	await upsertNation(E2E_NATION_ALPHA3, E2E_NATION_ALPHA2);
	await upsertNation(E2E_ASSIGNMENT_NATION_ALPHA3, E2E_ASSIGNMENT_NATION_ALPHA2);
	await upsertNation(E2E_COMMITTEE_ASSIGN_NATION_ALPHA3, E2E_COMMITTEE_ASSIGN_NATION_ALPHA2);

	const committee = {
		...makeSeedCommittee({ conferenceId: conference.id }),
		id: E2E_COMMITTEE_ID,
		name: 'E2E Test Committee',
		abbreviation: 'E2E',
		numOfSeatsPerDelegation: 1
	};
	await db
		.insert(schema.committee)
		.values(committee)
		.onConflictDoUpdate({ target: schema.committee.id, set: committee });

	// Also connected to the "assignment" nation (FRA) so the committee-assignment fixture can use
	// a nation the paper fixture above hasn't already claimed (a Delegation can only be assigned
	// one nation per conference).
	await db
		.insert(schema.committeeToNation)
		.values(
			[E2E_NATION_ALPHA3, E2E_ASSIGNMENT_NATION_ALPHA3, E2E_COMMITTEE_ASSIGN_NATION_ALPHA3].map(
				(alpha3Code) => ({ a: committee.id, b: alpha3Code })
			)
		)
		.onConflictDoNothing();

	const agendaItem = {
		id: E2E_AGENDA_ITEM_ID,
		title: 'E2E Test Agenda Item',
		committeeId: committee.id
	};
	await db
		.insert(schema.committeeAgendaItem)
		.values(agendaItem)
		.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: agendaItem });

	// --- users that log in during a test (id must match the OIDC claims used to log in) ---
	async function upsertActorUser(id: string, overrides: Partial<{ familyName: string }> = {}) {
		const user = {
			...makeSeedUser(),
			id,
			email: `${id}@e2e.test`,
			// `userFormSchema` (src/routes/(authenticated)/my-account/form-schema.ts) is what decides
			// whether a login redirects to /my-account - and `makeSeedUser()` never satisfies it:
			// `country` is a full name (`faker.location.country()`), not the ISO-3166 alpha-3 code the
			// schema validates, and `emergencyContacts` isn't set at all. Without this override every
			// fixedTestUser login here would redirect to /my-account instead of the intended page.
			country: 'DEU',
			phone: '+4917612345678',
			emergencyContacts: 'Emergency contact: +49 176 12345678',
			...overrides
		};
		await db
			.insert(schema.user)
			.values(user)
			.onConflictDoUpdate({ target: schema.user.id, set: user });
		return user;
	}

	await upsertActorUser(E2E_MGMT_ADMIN_ID);
	await upsertActorUser(E2E_PAYMENT_ADMIN_ID);
	await upsertActorUser(E2E_ASSIGNMENT_ADMIN_ID);
	await upsertActorUser(E2E_ASSIGNMENT_DELEGATE_USER_ID);
	await upsertActorUser(E2E_SPLIT_MEMBER_1_ID);
	await upsertActorUser(E2E_SPLIT_MEMBER_2_ID);
	await upsertActorUser(E2E_PAPER_REVIEWER_ID);
	await upsertActorUser(E2E_PAPER_DELEGATE_USER_ID);
	await upsertActorUser(E2E_MGMT_TARGET_USER_ID, { familyName: E2E_MGMT_TARGET_FAMILY_NAME });
	await upsertActorUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID);
	await upsertActorUser(E2E_CONNECT_PARTICIPANT_ID);
	await upsertActorUser(E2E_SUPERVISED_PARTICIPANT_USER_ID);
	await upsertActorUser(E2E_COMMITTEE_ASSIGN_HEAD_USER_ID);
	await upsertActorUser(E2E_TEAM_COORDINATOR_ID);

	async function upsertTeamMember(
		userId: string,
		role: 'PARTICIPANT_CARE' | 'PROJECT_MANAGEMENT' | 'REVIEWER' | 'TEAM_COORDINATOR'
	) {
		const teamMember = {
			...makeSeedTeamMember({ conferenceId: conference.id, userId, role }),
			id: `e2e-team-${userId}`
		};
		await db
			.insert(schema.teamMember)
			.values(teamMember)
			.onConflictDoUpdate({ target: schema.teamMember.id, set: teamMember });
	}

	await upsertTeamMember(E2E_MGMT_ADMIN_ID, 'PARTICIPANT_CARE');
	await upsertTeamMember(E2E_PAYMENT_ADMIN_ID, 'PARTICIPANT_CARE');
	await upsertTeamMember(E2E_ASSIGNMENT_ADMIN_ID, 'PROJECT_MANAGEMENT');
	await upsertTeamMember(E2E_PAPER_REVIEWER_ID, 'REVIEWER');
	await upsertTeamMember(E2E_TEAM_COORDINATOR_ID, 'TEAM_COORDINATOR');

	// --- management fixture: a participant who never logs in, just gets acted on ---
	const mgmtTargetParticipant = {
		...makeSeedSingleParticipant({
			conferenceId: conference.id,
			userId: E2E_MGMT_TARGET_USER_ID,
			applied: true,
			// The UserCard's "Status" tab (where the payment widget lives) only renders once the
			// participant has conference access, which requires an assigned role - see
			// hasConferenceAccess in UserCardContent.svelte.
			assignedRoleId: E2E_ROLE_ID
		}),
		id: E2E_MGMT_TARGET_SINGLE_PARTICIPANT_ID
	};
	await db
		.insert(schema.singleParticipant)
		.values(mgmtTargetParticipant)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: mgmtTargetParticipant });

	// --- connect-supervisor fixture: a supervisor with a fixed code, and a single participant
	// who isn't connected to them yet, ready to type the code in ---
	const connectSupervisor = {
		id: E2E_SUPERVISOR_ID,
		plansOwnAttendenceAtConference: true,
		conferenceId: conference.id,
		userId: E2E_SUPERVISOR_FOR_CONNECT_USER_ID,
		connectionCode: E2E_SUPERVISOR_CONNECTION_CODE
	};
	await db
		.insert(schema.conferenceSupervisor)
		.values(connectSupervisor)
		.onConflictDoUpdate({ target: schema.conferenceSupervisor.id, set: connectSupervisor });
	const connectParticipant = {
		...makeSeedSingleParticipant({
			conferenceId: conference.id,
			userId: E2E_CONNECT_PARTICIPANT_ID,
			applied: false
		}),
		id: E2E_CONNECT_SINGLE_PARTICIPANT_ID
	};
	await db
		.insert(schema.singleParticipant)
		.values(connectParticipant)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: connectParticipant });

	// pre-linked to the same supervisor (via seed, not the connect-supervisor test's own
	// mutation) so the group-payment default selection has more than just the supervisor.
	const supervisedParticipant = {
		...makeSeedSingleParticipant({
			conferenceId: conference.id,
			userId: E2E_SUPERVISED_PARTICIPANT_USER_ID,
			applied: false
		}),
		id: E2E_SUPERVISED_SINGLE_PARTICIPANT_ID
	};
	await db
		.insert(schema.singleParticipant)
		.values(supervisedParticipant)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: supervisedParticipant });
	await db
		.insert(schema.conferenceSupervisorToSingleParticipant)
		.values({ a: E2E_SUPERVISOR_ID, b: E2E_SUPERVISED_SINGLE_PARTICIPANT_ID })
		.onConflictDoNothing();

	// --- assignment fixture: a real delegation the admin assigns a nation to ---
	const assignmentDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_ASSIGNMENT_DELEGATION_ID,
		entryCode: 'ASSIGN'
	};
	await db
		.insert(schema.delegation)
		.values(assignmentDelegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: assignmentDelegation });
	const assignmentDelegationMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: assignmentDelegation.id,
			userId: E2E_ASSIGNMENT_DELEGATE_USER_ID,
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmember0001'
	};
	await db
		.insert(schema.delegationMember)
		.values(assignmentDelegationMember)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: assignmentDelegationMember });

	// --- split fixture: a 2-member delegation for the delegation-splitting assignment path ---
	// sendAssignmentData splits by re-parenting members into brand new child Delegations, which
	// conflicts with the per-conference user uniqueness if a previous test run already moved these
	// users into a (now-orphaned) child delegation - clear their membership first so this stays
	// idempotent across repeated runs.
	await db
		.delete(schema.delegationMember)
		.where(
			and(
				eq(schema.delegationMember.conferenceId, conference.id),
				inArray(schema.delegationMember.userId, [E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID])
			)
		);
	const splitDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_SPLIT_DELEGATION_ID,
		entryCode: 'SPLITX'
	};
	await db
		.insert(schema.delegation)
		.values(splitDelegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: splitDelegation });
	for (const [i, userId] of [E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID].entries()) {
		const member = {
			...makeSeedDelegationMember({
				conferenceId: conference.id,
				delegationId: splitDelegation.id,
				userId,
				isHeadDelegate: i === 0
			}),
			// Their own ids: `…member0004` belongs to the committee-assignment fixture below, whose
			// upsert used to move the second split member out of this delegation.
			id: `e2e00000delegationmembersplit${i + 1}`
		};
		await db
			.insert(schema.delegationMember)
			.values(member)
			.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
	}

	// --- delegation preferences fixture: nations with plenty of seats to pick as preferences ---
	for (let i = 0; i < E2E_PREFS_NATION_ALPHA3S.length; i++) {
		await upsertNation(E2E_PREFS_NATION_ALPHA3S[i], E2E_PREFS_NATION_ALPHA2S[i]);
	}
	const prefsCommittee = {
		...makeSeedCommittee({ conferenceId: conference.id }),
		id: E2E_PREFS_COMMITTEE_ID,
		name: 'E2E Preferences Committee',
		abbreviation: 'PREF',
		numOfSeatsPerDelegation: 3
	};
	await db
		.insert(schema.committee)
		.values(prefsCommittee)
		.onConflictDoUpdate({ target: schema.committee.id, set: prefsCommittee });
	await db
		.insert(schema.committeeToNation)
		.values(E2E_PREFS_NATION_ALPHA3S.map((alpha3Code) => ({ a: prefsCommittee.id, b: alpha3Code })))
		.onConflictDoNothing();

	// --- paper fixture: a delegation already assigned to the committee/nation, ready to submit ---
	const paperDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_PAPER_DELEGATION_ID,
		entryCode: 'PAPERS',
		assignedNationAlpha3Code: E2E_NATION_ALPHA3
	};
	await db
		.insert(schema.delegation)
		.values(paperDelegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: paperDelegation });
	const paperDelegationMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: paperDelegation.id,
			userId: E2E_PAPER_DELEGATE_USER_ID,
			assignedCommitteeId: committee.id,
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmember0002'
	};
	await db
		.insert(schema.delegationMember)
		.values(paperDelegationMember)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: paperDelegationMember });

	// --- draft paper fixture: ready for paper-editing.spec.ts to edit and submit ---
	const draftPaper = {
		id: E2E_DRAFT_PAPER_ID,
		type: 'POSITION_PAPER' as const,
		status: 'DRAFT' as const,
		authorId: E2E_PAPER_DELEGATE_USER_ID,
		conferenceId: conference.id,
		delegationId: paperDelegation.id,
		agendaItemId: E2E_AGENDA_ITEM_ID,
		firstSubmittedAt: null
	};
	await db
		.insert(schema.paper)
		.values(draftPaper)
		.onConflictDoUpdate({ target: schema.paper.id, set: draftPaper });
	// Make the fixture idempotent across runs against a persistent database. A previous run
	// submits this paper (and paper-review.spec can leave an accepted version behind), which
	// adds PaperVersion rows and sets firstSubmittedAt - after which the app treats a further
	// submit as a REVISED resubmission rather than SUBMITTED. Drop every version so the paper
	// starts each run as a never-submitted draft. Reviews cascade with their version.
	await db.delete(schema.paperVersion).where(eq(schema.paperVersion.paperId, draftPaper.id));
	const draftPaperVersion = {
		id: E2E_DRAFT_PAPER_VERSION_ID,
		version: 1,
		status: 'DRAFT' as const,
		// The app stores the editor doc as a JSON *string* inside the jsonb column (see
		// paperhub/[paperId] save path), and `PaperVersion.contentHash` md5-hashes that value
		// directly - handing it a raw object makes hash-wasm throw "Invalid data type!" and
		// nulls the whole `paper` query. Match the app's real storage format.
		content: JSON.stringify({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seeded draft content.' }] }]
		}),
		paperId: draftPaper.id
	};
	await db
		.insert(schema.paperVersion)
		.values(draftPaperVersion)
		.onConflictDoUpdate({ target: schema.paperVersion.id, set: draftPaperVersion });

	// --- second conference, already in PREPARATION, with one assigned participant ---
	const prepConference = {
		...makeSeedConference({ state: 'PREPARATION' }),
		id: E2E_PREP_CONFERENCE_ID,
		title: 'E2E Prep Conference'
	};
	await db
		.insert(schema.conference)
		.values(prepConference)
		.onConflictDoUpdate({ target: schema.conference.id, set: prepConference });
	await upsertNation(E2E_PREP_NATION_ALPHA3, E2E_PREP_NATION_ALPHA2);
	const prepCommittee = {
		...makeSeedCommittee({ conferenceId: prepConference.id }),
		id: E2E_PREP_COMMITTEE_ID,
		name: 'E2E Prep Committee',
		abbreviation: 'PREP',
		numOfSeatsPerDelegation: 1
	};
	await db
		.insert(schema.committee)
		.values(prepCommittee)
		.onConflictDoUpdate({ target: schema.committee.id, set: prepCommittee });
	await db
		.insert(schema.committeeToNation)
		.values({ a: prepCommittee.id, b: E2E_PREP_NATION_ALPHA3 })
		.onConflictDoNothing();
	const prepDelegation = {
		...makeSeedDelegation({ conferenceId: prepConference.id, applied: true }),
		id: E2E_PREP_DELEGATION_ID,
		entryCode: 'PREPEC',
		assignedNationAlpha3Code: E2E_PREP_NATION_ALPHA3
	};
	await db
		.insert(schema.delegation)
		.values(prepDelegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: prepDelegation });
	await upsertActorUser(E2E_PREP_PARTICIPANT_USER_ID);
	const prepMember = {
		...makeSeedDelegationMember({
			conferenceId: prepConference.id,
			delegationId: prepDelegation.id,
			userId: E2E_PREP_PARTICIPANT_USER_ID,
			isHeadDelegate: true,
			assignedCommitteeId: prepCommittee.id
		}),
		id: 'e2e00000delegationmember0005'
	};
	await db
		.insert(schema.delegationMember)
		.values(prepMember)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: prepMember });

	// --- survey fixture: a published question with two options, ready to be answered ---
	const surveyQuestion = {
		id: E2E_SURVEY_QUESTION_ID,
		conferenceId: prepConference.id,
		title: E2E_SURVEY_QUESTION_TITLE,
		description: 'Seeded by the e2e suite.',
		draft: false,
		hidden: false,
		showSelectionOnDashboard: true,
		deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
	};
	await db
		.insert(schema.surveyQuestion)
		.values(surveyQuestion)
		.onConflictDoUpdate({ target: schema.surveyQuestion.id, set: surveyQuestion });
	for (const option of [
		{ id: E2E_SURVEY_OPTION_A_ID, title: E2E_SURVEY_OPTION_A_TITLE },
		{ id: E2E_SURVEY_OPTION_B_ID, title: E2E_SURVEY_OPTION_B_TITLE }
	]) {
		const surveyOption = {
			...option,
			questionId: surveyQuestion.id,
			description: 'Seeded option.',
			upperLimit: 0
		};
		await db
			.insert(schema.surveyOption)
			.values(surveyOption)
			.onConflictDoUpdate({ target: schema.surveyOption.id, set: surveyOption });
	}
	// Answers are unique per (questionId, userId); clearing them keeps the "has not answered yet"
	// precondition true on every run against a persistent database.
	await db.delete(schema.surveyAnswer).where(eq(schema.surveyAnswer.questionId, surveyQuestion.id));

	// --- committee assignment fixture: a delegation assigned a nation, member needs a committee ---
	const committeeAssignDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_COMMITTEE_ASSIGN_DELEGATION_ID,
		entryCode: 'COMASN',
		assignedNationAlpha3Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA3
	};
	await db
		.insert(schema.delegation)
		.values(committeeAssignDelegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: committeeAssignDelegation });
	const committeeAssignMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: committeeAssignDelegation.id,
			userId: E2E_COMMITTEE_ASSIGN_HEAD_USER_ID,
			isHeadDelegate: true,
			assignedCommitteeId: null
		}),
		id: 'e2e00000delegationmember0004'
	};
	await db
		.insert(schema.delegationMember)
		.values(committeeAssignMember)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: committeeAssignMember });

	console.log(`[e2e seed] ready: conference=${conference.id} role=${role.id}`);
}

if (import.meta.main) {
	await seed();
	process.exit(0);
}
