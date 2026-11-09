import { z } from 'zod';
import { roleSeats } from '#lib/helpers/conferenceRole';
import { MIN_GROUP_SIZE, SMALL_GROUP } from './classification';

/**
 * The task-shaped reads for participant care and project management: a few queries joined and
 * summed up the way the team pages do, which one GraphQL query cannot. The documents run through
 * the same path as every other tool (the caller's abilities, then redaction); what is here is the
 * computing over their answers, kept pure so it is tested on its own.
 */

/** The task tools read at most this many participants; beyond it they say they stopped. */
export const MAX_PARTICIPANT_ROWS = 10_000;

/** How many rows one page of a task tool's query asks for (the API answers at most 1000). */
export const PAGE_SIZE = 1000;

// --- Participants -------------------------------------------------------------------------------

export const PARTICIPANTS_QUERY = `
query McpParticipants($conferenceId: ID!, $limit: Int!, $offset: Int!) {
	conferenceParticipants(
		where: { conferenceId: { eq: $conferenceId } }
		orderBy: { id: asc }
		limit: $limit
		offset: $offset
	) {
		id
		userId
		ofAgeAtConference
		paymentStatus
		termsAndConditions
		guardianConsent
		mediaConsent
		mediaConsentStatus
		didAttend
		checkIssues
		school { id name city }
		user { city country }
		delegationMember { delegationId isHeadDelegate assignedCommitteeId }
		singleParticipant { id applied assignedRoleId }
		conferenceSupervisor { id plansOwnAttendenceAtConference }
	}
}`;

const nullableString = z.string().nullable().optional();

const participantRowSchema = z.object({
	id: z.string(),
	userId: z.string(),
	ofAgeAtConference: z.boolean().nullable().optional(),
	paymentStatus: z.string(),
	termsAndConditions: z.string(),
	guardianConsent: z.string(),
	mediaConsent: z.string(),
	mediaConsentStatus: nullableString,
	didAttend: z.boolean(),
	checkIssues: z.array(z.string()).nullable().optional(),
	school: z.object({ id: z.string(), name: z.string(), city: nullableString }).nullable(),
	user: z.object({ city: nullableString, country: nullableString }),
	delegationMember: z
		.object({
			delegationId: z.string(),
			isHeadDelegate: z.boolean(),
			assignedCommitteeId: nullableString
		})
		.nullable(),
	singleParticipant: z
		.object({ id: z.string(), applied: z.boolean(), assignedRoleId: nullableString })
		.nullable(),
	conferenceSupervisor: z
		.object({ id: z.string(), plansOwnAttendenceAtConference: z.boolean() })
		.nullable()
});

export const participantsDataSchema = z.object({
	conferenceParticipants: z.array(participantRowSchema)
});

type ParticipantRow = z.infer<typeof participantRowSchema>;

const PARTICIPANT_KINDS = ['DELEGATE', 'SINGLE_PARTICIPANT', 'SUPERVISOR', 'NONE'] as const;
type ParticipantKind = (typeof PARTICIPANT_KINDS)[number];

/** How a participant row takes part; `NONE` for a row kept after its registration ended. */
function participantKind(row: {
	delegationMember: unknown;
	singleParticipant: unknown;
	conferenceSupervisor: unknown;
}): ParticipantKind {
	if (row.delegationMember) return 'DELEGATE';
	if (row.singleParticipant) return 'SINGLE_PARTICIPANT';
	if (row.conferenceSupervisor) return 'SUPERVISOR';
	return 'NONE';
}

export const participantFilterSchema = z.object({
	kind: z.enum(PARTICIPANT_KINDS).optional(),
	paymentStatus: z.enum(['DONE', 'PENDING', 'PROBLEM']).optional(),
	termsAndConditions: z.enum(['DONE', 'PENDING', 'PROBLEM']).optional(),
	guardianConsent: z.enum(['DONE', 'PENDING', 'PROBLEM']).optional(),
	mediaConsent: z.enum(['DONE', 'PENDING', 'PROBLEM']).optional(),
	minor: z.boolean().optional(),
	didAttend: z.boolean().optional(),
	withCheckIssues: z.boolean().optional()
});

type ParticipantFilter = z.infer<typeof participantFilterSchema>;

function isMinor(row: ParticipantRow) {
	return row.ofAgeAtConference === false;
}

/** Whether the person is a minor at the conference, `null` while their birthday is unknown. */
function isMinorOrUnknown(row: ParticipantRow) {
	return typeof row.ofAgeAtConference === 'boolean' ? !row.ofAgeAtConference : null;
}

function matches({ row, filter }: { row: ParticipantRow; filter: ParticipantFilter }) {
	return (
		(filter.kind === undefined || participantKind(row) === filter.kind) &&
		(filter.paymentStatus === undefined || row.paymentStatus === filter.paymentStatus) &&
		(filter.termsAndConditions === undefined ||
			row.termsAndConditions === filter.termsAndConditions) &&
		(filter.guardianConsent === undefined || row.guardianConsent === filter.guardianConsent) &&
		(filter.mediaConsent === undefined || row.mediaConsent === filter.mediaConsent) &&
		(filter.minor === undefined || isMinor(row) === filter.minor) &&
		(filter.didAttend === undefined || row.didAttend === filter.didAttend) &&
		(filter.withCheckIssues === undefined ||
			(row.checkIssues?.length ?? 0) > 0 === filter.withCheckIssues)
	);
}

/** Counts of each value `of` takes over `rows`. */
function tally<T>({ rows, of }: { rows: readonly T[]; of: (row: T) => string }) {
	const counts: Record<string, number> = {};
	for (const row of rows) {
		const key = of(row);
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}

/**
 * The participants of a conference with their paperwork, filtered and paged, and a summary over
 * all of them: who takes part how, what is open, what is a problem.
 */
export function participantOverview({
	rows,
	filter,
	offset,
	limit
}: {
	rows: readonly ParticipantRow[];
	filter: ParticipantFilter;
	offset: number;
	limit: number;
}) {
	const registered = rows.filter((row) => participantKind(row) !== 'NONE');
	const minors = registered.filter(isMinor);
	const selected = rows.filter((row) => matches({ row, filter }));
	return {
		summary: {
			registered: registered.length,
			byKind: tally({ rows, of: participantKind }),
			paymentStatus: tally({ rows: registered, of: (row) => row.paymentStatus }),
			termsAndConditions: tally({ rows: registered, of: (row) => row.termsAndConditions }),
			mediaConsent: tally({ rows: registered, of: (row) => row.mediaConsent }),
			minors: minors.length,
			guardianConsentOfMinors: tally({ rows: minors, of: (row) => row.guardianConsent }),
			attended: registered.filter((row) => row.didAttend).length,
			withCheckIssues: registered.filter((row) => (row.checkIssues?.length ?? 0) > 0).length
		},
		matching: selected.length,
		offset,
		participants: selected.slice(offset, offset + limit).map((row) => ({
			participantId: row.id,
			userId: row.userId,
			kind: participantKind(row),
			minor: isMinorOrUnknown(row),
			paymentStatus: row.paymentStatus,
			termsAndConditions: row.termsAndConditions,
			guardianConsent: row.guardianConsent,
			mediaConsent: row.mediaConsent,
			mediaConsentStatus: row.mediaConsentStatus ?? null,
			didAttend: row.didAttend,
			checkIssues: row.checkIssues ?? [],
			school: row.school ? { id: row.school.id, name: row.school.name } : null,
			city: row.user.city ?? null,
			country: row.user.country ?? null,
			delegationId: row.delegationMember?.delegationId ?? null,
			isHeadDelegate: row.delegationMember?.isHeadDelegate ?? null,
			committeeId: row.delegationMember?.assignedCommitteeId ?? null,
			singleParticipantId: row.singleParticipant?.id ?? null,
			singleRoleId: row.singleParticipant?.assignedRoleId ?? null,
			supervisorId: row.conferenceSupervisor?.id ?? null
		}))
	};
}

// --- Counts by attributes -----------------------------------------------------------------------

export const COUNT_QUERY = `
query McpParticipantCounts($conferenceId: ID!, $limit: Int!, $offset: Int!) {
	conferenceParticipants(
		where: { conferenceId: { eq: $conferenceId } }
		orderBy: { id: asc }
		limit: $limit
		offset: $offset
	) {
		ofAgeAtConference
		paymentStatus
		termsAndConditions
		guardianConsent
		mediaConsent
		didAttend
		school { name }
		user { city country gender foodPreference }
		delegationMember { assignedCommitteeId delegation { assignedRoleId } }
		singleParticipant { assignedRoleId }
		conferenceSupervisor { id }
	}
}`;

const countRowSchema = z.object({
	ofAgeAtConference: z.boolean().nullable().optional(),
	paymentStatus: z.string(),
	termsAndConditions: z.string(),
	guardianConsent: z.string(),
	mediaConsent: z.string(),
	didAttend: z.boolean(),
	school: z.object({ name: z.string() }).nullable(),
	user: z.object({
		city: nullableString,
		country: nullableString,
		gender: nullableString,
		foodPreference: nullableString
	}),
	delegationMember: z
		.object({
			assignedCommitteeId: nullableString,
			delegation: z.object({ assignedRoleId: nullableString })
		})
		.nullable(),
	singleParticipant: z.object({ assignedRoleId: nullableString }).nullable(),
	conferenceSupervisor: z.object({ id: z.string() }).nullable()
});

export const countDataSchema = z.object({ conferenceParticipants: z.array(countRowSchema) });

type CountRow = z.infer<typeof countRowSchema>;

/** What participants can be counted by. */
export const COUNT_DIMENSIONS = [
	'kind',
	'minor',
	'paymentStatus',
	'termsAndConditions',
	'guardianConsent',
	'mediaConsent',
	'didAttend',
	'committeeId',
	'roleId',
	'school',
	'country',
	'city',
	'gender',
	'foodPreference'
] as const;

export type CountDimension = (typeof COUNT_DIMENSIONS)[number];

const DIMENSIONS: Record<CountDimension, (row: CountRow) => string | null> = {
	kind: participantKind,
	minor: (row) =>
		row.ofAgeAtConference === null || row.ofAgeAtConference === undefined
			? null
			: String(!row.ofAgeAtConference),
	paymentStatus: (row) => row.paymentStatus,
	termsAndConditions: (row) => row.termsAndConditions,
	guardianConsent: (row) => row.guardianConsent,
	mediaConsent: (row) => row.mediaConsent,
	didAttend: (row) => String(row.didAttend),
	committeeId: (row) => row.delegationMember?.assignedCommitteeId ?? null,
	roleId: (row) =>
		row.delegationMember?.delegation.assignedRoleId ??
		row.singleParticipant?.assignedRoleId ??
		null,
	school: (row) => row.school?.name ?? null,
	country: (row) => row.user.country ?? null,
	city: (row) => row.user.city ?? null,
	gender: (row) => row.user.gender ?? null,
	foodPreference: (row) => row.user.foodPreference ?? null
};

/** Dimensions redacted per person: counted only in groups of at least `MIN_GROUP_SIZE`. */
const SENSITIVE_DIMENSIONS: ReadonlySet<CountDimension> = new Set(['gender', 'foodPreference']);

/**
 * Why a grouping is refused: a redacted dimension next to any other. Every other dimension is
 * one an assistant reads per person (`participant_overview`, `graphql_query`), so a small group,
 * or two exact counts subtracted from each other, would tell the gender or diet of people it can
 * name by id. Gender and diet are only ever counted alone or together.
 */
export function countGroupingProblem(groupBy: readonly CountDimension[]) {
	const sensitive = groupBy.filter((dimension) => SENSITIVE_DIMENSIONS.has(dimension));
	const perPerson = groupBy.filter((dimension) => !SENSITIVE_DIMENSIONS.has(dimension));
	if (sensitive.length === 0 || perPerson.length === 0) return undefined;
	return `${sensitive.join(' and ')} cannot be counted together with ${perPerson.join(', ')}: those are known per person, so the counts would tell who is who.`;
}

/** Counts a group too small to show reads as: `<5`, or exactly when it is none. */
function maskedCount(count: number) {
	return count > 0 && count < MIN_GROUP_SIZE ? SMALL_GROUP : count;
}

/**
 * Counts the registered participants by the given dimensions. Grouped by a dimension redacted per
 * person (gender, diet), groups of fewer than `MIN_GROUP_SIZE` are left out, so no group points at
 * someone; how many people they hold together is `suppressed`, `<5` when that is small too. People
 * whose value the caller may not read count under `null`.
 */
export function participantCounts({
	rows,
	groupBy
}: {
	rows: readonly CountRow[];
	groupBy: readonly CountDimension[];
}) {
	const registered = rows.filter((row) => participantKind(row) !== 'NONE');
	const groups = new Map<string, { key: Record<string, string | null>; count: number }>();
	for (const row of registered) {
		const key = Object.fromEntries(
			groupBy.map((dimension) => [dimension, DIMENSIONS[dimension](row)])
		);
		const id = JSON.stringify(key);
		const group = groups.get(id) ?? { key, count: 0 };
		group.count += 1;
		groups.set(id, group);
	}
	const all = [...groups.values()].sort((a, b) => b.count - a.count);
	if (!groupBy.some((dimension) => SENSITIVE_DIMENSIONS.has(dimension))) {
		return { total: registered.length, groups: all.map(({ key, count }) => ({ ...key, count })) };
	}
	const shown = all.filter(({ count }) => count >= MIN_GROUP_SIZE);
	const suppressed = registered.length - shown.reduce((sum, { count }) => sum + count, 0);
	return {
		total: registered.length,
		groups: shown.map(({ key, count }) => ({ ...key, count })),
		suppressed: maskedCount(suppressed)
	};
}

// --- Assignment ---------------------------------------------------------------------------------

export const ASSIGNMENT_QUERY = `
query McpAssignment($conferenceId: ID!) {
	conference(id: $conferenceId) {
		state assignmentReleased maxCollectiveGroupSize maxGuaranteedSeatsPerForeignSchool
	}
	committees(where: { conferenceId: { eq: $conferenceId } }) {
		id abbreviation numOfSeatsPerDelegation roles { id }
	}
	conferenceRoles(where: { conferenceId: { eq: $conferenceId } }) {
		id kind name abbreviation nationAlpha3Code seatAmount
	}
	delegations(where: { conferenceId: { eq: $conferenceId }, applied: { eq: true } }) {
		id memberCount assignedRoleId
		appliedForRoles { roleId rank }
		assignmentReview { evaluation flagged disqualified required }
	}
	singleParticipants(where: { conference: { id: { eq: $conferenceId } }, applied: { eq: true } }) {
		id assignedRoleId
		appliedForRoles { id }
		assignmentReview { evaluation flagged disqualified required }
	}
	assignmentUnits(where: { conferenceId: { eq: $conferenceId } }) {
		id roleId sourceDelegationId sourceSingleParticipantId members { delegationMemberId }
	}
	assignmentSingleRoles(where: { singleParticipant: { conference: { id: { eq: $conferenceId } } } }) {
		roleId singleParticipantId
	}
}`;

const reviewSchema = z
	.object({
		evaluation: z.number().nullable(),
		flagged: z.boolean(),
		disqualified: z.boolean(),
		required: z.boolean()
	})
	.nullable();

export const assignmentDataSchema = z.object({
	conference: z.object({
		state: z.string(),
		assignmentReleased: z.boolean(),
		maxCollectiveGroupSize: z.number().nullable(),
		maxGuaranteedSeatsPerForeignSchool: z.number().nullable()
	}),
	committees: z.array(
		z.object({
			id: z.string(),
			abbreviation: z.string(),
			numOfSeatsPerDelegation: z.number(),
			roles: z.array(z.object({ id: z.string() }))
		})
	),
	conferenceRoles: z.array(
		z.object({
			id: z.string(),
			kind: z.enum(['NATION', 'NON_STATE_ACTOR', 'CUSTOM']),
			name: nullableString,
			abbreviation: nullableString,
			nationAlpha3Code: nullableString,
			seatAmount: z.number().nullable()
		})
	),
	delegations: z.array(
		z.object({
			id: z.string(),
			memberCount: z.number(),
			assignedRoleId: nullableString,
			appliedForRoles: z.array(z.object({ roleId: z.string(), rank: z.number() })),
			assignmentReview: reviewSchema
		})
	),
	singleParticipants: z.array(
		z.object({
			id: z.string(),
			assignedRoleId: nullableString,
			appliedForRoles: z.array(z.object({ id: z.string() })),
			assignmentReview: reviewSchema
		})
	),
	assignmentUnits: z.array(
		z.object({
			id: z.string(),
			roleId: nullableString,
			sourceDelegationId: nullableString,
			sourceSingleParticipantId: nullableString,
			members: z.array(z.object({ delegationMemberId: z.string() }))
		})
	),
	assignmentSingleRoles: z.array(
		z.object({ roleId: nullableString, singleParticipantId: z.string() })
	)
});

type AssignmentData = z.infer<typeof assignmentDataSchema>;

/**
 * Where the assignment stands: every role with its seats and how many hold it now, the draft's
 * size, what needs attention (required applications without a seat, roles holding more than they
 * seat), and a page of the applied delegations and single participants with their wishes and
 * sighting ratings.
 */
export function assignmentOverview({
	data,
	offset,
	limit
}: {
	data: AssignmentData;
	offset: number;
	limit: number;
}) {
	const held = new Map<string, number>();
	for (const delegation of data.delegations) {
		if (delegation.assignedRoleId) {
			held.set(
				delegation.assignedRoleId,
				(held.get(delegation.assignedRoleId) ?? 0) + delegation.memberCount
			);
		}
	}
	for (const single of data.singleParticipants) {
		if (single.assignedRoleId) {
			held.set(single.assignedRoleId, (held.get(single.assignedRoleId) ?? 0) + 1);
		}
	}

	const roles = data.conferenceRoles.map((role) => {
		const seats = roleSeats({ role, committees: data.committees });
		return {
			roleId: role.id,
			kind: role.kind,
			name: role.name ?? role.nationAlpha3Code ?? role.abbreviation ?? role.id,
			nationAlpha3Code: role.nationAlpha3Code ?? null,
			seats,
			held: held.get(role.id) ?? 0
		};
	});

	const planned = new Set([
		...data.assignmentUnits.flatMap((unit) =>
			[unit.sourceDelegationId, unit.sourceSingleParticipantId].filter(
				(id): id is string => typeof id === 'string'
			)
		),
		...data.assignmentSingleRoles.map((single) => single.singleParticipantId)
	]);

	const requiredWithoutSeat = [
		...data.delegations
			.filter((delegation) => delegation.assignmentReview?.required && !delegation.assignedRoleId)
			.filter((delegation) => !planned.has(delegation.id))
			.map((delegation) => ({ delegationId: delegation.id })),
		...data.singleParticipants
			.filter((single) => single.assignmentReview?.required && !single.assignedRoleId)
			.filter((single) => !planned.has(single.id))
			.map((single) => ({ singleParticipantId: single.id }))
	];

	const capped = [data.delegations, data.singleParticipants, data.conferenceRoles].some(
		(list) => list.length >= PAGE_SIZE
	);
	return {
		...(capped
			? {
					note: `A list reached ${PAGE_SIZE} rows, the most one query answers: totals cover those.`
				}
			: {}),
		conference: data.conference,
		totals: {
			seats: roles.reduce((sum, role) => sum + role.seats, 0),
			held: roles.reduce((sum, role) => sum + role.held, 0),
			appliedDelegations: data.delegations.length,
			appliedDelegates: data.delegations.reduce((sum, d) => sum + d.memberCount, 0),
			appliedSingleParticipants: data.singleParticipants.length,
			delegationsWithoutRole: data.delegations.filter((d) => !d.assignedRoleId).length,
			singleParticipantsWithoutRole: data.singleParticipants.filter((s) => !s.assignedRoleId).length
		},
		draft: {
			units: data.assignmentUnits.length,
			plannedSingleRoles: data.assignmentSingleRoles.length
		},
		attention: {
			requiredWithoutSeat,
			overfilledRoles: roles.filter((role) => role.held > role.seats).map((role) => role.roleId)
		},
		roles,
		page: { offset, limit },
		delegations: data.delegations.slice(offset, offset + limit).map((delegation) => ({
			delegationId: delegation.id,
			size: delegation.memberCount,
			assignedRoleId: delegation.assignedRoleId ?? null,
			wishes: [...delegation.appliedForRoles]
				.sort((a, b) => a.rank - b.rank)
				.map((wish) => wish.roleId),
			review: delegation.assignmentReview
		})),
		singleParticipants: data.singleParticipants.slice(offset, offset + limit).map((single) => ({
			singleParticipantId: single.id,
			assignedRoleId: single.assignedRoleId ?? null,
			wishes: single.appliedForRoles.map((role) => role.id),
			review: single.assignmentReview
		}))
	};
}
