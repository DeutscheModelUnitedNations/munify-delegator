import { type Transaction, db, schema } from '#api/db/db';
import {
	conferenceParticipantPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	paperPubsub,
	roleApplicationPubsub
} from '#api/pubsub';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import { fetchParticipationsAndTeamMembership } from '#api/services/registration/participation';
import {
	assertApplicationReady,
	assertRegistrationOpen
} from '#api/services/registration/applicationReadiness';
import { tidyRoleApplications } from '#api/handlers/roleApplication/tidyRoleApplications';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator';
import formatNames from '#lib/helpers/formatNames';
import type { ApplicationArgs } from '#api/services/registration/applicationArgs';
import { MIN_DELEGATION_MEMBERS, MIN_ROLE_APPLICATIONS } from '#lib/helpers/applicationReadiness';
import { m } from '#lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import type { UpdatableDelegation } from './delegationPermissions';
import { whereRows } from '#api/db/whereRows';
import { delegationColumnChanges } from './delegationColumnChanges';
import { apiError, codeNotFound } from '#api/services/errors';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService';
import { distinctSchoolNames } from '#lib/helpers/delegationSchools';
import { normalizeEntryCode } from '#lib/helpers/entryCode';

/**
 * Hands the head delegate role from the current holder to another member of the delegation.
 * Returns the ids of both, whose flag changed.
 */
async function transferHeadDelegate({
	tx,
	members,
	newHeadDelegateUserId
}: {
	tx: Transaction;
	members: { id: string; isHeadDelegate: boolean; participant: { userId: string } }[];
	newHeadDelegateUserId: string;
}) {
	const current = members.find((member) => member.isHeadDelegate);
	if (!current) {
		throw apiError({ code: 'NOT_FOUND', message: m.delegationNoHeadDelegate() });
	}
	const next = members.find((member) => member.participant.userId === newHeadDelegateUserId);
	if (!next) {
		throw apiError({ code: 'NOT_FOUND', message: m.delegationNoNewHeadDelegate() });
	}

	// The update ability was checked once, up front (`assertCanUpdateDelegation`), and these writes
	// go by id. Re-checking the ability per statement would revoke the acting head delegate's own
	// permission with the demotion, before the promotion ran.
	await tx
		.update(schema.delegationMember)
		.set({ isHeadDelegate: false })
		.where(whereRows({ table: schema.delegationMember, filter: { id: current.id } }));
	await tx
		.update(schema.delegationMember)
		.set({ isHeadDelegate: true })
		.where(whereRows({ table: schema.delegationMember, filter: { id: next.id } }));
	return [current.id, next.id];
}

/**
 * Creates a delegation with the caller as its head delegate, who applies with the school they
 * name (their own; the delegation keeps none). Returns the delegation's id.
 */
export async function createDelegationWithHead({
	userId,
	args
}: {
	userId: string;
	args: ApplicationArgs;
}) {
	await assertRegistrationOpen(args.conferenceId);
	// Refuses if the user already takes part in this conference in any role.
	await fetchParticipationsAndTeamMembership({
		conferenceId: args.conferenceId,
		userId,
		throwIfAnyIsFound: true
	});

	const created = await db.transaction(async (tx) => {
		const delegation = await tx
			.insert(schema.delegation)
			.values({
				conferenceId: args.conferenceId,
				motivation: args.motivation ?? undefined,
				experience: args.experience ?? undefined,
				entryCode: makeEntryCode()
			})
			.returning()
			.then(assertFirstEntryExists);

		// The creator becomes the head delegate.
		const participantId = await ensureConferenceParticipant({
			tx,
			conferenceId: delegation.conferenceId,
			userId
		});
		await tx.insert(schema.delegationMember).values({
			delegationId: delegation.id,
			conferenceParticipantId: participantId,
			isHeadDelegate: true
		});
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: await resolveSchoolChoice({ choice: args, tx })
		});

		return delegation;
	});
	delegationPubsub.created();
	delegationMemberPubsub.created();

	return created.id;
}

type DelegationDetailArgs = {
	id: string;
	applied?: boolean | null;
	resetEntryCode?: boolean | null;
	newHeadDelegateUserId?: string | null;
	experience?: string | null;
	motivation?: string | null;
};

/** Applies or withdraws the delegation's application; applying needs a complete one. */
async function setApplied({
	tx,
	delegation,
	args,
	applied
}: {
	tx: Transaction;
	delegation: UpdatableDelegation;
	args: DelegationDetailArgs;
	applied: boolean;
}) {
	// Drop applications the delegation has outgrown before judging whether it may apply.
	await tidyRoleApplications({ delegationId: delegation.id, tx });

	// Taking an application back reopens it for changes, which only makes sense while the
	// conference takes registrations; afterwards the assignment works with what was sent.
	if (!applied && delegation.conference.state !== 'PARTICIPANT_REGISTRATION') {
		throw apiError({ code: 'CONFLICT', message: m.applicationTimeframeClosed() });
	}

	if (applied) {
		if (delegation.members.length < MIN_DELEGATION_MEMBERS) {
			throw apiError({ code: 'CONFLICT', message: m.notEnoughMembers() });
		}
		assertApplicationReady({
			applicant: delegation,
			edits: args,
			minRoleApplications: MIN_ROLE_APPLICATIONS.delegation
		});
	}

	await tx
		.update(schema.delegation)
		.set({ applied })
		.where(whereRows({ table: schema.delegation, filter: { id: delegation.id } }));
}

/**
 * Applies the changes of `updateDelegation` to a delegation the caller may update
 * (`assertCanUpdateDelegation`), in one transaction: a refused application or head delegate
 * leaves the delegation as it was.
 */
export async function updateDelegationDetails({
	delegation,
	args
}: {
	delegation: UpdatableDelegation;
	args: DelegationDetailArgs;
}) {
	const changes = delegationColumnChanges({ args, newEntryCode: makeEntryCode });
	const newHeadDelegateUserId = args.newHeadDelegateUserId;
	const changedMemberIds = await db.transaction(async (tx) => {
		if (typeof args.applied === 'boolean')
			await setApplied({ tx, delegation, args, applied: args.applied });

		if (Object.keys(changes).length > 0) {
			await tx
				.update(schema.delegation)
				.set(changes)
				.where(whereRows({ table: schema.delegation, filter: { id: delegation.id } }));
		}

		return newHeadDelegateUserId
			? transferHeadDelegate({ tx, members: delegation.members, newHeadDelegateUserId })
			: [];
	});
	delegationPubsub.updated(delegation.id);
	if (changedMemberIds.length > 0) delegationMemberPubsub.updated(changedMemberIds);
}

/**
 * Deletes a delegation the caller may delete (`assertCanDeleteDelegation`). Its members, role
 * applications, papers and assignment draft rows cascade; the members' participant rows stay.
 */
export async function deleteDelegation({
	id,
	participantIds
}: {
	id: string;
	participantIds: readonly string[];
}) {
	await db.delete(schema.delegation).where(whereRows({ table: schema.delegation, filter: { id } }));
	delegationPubsub.removed();
	delegationMemberPubsub.removed();
	roleApplicationPubsub.removed();
	paperPubsub.removed();
	// what they take part as changed
	if (participantIds.length > 0) conferenceParticipantPubsub.updated([...participantIds]);
}

/** What somebody sees after entering a delegation's join code, before committing to join. */
export async function previewDelegationByEntryCode({
	conferenceId,
	entryCode
}: {
	conferenceId: string;
	entryCode: string;
}) {
	const delegation = await db.query.delegation.findFirst({
		where: { conferenceId, entryCode: normalizeEntryCode(entryCode) },
		with: {
			conference: { columns: { title: true } },
			members: {
				with: {
					user: { columns: { givenName: true, familyName: true } },
					participant: { with: { school: { columns: { id: true, name: true } } } }
				}
			}
		}
	});
	if (!delegation) throw codeNotFound();

	return {
		id: delegation.id,
		conferenceId: delegation.conferenceId,
		entryCode: delegation.entryCode,
		...headDelegatePreview(delegation.members.find((member) => member.isHeadDelegate)),
		schools: distinctSchoolNames(delegation.members.map((member) => member.participant.school)),
		memberCount: delegation.members.length,
		applied: delegation.applied,
		conferenceTitle: delegation.conference?.title ?? ''
	};
}

/** The head delegate's name, and their school, which the join form offers the newcomer as their own. */
function headDelegatePreview(
	headDelegate:
		| {
				user: { givenName: string; familyName: string } | null;
				participant: { school: { id: string; name: string } | null };
		  }
		| undefined
) {
	const school = headDelegate?.participant.school;
	return {
		headDelegateSchoolId: school?.id ?? null,
		headDelegateSchoolName: school?.name ?? null,
		headDelegateFullName: formatNames({
			givenName: headDelegate?.user?.givenName,
			familyName: headDelegate?.user?.familyName
		})
	};
}
