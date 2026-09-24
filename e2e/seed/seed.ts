/**
 * Minimal, deterministic fixture data for the Playwright e2e suite.
 *
 * This intentionally does NOT reuse prisma/seed/dev/seed.ts: that script seeds ~1000 users and
 * five fully-populated conferences (including assignment data for non-PARTICIPANT_REGISTRATION
 * conferences), which is both slow and, at the time of writing, fails outright in some
 * environments (a PrismaClientValidationError surfaces from one of its concurrent
 * `db.delegation.update()` calls). e2e fixtures should be small, fast, and owned by the e2e
 * suite so they don't drift or break with unrelated dev-seed changes.
 *
 * Idempotent: safe to run against an already-seeded database (upserts by fixed id).
 * Used both as Playwright's `globalSetup` (default export) and standalone (`bun e2e/seed/seed.ts`).
 *
 * ID scheme: "actor" users (team members/reviewers/etc that log in during a test) get a fixed,
 * predictable id so a spec can seed their DB rows here and then log in as them - the app derives
 * a user's DB id straight from the OIDC `sub` claim, and the mock-oauth2-server login form uses
 * whatever `preferred_username` we send as the token's `sub` (see e2e/support/auth.ts
 * `fixedTestUser`). "Target" users (acted upon, never log in themselves) are just plain seeded
 * rows.
 */
import { PrismaClient, ConferenceState } from '@prisma/client';
import { makeSeedConference } from '../../prisma/seed/dev/conference';
import { makeSeedCustomConferenceRole } from '../../prisma/seed/dev/customConferenceRole';
import { makeSeedCommittee } from '../../prisma/seed/dev/committee';
import { makeSeedUser } from '../../prisma/seed/dev/user';
import { makeSeedTeamMember } from '../../prisma/seed/dev/teamMember';
import { makeSeedSingleParticipant } from '../../prisma/seed/dev/singleParticipant';
import { makeSeedDelegation } from '../../prisma/seed/dev/delegation';
import { makeSeedDelegationMember } from '../../prisma/seed/dev/delegationMember';

export const E2E_CONFERENCE_ID = 'e2e00000conference0000001';
export const E2E_ROLE_ID = 'e2e00000role0000000000001';
export const E2E_ROLE_2_ID = 'e2e00000role0000000000002';

export const E2E_NATION_ALPHA3 = 'DEU';
export const E2E_NATION_ALPHA2 = 'DE';
export const E2E_COMMITTEE_ID = 'e2e00000committee000000001';
export const E2E_AGENDA_ITEM_ID = 'e2e00000agendaitem00000001';

// A Delegation can only be assigned one nation per conference at a time
// (@@unique([conferenceId, assignedNationAlpha3Code])) - the paper fixture below already
// occupies E2E_NATION_ALPHA3, so the assignment flow gets its own nation to assign.
export const E2E_ASSIGNMENT_NATION_ALPHA3 = 'FRA';
export const E2E_ASSIGNMENT_NATION_ALPHA2 = 'FR';

// The committee-assignment fixture needs a delegation that ALREADY holds a nation, but it must
// not be the one assignment.spec.ts assigns: that spec upserts FRA onto its own delegation, and
// @@unique([conferenceId, assignedNationAlpha3Code]) means only one delegation per conference
// can hold a given nation. Sharing one constant made the two fixtures collide.
export const E2E_COMMITTEE_ASSIGN_NATION_ALPHA3 = 'ITA';
export const E2E_COMMITTEE_ASSIGN_NATION_ALPHA2 = 'IT';

// A published survey (draft=false, hidden=false) with two options, so the participant-facing
// answering flow has something deterministic to answer. The admin spec creates its own survey
// rather than reusing this one, so the two never contend for @@unique([conferenceId, title]).
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
export const E2E_PAPER_DELEGATE_USER_ID = 'e2e-paper-delegate';
export const E2E_PAPER_DELEGATION_ID = 'e2e00000delegation00000002';

export default async function seed() {
	const db = new PrismaClient();

	const conference = {
		...makeSeedConference({
			state: ConferenceState.PARTICIPANT_REGISTRATION,
			// Registration only shows as OPEN while startAssignment is in the future
			// (see src/lib/services/registrationStatus.ts) - the dev seed helper defaults this
			// to a past date for PARTICIPANT_REGISTRATION, which would leave it CLOSED here.
			startAssignment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		}),
		id: E2E_CONFERENCE_ID,
		title: 'E2E Test Conference',
		isOpenPaperSubmission: true
	};

	await db.conference.upsert({
		where: { id: conference.id },
		update: conference,
		create: conference
	});

	const role = {
		...makeSeedCustomConferenceRole({ conferenceId: conference.id }),
		id: E2E_ROLE_ID,
		name: 'E2E Test Role'
	};

	await db.customConferenceRole.upsert({
		where: { id: role.id },
		update: role,
		create: role
	});

	// A second role so single-participant dashboard tests can exercise "add another application"
	// with a genuinely different role, then delete the first one.
	const role2 = {
		...makeSeedCustomConferenceRole({ conferenceId: conference.id }),
		id: E2E_ROLE_2_ID,
		name: 'E2E Test Role 2'
	};
	await db.customConferenceRole.upsert({
		where: { id: role2.id },
		update: role2,
		create: role2
	});

	await db.nation.upsert({
		where: { alpha3Code: E2E_NATION_ALPHA3 },
		update: { alpha2Code: E2E_NATION_ALPHA2 },
		create: { alpha3Code: E2E_NATION_ALPHA3, alpha2Code: E2E_NATION_ALPHA2 }
	});
	await db.nation.upsert({
		where: { alpha3Code: E2E_ASSIGNMENT_NATION_ALPHA3 },
		update: { alpha2Code: E2E_ASSIGNMENT_NATION_ALPHA2 },
		create: {
			alpha3Code: E2E_ASSIGNMENT_NATION_ALPHA3,
			alpha2Code: E2E_ASSIGNMENT_NATION_ALPHA2
		}
	});

	await db.nation.upsert({
		where: { alpha3Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA3 },
		update: { alpha2Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA2 },
		create: {
			alpha3Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA3,
			alpha2Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA2
		}
	});

	const committee = {
		...makeSeedCommittee({
			conferenceId: conference.id,
			// also connected to the "assignment" nation (FRA) so the committee-assignment fixture
			// can use a nation the paper fixture below hasn't already claimed (a Delegation can
			// only be assigned one nation per conference: @@unique([conferenceId, assignedNationAlpha3Code])).
			nations: {
				connect: [
					{ alpha3Code: E2E_NATION_ALPHA3 },
					{ alpha3Code: E2E_ASSIGNMENT_NATION_ALPHA3 },
					{ alpha3Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA3 }
				]
			}
		}),
		id: E2E_COMMITTEE_ID,
		name: 'E2E Test Committee',
		abbreviation: 'E2E',
		numOfSeatsPerDelegation: 1
	};

	await db.committee.upsert({
		where: { id: committee.id },
		update: committee,
		create: committee
	});

	await db.committeeAgendaItem.upsert({
		where: { id: E2E_AGENDA_ITEM_ID },
		update: { title: 'E2E Test Agenda Item', committeeId: committee.id },
		create: { id: E2E_AGENDA_ITEM_ID, title: 'E2E Test Agenda Item', committeeId: committee.id }
	});

	// --- users that log in during a test (id must match the OIDC claims used to log in) ---
	async function upsertActorUser(id: string, overrides: Partial<{ family_name: string }> = {}) {
		const user = { ...makeSeedUser(), id, email: `${id}@e2e.test`, ...overrides };
		await db.user.upsert({ where: { id }, update: user, create: user });
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
	await upsertActorUser(E2E_MGMT_TARGET_USER_ID, { family_name: E2E_MGMT_TARGET_FAMILY_NAME });
	await upsertActorUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID);
	await upsertActorUser(E2E_CONNECT_PARTICIPANT_ID);
	await upsertActorUser(E2E_SUPERVISED_PARTICIPANT_USER_ID);
	await upsertActorUser(E2E_COMMITTEE_ASSIGN_HEAD_USER_ID);

	async function upsertTeamMember(
		userId: string,
		role: 'PARTICIPANT_CARE' | 'PROJECT_MANAGEMENT' | 'REVIEWER'
	) {
		const teamMember = {
			...makeSeedTeamMember({ conferenceId: conference.id, userId, role }),
			id: `e2e-team-${userId}`
		};
		await db.teamMember.upsert({
			where: { id: teamMember.id },
			update: teamMember,
			create: teamMember
		});
	}

	await upsertTeamMember(E2E_MGMT_ADMIN_ID, 'PARTICIPANT_CARE');
	await upsertTeamMember(E2E_PAYMENT_ADMIN_ID, 'PARTICIPANT_CARE');
	await upsertTeamMember(E2E_ASSIGNMENT_ADMIN_ID, 'PROJECT_MANAGEMENT');
	await upsertTeamMember(E2E_PAPER_REVIEWER_ID, 'REVIEWER');

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
	await db.singleParticipant.upsert({
		where: { id: mgmtTargetParticipant.id },
		update: mgmtTargetParticipant,
		create: mgmtTargetParticipant
	});

	// --- connect-supervisor fixture: a supervisor with a fixed code, and a single participant
	// who isn't connected to them yet, ready to type the code in ---
	const connectSupervisor = {
		id: E2E_SUPERVISOR_ID,
		plansOwnAttendenceAtConference: true,
		conferenceId: conference.id,
		userId: E2E_SUPERVISOR_FOR_CONNECT_USER_ID,
		connectionCode: E2E_SUPERVISOR_CONNECTION_CODE
	};
	await db.conferenceSupervisor.upsert({
		where: { id: connectSupervisor.id },
		update: connectSupervisor,
		create: connectSupervisor
	});
	const connectParticipant = {
		...makeSeedSingleParticipant({
			conferenceId: conference.id,
			userId: E2E_CONNECT_PARTICIPANT_ID,
			applied: false
		}),
		id: E2E_CONNECT_SINGLE_PARTICIPANT_ID
	};
	await db.singleParticipant.upsert({
		where: { id: connectParticipant.id },
		update: connectParticipant,
		create: connectParticipant
	});

	// pre-linked to the same supervisor (via seed, not the connect-supervisor test's own
	// mutation) so the group-payment default selection has more than just the supervisor.
	const { id: _skipId, ...supervisedParticipantFields } = makeSeedSingleParticipant({
		conferenceId: conference.id,
		userId: E2E_SUPERVISED_PARTICIPANT_USER_ID,
		applied: false
	});
	await db.singleParticipant.upsert({
		where: { id: E2E_SUPERVISED_SINGLE_PARTICIPANT_ID },
		update: { ...supervisedParticipantFields, supervisors: { connect: { id: E2E_SUPERVISOR_ID } } },
		create: {
			...supervisedParticipantFields,
			id: E2E_SUPERVISED_SINGLE_PARTICIPANT_ID,
			supervisors: { connect: { id: E2E_SUPERVISOR_ID } }
		}
	});

	// --- assignment fixture: a real delegation the admin assigns a nation to ---
	const assignmentDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_ASSIGNMENT_DELEGATION_ID,
		entryCode: 'ASSIGN'
	};
	await db.delegation.upsert({
		where: { id: assignmentDelegation.id },
		update: assignmentDelegation,
		create: assignmentDelegation
	});
	const assignmentDelegationMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: assignmentDelegation.id,
			userId: E2E_ASSIGNMENT_DELEGATE_USER_ID,
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmember0001'
	};
	await db.delegationMember.upsert({
		where: { id: assignmentDelegationMember.id },
		update: assignmentDelegationMember,
		create: assignmentDelegationMember
	});

	// --- split fixture: a 2-member delegation for the delegation-splitting assignment path ---
	// sendAssignmentData splits by re-parenting members into brand new child Delegations, which
	// conflicts with @@unique([conferenceId, userId]) if a previous test run already moved these
	// users into a (now-orphaned) child delegation - clear their membership first so this stays
	// idempotent across repeated runs.
	await db.delegationMember.deleteMany({
		where: {
			conferenceId: conference.id,
			userId: { in: [E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID] }
		}
	});
	const splitDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_SPLIT_DELEGATION_ID,
		entryCode: 'SPLITX'
	};
	await db.delegation.upsert({
		where: { id: splitDelegation.id },
		update: splitDelegation,
		create: splitDelegation
	});
	for (const [i, userId] of [E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID].entries()) {
		const member = {
			...makeSeedDelegationMember({
				conferenceId: conference.id,
				delegationId: splitDelegation.id,
				userId,
				isHeadDelegate: i === 0
			}),
			id: `e2e00000delegationmember000${3 + i}`
		};
		await db.delegationMember.upsert({
			where: { id: member.id },
			update: member,
			create: member
		});
	}

	// --- delegation preferences fixture: nations with plenty of seats to pick as preferences ---
	for (let i = 0; i < E2E_PREFS_NATION_ALPHA3S.length; i++) {
		await db.nation.upsert({
			where: { alpha3Code: E2E_PREFS_NATION_ALPHA3S[i] },
			update: { alpha2Code: E2E_PREFS_NATION_ALPHA2S[i] },
			create: {
				alpha3Code: E2E_PREFS_NATION_ALPHA3S[i],
				alpha2Code: E2E_PREFS_NATION_ALPHA2S[i]
			}
		});
	}
	const prefsCommittee = {
		...makeSeedCommittee({
			conferenceId: conference.id,
			nations: { connect: E2E_PREFS_NATION_ALPHA3S.map((alpha3Code) => ({ alpha3Code })) }
		}),
		id: E2E_PREFS_COMMITTEE_ID,
		name: 'E2E Preferences Committee',
		abbreviation: 'PREF',
		numOfSeatsPerDelegation: 3
	};
	await db.committee.upsert({
		where: { id: prefsCommittee.id },
		update: prefsCommittee,
		create: prefsCommittee
	});

	// --- paper fixture: a delegation already assigned to the committee/nation, ready to submit ---
	const paperDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_PAPER_DELEGATION_ID,
		entryCode: 'PAPERS',
		assignedNationAlpha3Code: E2E_NATION_ALPHA3
	};
	await db.delegation.upsert({
		where: { id: paperDelegation.id },
		update: paperDelegation,
		create: paperDelegation
	});
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
	await db.delegationMember.upsert({
		where: { id: paperDelegationMember.id },
		update: paperDelegationMember,
		create: paperDelegationMember
	});

	// --- draft paper fixture: ready for paper-editing.spec.ts to edit and submit ---
	const draftPaper = {
		id: E2E_DRAFT_PAPER_ID,
		type: 'POSITION_PAPER' as const,
		status: 'DRAFT' as const,
		authorId: E2E_PAPER_DELEGATE_USER_ID,
		conferenceId: conference.id,
		delegationId: paperDelegation.id,
		agendaItemId: E2E_AGENDA_ITEM_ID
	};
	await db.paper.upsert({
		where: { id: draftPaper.id },
		update: { ...draftPaper, firstSubmittedAt: null },
		create: draftPaper
	});
	// Make the fixture idempotent across runs against a persistent database. A previous run
	// submits this paper (and paper-review.spec can leave an accepted version behind), which
	// adds PaperVersion rows and sets firstSubmittedAt - after which the app treats a further
	// submit as a REVISED resubmission rather than SUBMITTED. Drop every version so the paper
	// starts each run as a never-submitted draft. Reviews cascade with their version.
	await db.paperVersion.deleteMany({ where: { paperId: draftPaper.id } });
	const draftPaperVersion = {
		id: E2E_DRAFT_PAPER_VERSION_ID,
		version: 1,
		status: 'DRAFT' as const,
		// The app stores the editor doc as a JSON *string* inside the Json column (see
		// paperhub/[paperId] save path), and `PaperVersion.contentHash` md5-hashes that value
		// directly - handing it a raw object makes hash-wasm throw "Invalid data type!" and
		// nulls the whole findUniquePaper query. Match the app's real storage format.
		content: JSON.stringify({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seeded draft content.' }] }]
		}),
		paperId: draftPaper.id
	};
	await db.paperVersion.upsert({
		where: { id: draftPaperVersion.id },
		update: draftPaperVersion,
		create: draftPaperVersion
	});

	// --- second conference, already in PREPARATION, with one assigned participant ---
	const prepConference = {
		...makeSeedConference({ state: ConferenceState.PREPARATION }),
		id: E2E_PREP_CONFERENCE_ID,
		title: 'E2E Prep Conference'
	};
	await db.conference.upsert({
		where: { id: prepConference.id },
		update: prepConference,
		create: prepConference
	});
	await db.nation.upsert({
		where: { alpha3Code: E2E_PREP_NATION_ALPHA3 },
		update: { alpha2Code: E2E_PREP_NATION_ALPHA2 },
		create: { alpha3Code: E2E_PREP_NATION_ALPHA3, alpha2Code: E2E_PREP_NATION_ALPHA2 }
	});
	const prepCommittee = {
		...makeSeedCommittee({
			conferenceId: prepConference.id,
			nations: { connect: [{ alpha3Code: E2E_PREP_NATION_ALPHA3 }] }
		}),
		id: E2E_PREP_COMMITTEE_ID,
		name: 'E2E Prep Committee',
		abbreviation: 'PREP',
		numOfSeatsPerDelegation: 1
	};
	await db.committee.upsert({
		where: { id: prepCommittee.id },
		update: prepCommittee,
		create: prepCommittee
	});
	const prepDelegation = {
		...makeSeedDelegation({ conferenceId: prepConference.id, applied: true }),
		id: E2E_PREP_DELEGATION_ID,
		entryCode: 'PREPEC',
		assignedNationAlpha3Code: E2E_PREP_NATION_ALPHA3
	};
	await db.delegation.upsert({
		where: { id: prepDelegation.id },
		update: prepDelegation,
		create: prepDelegation
	});
	await upsertActorUser(E2E_PREP_PARTICIPANT_USER_ID);
	const prepMember = {
		...makeSeedDelegationMember({
			conferenceId: prepConference.id,
			delegationId: prepDelegation.id,
			userId: E2E_PREP_PARTICIPANT_USER_ID,
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmember0005',
		assignedCommitteeId: prepCommittee.id
	};
	await db.delegationMember.upsert({
		where: { id: prepMember.id },
		update: prepMember,
		create: prepMember
	});

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
	await db.surveyQuestion.upsert({
		where: { id: surveyQuestion.id },
		update: surveyQuestion,
		create: surveyQuestion
	});
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
		await db.surveyOption.upsert({
			where: { id: surveyOption.id },
			update: surveyOption,
			create: surveyOption
		});
	}
	// Answers are @@unique([questionId, userId]); clearing them keeps the "has not answered yet"
	// precondition true on every run against a persistent database.
	await db.surveyAnswer.deleteMany({ where: { questionId: surveyQuestion.id } });

	// --- committee assignment fixture: a delegation assigned a nation, member needs a committee ---
	const committeeAssignDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: E2E_COMMITTEE_ASSIGN_DELEGATION_ID,
		entryCode: 'COMASN',
		assignedNationAlpha3Code: E2E_COMMITTEE_ASSIGN_NATION_ALPHA3
	};
	await db.delegation.upsert({
		where: { id: committeeAssignDelegation.id },
		update: committeeAssignDelegation,
		create: committeeAssignDelegation
	});
	const committeeAssignMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: committeeAssignDelegation.id,
			userId: E2E_COMMITTEE_ASSIGN_HEAD_USER_ID,
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmember0004',
		assignedCommitteeId: null
	};
	await db.delegationMember.upsert({
		where: { id: committeeAssignMember.id },
		update: committeeAssignMember,
		create: committeeAssignMember
	});

	console.log(`[e2e seed] ready: conference=${conference.id} role=${role.id}`);

	await db.$disconnect();
}

if (import.meta.main) {
	await seed();
}
