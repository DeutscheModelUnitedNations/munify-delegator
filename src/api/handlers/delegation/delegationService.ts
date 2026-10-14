import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import { fetchUserParticipations } from '$api/services/registration/participation';
import { assertApplicationReady } from '$api/services/registration/applicationReadiness';
import { tidyRoleApplications } from '$api/services/registration/tidyRoleApplications';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import formatNames from '$lib/helpers/formatNames';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { apiError } from '$api/services/apiError';

/** Hands the head delegate role from the current holder to another member of the delegation. */
async function transferHeadDelegate(
	members: { id: string; userId: string; isHeadDelegate: boolean }[],
	newHeadDelegateUserId: string
) {
	const current = members.find((member) => member.isHeadDelegate);
	if (!current) {
		throw apiError('NOT_FOUND', m.delegationNoHeadDelegate());
	}
	const next = members.find((member) => member.userId === newHeadDelegateUserId);
	if (!next) {
		throw apiError('NOT_FOUND', m.delegationNoNewHeadDelegate());
	}

	// Order is safe here only because the caller checks `updatable` once, up front, and
	// these writes go by raw id rather than re-deriving an ability filter per statement.
	// The legacy Prisma/CASL port of this mutation re-evaluated the caller's `update`
	// ability on every statement inside the transaction, so demoting the acting head
	// delegate first revoked their own permission before the promotion ran. Don't
	// reintroduce a per-statement ability re-check here without also promoting first.
	await db.transaction(async (tx) => {
		await tx
			.update(schema.delegationMember)
			.set({ isHeadDelegate: false })
			.where(eq(schema.delegationMember.id, current.id));
		await tx
			.update(schema.delegationMember)
			.set({ isHeadDelegate: true })
			.where(eq(schema.delegationMember.id, next.id));
	});
}

/** Creates a delegation with the caller as its head delegate. Returns the delegation's id. */
export async function createDelegationWithHead(
	userId: string,
	args: {
		conferenceId: string;
		school?: string | null;
		motivation?: string | null;
		experience?: string | null;
	}
) {
	applicationFormSchema.parse({
		school: args.school,
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
				school: args.school ?? undefined,
				motivation: args.motivation ?? undefined,
				experience: args.experience ?? undefined,
				entryCode: makeEntryCode()
			})
			.returning()
			.then(assertFirstEntryExists);

		// The creator becomes the head delegate.
		await tx.insert(schema.delegationMember).values({
			conferenceId: delegation.conferenceId,
			delegationId: delegation.id,
			userId,
			isHeadDelegate: true
		});

		return delegation;
	});

	return created.id;
}

/** Applies the changes of `updateDelegation`; the caller publishes afterwards. */
// fallow-ignore-next-line complexity
export async function updateDelegationDetails(
	ctx: ApiContext,
	args: {
		id: string;
		applied?: boolean | null;
		resetEntryCode?: boolean | null;
		newHeadDelegateUserId?: string | null;
		school?: string | null;
		experience?: string | null;
		motivation?: string | null;
	}
) {
	const updatable = (await ctx.abilities.delegation.filter('update')).merge({
		where: { id: args.id }
	});

	const delegation = await db.query.delegation
		.findFirst({
			...updatable.query.single,
			with: { members: true, conference: true, appliedForRoles: true }
		})
		.then(assertFindFirstExists);

	if (args.applied !== undefined && args.applied !== null) {
		// Drop applications the delegation has outgrown before judging whether it may apply.
		await tidyRoleApplications(delegation.id);

		if (args.applied) {
			if (delegation.members.length < 2) {
				throw apiError('CONFLICT', m.notEnoughMembers());
			}
			assertApplicationReady(delegation, args, 3);
		}

		await db.update(schema.delegation).set({ applied: args.applied }).where(updatable.sql.where);
	}

	if (args.school || args.experience || args.motivation) {
		await db
			.update(schema.delegation)
			.set({
				school: args.school,
				experience: args.experience,
				motivation: args.motivation
			})
			.where(updatable.sql.where);
	}

	if (args.resetEntryCode) {
		await db
			.update(schema.delegation)
			.set({ entryCode: makeEntryCode() })
			.where(updatable.sql.where);
	}

	if (args.newHeadDelegateUserId) {
		await transferHeadDelegate(delegation.members, args.newHeadDelegateUserId);
	}
}

/** What somebody sees after entering a delegation's join code, before committing to join. */
export async function previewDelegationByEntryCode(conferenceId: string, entryCode: string) {
	const delegation = await db.query.delegation
		.findFirst({
			where: { conferenceId, entryCode },
			with: {
				conference: { columns: { title: true } },
				members: { with: { user: { columns: { givenName: true, familyName: true } } } }
			}
		})
		.then(assertFindFirstExists);

	const headDelegate = delegation.members.find((member) => member.isHeadDelegate);

	return {
		id: delegation.id,
		conferenceId: delegation.conferenceId,
		entryCode: delegation.entryCode,
		motivation: delegation.motivation,
		school: delegation.school,
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
