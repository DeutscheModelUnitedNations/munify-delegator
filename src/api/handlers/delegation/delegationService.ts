import { type Transaction, db, schema } from '#api/db/db.js';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService.js';
import { fetchUserParticipations } from '#api/services/registration/participation.js';
import { assertApplicationReady } from '#api/services/registration/applicationReadiness.js';
import { tidyRoleApplications } from '#api/services/registration/tidyRoleApplications.js';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator.js';
import formatNames from '#lib/helpers/formatNames.js';
import { applicationFormSchema } from '#lib/schemata/applicationForm.js';
import {
	MIN_DELEGATION_MEMBERS,
	MIN_ROLE_APPLICATIONS
} from '#lib/helpers/applicationReadiness.js';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import type { UpdatableDelegation } from './delegationPermissions';
import { eq } from 'drizzle-orm';
import { delegationColumnChanges } from './delegationColumnChanges';
import { apiError } from '#api/services/errors/apiError.js';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService.js';
import { distinctSchoolNames } from '#lib/helpers/delegationSchools.js';

/** Hands the head delegate role from the current holder to another member of the delegation. */
async function transferHeadDelegate(
	tx: Transaction,
	members: { id: string; isHeadDelegate: boolean; participant: { userId: string } }[],
	newHeadDelegateUserId: string
) {
	const current = members.find((member) => member.isHeadDelegate);
	if (!current) {
		throw apiError('NOT_FOUND', m.delegationNoHeadDelegate());
	}
	const next = members.find((member) => member.participant.userId === newHeadDelegateUserId);
	if (!next) {
		throw apiError('NOT_FOUND', m.delegationNoNewHeadDelegate());
	}

	// Order is safe here only because the resolver checks the update ability once, up front
	// (`assertCanUpdateDelegation`), and these writes go by raw id rather than re-deriving an
	// ability filter per statement. The legacy Prisma/CASL port of this mutation re-evaluated the caller's `update`
	// ability on every statement inside the transaction, so demoting the acting head
	// delegate first revoked their own permission before the promotion ran. Don't
	// reintroduce a per-statement ability re-check here without also promoting first.
	await tx
		.update(schema.delegationMember)
		.set({ isHeadDelegate: false })
		.where(eq(schema.delegationMember.id, current.id));
	await tx
		.update(schema.delegationMember)
		.set({ isHeadDelegate: true })
		.where(eq(schema.delegationMember.id, next.id));
}

/**
 * Creates a delegation with the caller as its head delegate, who applies with the school they
 * name (their own; the delegation keeps none). Returns the delegation's id.
 */
export async function createDelegationWithHead(
	userId: string,
	args: SchoolChoice & {
		conferenceId: string;
		motivation?: string | null;
		experience?: string | null;
	}
) {
	applicationFormSchema.parse({
		schoolId: args.schoolId,
		schoolName: args.schoolName,
		motivation: args.motivation,
		experience: args.experience
	});

	// Refuses if the user already takes part in this conference in any role.
	await fetchUserParticipations({
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
		const participantId = await ensureConferenceParticipant(tx, delegation.conferenceId, userId);
		await tx.insert(schema.delegationMember).values({
			delegationId: delegation.id,
			conferenceParticipantId: participantId,
			isHeadDelegate: true
		});
		await setParticipantSchool(tx, [participantId], await resolveSchoolChoice(args, tx));

		return delegation;
	});

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
async function setApplied(
	tx: Transaction,
	delegation: UpdatableDelegation,
	args: DelegationDetailArgs,
	applied: boolean
) {
	// Drop applications the delegation has outgrown before judging whether it may apply.
	await tidyRoleApplications(delegation.id, tx);

	if (applied) {
		if (delegation.members.length < MIN_DELEGATION_MEMBERS) {
			throw apiError('CONFLICT', m.notEnoughMembers());
		}
		assertApplicationReady(delegation, args, MIN_ROLE_APPLICATIONS.delegation);
	}

	await tx
		.update(schema.delegation)
		.set({ applied })
		.where(eq(schema.delegation.id, delegation.id));
}

/**
 * Applies the changes of `updateDelegation` to a delegation the caller may update
 * (`assertCanUpdateDelegation`), in one transaction: a refused application or head delegate
 * leaves the delegation as it was. The caller publishes afterwards.
 */
export async function updateDelegationDetails(
	delegation: UpdatableDelegation,
	args: DelegationDetailArgs
) {
	applicationFormSchema.parse({ experience: args.experience, motivation: args.motivation });

	await db.transaction(async (tx) => {
		if (typeof args.applied === 'boolean') await setApplied(tx, delegation, args, args.applied);

		const changes = delegationColumnChanges(args, makeEntryCode);
		if (Object.keys(changes).length > 0) {
			await tx
				.update(schema.delegation)
				.set(changes)
				.where(eq(schema.delegation.id, delegation.id));
		}

		if (args.newHeadDelegateUserId) {
			await transferHeadDelegate(tx, delegation.members, args.newHeadDelegateUserId);
		}
	});
}

/** What somebody sees after entering a delegation's join code, before committing to join. */
export async function previewDelegationByEntryCode(conferenceId: string, entryCode: string) {
	const delegation = await db.query.delegation
		.findFirst({
			where: { conferenceId, entryCode },
			with: {
				conference: { columns: { title: true } },
				members: {
					with: {
						user: { columns: { givenName: true, familyName: true } },
						participant: { with: { school: { columns: { id: true, name: true } } } }
					}
				}
			}
		})
		.then(assertFindFirstExists);

	const headDelegate = delegation.members.find((member) => member.isHeadDelegate);

	return {
		id: delegation.id,
		conferenceId: delegation.conferenceId,
		entryCode: delegation.entryCode,
		motivation: delegation.motivation,
		// What the join form offers the newcomer as their own school.
		headDelegateSchoolId: headDelegate?.participant.school?.id ?? null,
		headDelegateSchoolName: headDelegate?.participant.school?.name ?? null,
		schools: distinctSchoolNames(delegation.members.map((member) => member.participant.school)),
		experience: delegation.experience,
		memberCount: delegation.members.length,
		headDelegateFullName: formatNames(
			headDelegate?.user?.givenName,
			headDelegate?.user?.familyName
		),
		applied: delegation.applied,
		conferenceTitle: delegation.conference?.title ?? ''
	};
}
